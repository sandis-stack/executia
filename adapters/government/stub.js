/** Government adapter stub. */
export const adapterInfo = { capability: 'government', vendor: 'stub', mode: 'stub' };

export async function synchronizeFiling(payload) {
  return {
    status: 'stubbed',
    detail: 'Government adapter stub — no filing performed',
    payload,
    at: new Date().toISOString(),
  };
}
