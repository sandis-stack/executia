/**
 * Minimal Fiken API v2 HTTP client.
 * No business decisions — transport only.
 */

export class FikenHttpError extends Error {
  constructor(message, { status, body, path } = {}) {
    super(message);
    this.name = 'FikenHttpError';
    this.status = status;
    this.body = body;
    this.path = path;
  }
}

export function createFikenClient(config, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('FIKEN_FETCH_UNAVAILABLE');
  }

  const base = config.baseUrl.replace(/\/$/, '');
  const companyBase = `${base}/companies/${encodeURIComponent(config.companySlug)}`;

  async function request(method, path, { body, headers } = {}) {
    const url = path.startsWith('http') ? path : `${companyBase}${path}`;
    const res = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(headers || {}),
      },
      body: body instanceof FormData ? body : body != null ? JSON.stringify(body) : undefined,
    });

    const text = await res.text().catch(() => '');
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      throw new FikenHttpError(`Fiken ${method} ${path} → ${res.status}`, {
        status: res.status,
        body: parsed,
        path,
      });
    }

    const location = res.headers?.get?.('Location') || res.headers?.get?.('location') || null;
    return { status: res.status, data: parsed, location };
  }

  return {
    config,
    getCompany: () => request('GET', `${base}/companies/${encodeURIComponent(config.companySlug)}`),
    listContacts: (query = {}) => {
      const qs = new URLSearchParams();
      if (query.name) qs.set('name', query.name);
      if (query.supplier != null) qs.set('supplier', String(query.supplier));
      const q = qs.toString();
      return request('GET', `/contacts${q ? `?${q}` : ''}`);
    },
    createContact: (payload) => request('POST', '/contacts', { body: payload }),
    createPurchase: (payload) => request('POST', '/purchases', { body: payload }),
    getPurchase: (purchaseId) => request('GET', `/purchases/${encodeURIComponent(purchaseId)}`),
    updatePurchase: (purchaseId, payload) =>
      request('PUT', `/purchases/${encodeURIComponent(purchaseId)}`, { body: payload }),
    addPurchaseAttachment: async (purchaseId, { filename, mimeType, bytes }) => {
      const form = new FormData();
      const blob =
        typeof Blob !== 'undefined'
          ? new Blob([bytes], { type: mimeType || 'application/octet-stream' })
          : bytes;
      form.append('file', blob, filename || 'evidence.pdf');
      form.append('attachToSale', 'true');
      form.append('attachToPayment', 'false');
      return request('POST', `/purchases/${encodeURIComponent(purchaseId)}/attachments`, {
        body: form,
      });
    },
    idFromLocation(location) {
      if (!location) return null;
      const parts = String(location).split('/').filter(Boolean);
      return parts[parts.length - 1] || null;
    },
  };
}
