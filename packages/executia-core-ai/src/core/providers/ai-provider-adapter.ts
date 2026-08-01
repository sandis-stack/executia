import {
  ProviderResponseSchema,
  type ExecutionSpec,
  type ProviderResponse,
} from "@/domain/schemas";
import { buildProviderSystemPrompt } from "@/core/engines/context-assembler";

export type ProviderCallResult =
  | {
      ok: true;
      provider: string;
      model: string;
      rawText: string;
      parsed: ProviderResponse;
      latencyMs: number;
      requestPayload: Record<string, unknown>;
    }
  | {
      ok: false;
      provider: string;
      model: string;
      rawText?: string;
      errorMessage: string;
      latencyMs: number;
      requestPayload: Record<string, unknown>;
    };

export interface AIProviderAdapter {
  readonly name: string;
  execute(
    spec: ExecutionSpec,
    options?: { correctionBrief?: string },
  ): Promise<ProviderCallResult>;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Provider response was not valid JSON.");
  }
}

export class OpenAICompatibleAdapter implements AIProviderAdapter {
  readonly name = "openai-compatible";

  constructor(
    private readonly config: {
      apiKey: string;
      baseUrl?: string;
      model?: string;
    },
  ) {}

  async execute(
    spec: ExecutionSpec,
    options?: { correctionBrief?: string },
  ): Promise<ProviderCallResult> {
    const model = this.config.model ?? process.env.AI_MODEL ?? "gpt-4o-mini";
    const baseUrl = (
      this.config.baseUrl ??
      process.env.AI_BASE_URL ??
      "https://api.openai.com/v1"
    ).replace(/\/$/, "");

    const system = buildProviderSystemPrompt(spec);
    const userContent = options?.correctionBrief
      ? `Correction required.\n${options.correctionBrief}\n\nOriginal request:\n${spec.userRequest}`
      : spec.userRequest;

    const requestPayload = {
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    };

    const started = Date.now();
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });
      const latencyMs = Date.now() - started;
      const bodyText = await res.text();
      if (!res.ok) {
        return {
          ok: false,
          provider: this.name,
          model,
          rawText: bodyText,
          errorMessage: `Provider HTTP ${res.status}`,
          latencyMs,
          requestPayload,
        };
      }
      const envelope = JSON.parse(bodyText) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawText = envelope.choices?.[0]?.message?.content ?? "";
      if (!rawText) {
        return {
          ok: false,
          provider: this.name,
          model,
          rawText: bodyText,
          errorMessage: "Provider returned empty content.",
          latencyMs,
          requestPayload,
        };
      }
      const parsed = ProviderResponseSchema.parse(extractJsonObject(rawText));
      return {
        ok: true,
        provider: this.name,
        model,
        rawText,
        parsed,
        latencyMs,
        requestPayload,
      };
    } catch (err) {
      return {
        ok: false,
        provider: this.name,
        model,
        errorMessage: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - started,
        requestPayload,
      };
    }
  }
}

export class FakeAIProviderAdapter implements AIProviderAdapter {
  readonly name = "fake";

  constructor(
    private readonly behavior: (
      spec: ExecutionSpec,
      options?: { correctionBrief?: string },
    ) => ProviderCallResult | Promise<ProviderCallResult>,
  ) {}

  execute(
    spec: ExecutionSpec,
    options?: { correctionBrief?: string },
  ): Promise<ProviderCallResult> {
    return Promise.resolve(this.behavior(spec, options));
  }
}

export function createConfiguredProvider(): AIProviderAdapter {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY or AI_API_KEY.");
  }
  return new OpenAICompatibleAdapter({
    apiKey,
    baseUrl: process.env.AI_BASE_URL,
    model: process.env.AI_MODEL,
  });
}
