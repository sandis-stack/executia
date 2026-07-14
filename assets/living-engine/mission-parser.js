/**
 * Mission input validation — reasoning is performed by reasoning-engine.js.
 */

export const ENGINE_DISCLOSURE =
  'Execution Intelligence reasoning — conclusions cite declared facts only.';

/**
 * @param {string} rawText
 */
export function parseMission(rawText) {
  const text = String(rawText ?? '').trim();
  if (text.length < 8) {
    return {
      ok: false,
      error: 'MISSION_TOO_SHORT',
      message: 'Enter a business objective (at least 8 characters).',
    };
  }

  return {
    ok: true,
    mission: {
      statement: text,
      headline: text.split(/[.!?]/)[0]?.trim() || text,
    },
  };
}
