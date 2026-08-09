/** Banking adapter stub. */
export const adapterInfo = { capability: 'banking', vendor: 'stub', mode: 'stub' };

export async function synchronizePayment(payload) {
  return { status: 'stubbed', detail: 'Banking adapter stub', payload, at: new Date().toISOString() };
}
