import { prisma } from "@/lib/prisma";
import {
  CONSTITUTION_VERSION,
  getConstitutionPayload,
  type LoadedConstitution,
} from "@/core/constitution/laws";

export async function ensureConstitutionLoaded(): Promise<LoadedConstitution> {
  const payload = getConstitutionPayload();
  const row = await prisma.constitutionVersion.upsert({
    where: { version: CONSTITUTION_VERSION },
    create: {
      version: CONSTITUTION_VERSION,
      lawsJson: payload,
      locked: true,
      active: true,
      summary: "EXECUTIA Core AI constitution",
    },
    update: {
      active: true,
      locked: true,
    },
  });

  await prisma.constitutionVersion.updateMany({
    where: { version: { not: CONSTITUTION_VERSION } },
    data: { active: false },
  });

  if (!row.locked) {
    throw new Error("Constitution must be locked — fail closed.");
  }

  return {
    version: row.version,
    laws: payload.laws,
    locked: true,
    dbId: row.id,
  };
}

export async function requireConstitution(): Promise<LoadedConstitution> {
  const active = await prisma.constitutionVersion.findFirst({
    where: { active: true, locked: true },
  });
  if (!active) {
    return ensureConstitutionLoaded();
  }
  const payload = getConstitutionPayload();
  if (active.version !== CONSTITUTION_VERSION) {
    return ensureConstitutionLoaded();
  }
  return {
    version: active.version,
    laws: payload.laws,
    locked: true,
    dbId: active.id,
  };
}
