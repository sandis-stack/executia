import {
  ProviderResponseSchema,
  type AIProviderAdapter,
  type ExecutionSpec,
  type ProviderCallResult,
  type ProviderResponse,
} from "@executia/core-ai";

type DevelopmentCellPayload = {
  mission?: string;
  currentGoal?: string;
  currentFocus?: string;
  completedTasks?: string[];
  remainingTasks?: string[];
  lessonsLearned?: string[];
  openDecisions?: string[];
  knownRisks?: string[];
  nextStep?: string;
};

/**
 * OpenAI Responses API adapter — transport only.
 * Invoked only through EXECUTIA Core AI Executor.
 * No validation, progress, Development Cell update, or retry.
 */
export class OpenAIResponsesProvider implements AIProviderAdapter {
  readonly name = "openai-responses";

  constructor(
    private readonly config: {
      apiKey: string;
      model?: string;
      baseUrl?: string;
      /** Optional correlation id for logging (not sent to OpenAI). */
      executionId?: string;
    },
  ) {}

  async execute(
    spec: ExecutionSpec,
    options?: { correctionBrief?: string },
  ): Promise<ProviderCallResult> {
    const model = this.config.model ?? "gpt-4o-mini";
    const baseUrl = (
      this.config.baseUrl ?? "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const executionId = this.config.executionId ?? "pending";

    const instructions = buildOpenAIInstructions(spec);
    // Responses API requires the word "json" in input when using text.format json_object.
    const userContent = ensureJsonModeInput(
      options?.correctionBrief
        ? `Correction required.\n${options.correctionBrief}\n\nValidated user request:\n${spec.userRequest}`
        : buildOpenAIUserInput(spec),
    );

    const requestPayload: Record<string, unknown> = {
      model,
      instructions,
      input: userContent,
      text: { format: { type: "json_object" } },
      temperature: 0.2,
    };

    const started = Date.now();
    try {
      const res = await fetch(`${baseUrl}/responses`, {
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
          requestPayload: sanitizeRequestPayload(requestPayload, executionId),
        };
      }

      const rawResponse = extractResponsesOutputText(bodyText);
      if (!rawResponse) {
        return {
          ok: false,
          provider: this.name,
          model,
          rawText: bodyText,
          errorMessage: "Provider returned empty content.",
          latencyMs,
          requestPayload: sanitizeRequestPayload(requestPayload, executionId),
        };
      }

      // Structural deserialize for Core transport contract only — not EXECUTIA validation.
      const parsed = ProviderResponseSchema.parse(extractJsonObject(rawResponse));
      return {
        ok: true,
        provider: this.name,
        model,
        rawText: rawResponse,
        parsed,
        latencyMs,
        requestPayload: sanitizeRequestPayload(requestPayload, executionId),
      };
    } catch (err) {
      return {
        ok: false,
        provider: this.name,
        model,
        errorMessage: err instanceof Error ? err.message : String(err),
        latencyMs: Date.now() - started,
        requestPayload: sanitizeRequestPayload(requestPayload, executionId),
      };
    }
  }
}

function sanitizeRequestPayload(
  payload: Record<string, unknown>,
  executionId: string,
): Record<string, unknown> {
  return {
    provider: "openai-responses",
    model: payload.model,
    executionId,
    inputPreview:
      typeof payload.input === "string"
        ? String(payload.input).slice(0, 200)
        : undefined,
  };
}

/** Explicit ProviderResponseSchema contract for the model (field names must match Core). */
export const PROVIDER_OUTPUT_CONTRACT = [
  "Return one JSON object only.",
  "Every required string field must be a non-empty string.",
  "Do not use null, empty string, placeholders (n/a, TBD, none), or omit required fields.",
  "nextPriorityAction must be one concrete, actionable next step (non-empty).",
  "response must be a non-empty verified answer to the user request.",
  "Required JSON shape (exact field names):",
  '{',
  '  "response": "non-empty verified response",',
  '  "completed": ["evidence-based completed item strings"],',
  '  "remaining": ["remaining work item strings"],',
  '  "nextPriorityAction": "one specific non-empty next action",',
  '  "milestoneEvidence": [{ "milestoneId": "optional", "milestoneTitle": "optional", "evidence": "non-empty evidence", "markComplete": false }],',
  '  "decisions": ["decision strings"]',
  '}',
  "Arrays may be empty only when truly none apply; string fields response and nextPriorityAction must never be empty.",
].join("\n");

export function buildOpenAIInstructions(spec: ExecutionSpec): string {
  const cell = (spec.context.developmentCell ?? {}) as DevelopmentCellPayload;
  return [
    "You are invoked only through EXECUTIA Core.",
    "Answer only the validated user request.",
    "Maintain the active mission and current focus.",
    "Do not invent completed work.",
    "Do not claim that the Development Cell was updated — EXECUTIA performs final validation and state update.",
    "Do not calculate official EXECUTIA progress percentages.",
    `Mission: ${spec.goalTitle}`,
    `Current goal / task: ${spec.currentTask}`,
    `Current focus: ${cell.currentFocus ?? spec.currentTask}`,
    `Mission description: ${spec.goalDescription}`,
    "Development Cell (read-only context):",
    `- mission: ${cell.mission ?? spec.goalTitle}`,
    `- currentGoal: ${cell.currentGoal ?? spec.currentTask}`,
    `- currentFocus: ${cell.currentFocus ?? spec.currentTask}`,
    `- completedTasks: ${(cell.completedTasks ?? []).join("; ") || "(none)"}`,
    `- remainingTasks: ${(cell.remainingTasks ?? []).join("; ") || "(none)"}`,
    `- nextStep: ${cell.nextStep ?? "(none)"}`,
    PROVIDER_OUTPUT_CONTRACT,
  ].join("\n");
}

export function buildOpenAIUserInput(spec: ExecutionSpec): string {
  const cell = (spec.context.developmentCell ?? {}) as DevelopmentCellPayload;
  return [
    `Mission: ${cell.mission ?? spec.goalTitle}`,
    `Current goal: ${cell.currentGoal ?? spec.currentTask}`,
    `Current focus: ${cell.currentFocus ?? spec.currentTask}`,
    `User request: ${spec.userRequest}`,
    PROVIDER_OUTPUT_CONTRACT,
  ].join("\n");
}

/** OpenAI Responses API: json_object format requires "json" in the input text. */
export function ensureJsonModeInput(input: string): string {
  if (/\bjson\b/i.test(input)) {
    return input;
  }
  return `${input}\nRespond with a single JSON object only.`;
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

/** Extract assistant text from OpenAI Responses API envelope. */
export function extractResponsesOutputText(bodyText: string): string {
  const envelope = JSON.parse(bodyText) as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof envelope.output_text === "string" && envelope.output_text.trim()) {
    return envelope.output_text;
  }

  const parts: string[] = [];
  for (const item of envelope.output ?? []) {
    for (const content of item.content ?? []) {
      if (
        (content.type === "output_text" || content.type === "text") &&
        typeof content.text === "string"
      ) {
        parts.push(content.text);
      }
    }
  }
  return parts.join("\n").trim();
}

export function createOpenAIResponsesProvider(config: {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}): AIProviderAdapter {
  return new OpenAIResponsesProvider(config);
}

export type { ProviderResponse, ProviderCallResult };
