/**
 * LIFE local persistence — execution objects only.
 * Not a source of Engine truth semantics; Engine modules own transitions.
 */

const KEY = 'executia.life.invoices.v1';

export function listInvoices() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveInvoice(invoice) {
  const all = listInvoices();
  const i = all.findIndex((x) => x.id === invoice.id);
  if (i >= 0) all[i] = invoice;
  else all.unshift(invoice);
  localStorage.setItem(KEY, JSON.stringify(all));
  return invoice;
}

export function getInvoice(id) {
  return listInvoices().find((x) => x.id === id) || null;
}

export function inboxBuckets(invoices) {
  const needsDecision = invoices.filter((i) => i.state === 'needs_decision');
  const executing = invoices.filter((i) =>
    ['received', 'evidence_captured', 'classifying', 'executing'].includes(i.state),
  );
  const complete = invoices.filter((i) => i.state === 'complete');
  return { needsDecision, executing, complete };
}
