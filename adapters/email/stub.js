/** Email adapter stub — no Gmail coupling. */
export const adapterInfo = { capability: 'email', vendor: 'stub', mode: 'stub' };

export async function receiveEvents() {
  return { status: 'stubbed', events: [], detail: 'Email ingestion not configured' };
}
