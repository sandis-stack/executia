/** Calendar adapter stub. */
export const adapterInfo = { capability: 'calendar', vendor: 'stub', mode: 'stub' };

export async function synchronizeDeadline(payload) {
  return { status: 'stubbed', detail: 'Calendar adapter stub', payload, at: new Date().toISOString() };
}
