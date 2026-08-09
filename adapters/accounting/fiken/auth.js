/**
 * Fiken authentication — credentials from environment / secure local config only.
 * Never fabricate a successful auth when credentials are missing.
 */

export function loadFikenConfig(overrides = {}) {
  const env = typeof process !== 'undefined' && process.env ? process.env : {};
  const fromGlobal =
    typeof globalThis !== 'undefined' && globalThis.__FIKEN_CONFIG__
      ? globalThis.__FIKEN_CONFIG__
      : {};
  let fromStorage = {};
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.getItem) {
      fromStorage = JSON.parse(localStorage.getItem('executia.fiken.config.v1') || '{}');
    }
  } catch {
    /* ignore */
  }

  const token =
    overrides.token ||
    env.FIKEN_API_TOKEN ||
    env.FIKEN_ACCESS_TOKEN ||
    fromGlobal.token ||
    fromStorage.token ||
    '';
  const companySlug =
    overrides.companySlug ||
    env.FIKEN_COMPANY_SLUG ||
    fromGlobal.companySlug ||
    fromStorage.companySlug ||
    '';
  const baseUrl = (
    overrides.baseUrl ||
    env.FIKEN_BASE_URL ||
    fromGlobal.baseUrl ||
    fromStorage.baseUrl ||
    'https://api.fiken.no/api/v2'
  ).replace(/\/$/, '');
  const expenseAccount =
    overrides.expenseAccount ||
    env.FIKEN_EXPENSE_ACCOUNT ||
    fromGlobal.expenseAccount ||
    fromStorage.expenseAccount ||
    '6800';

  return {
    token: String(token || '').trim(),
    companySlug: String(companySlug || '').trim(),
    baseUrl,
    expenseAccount: String(expenseAccount || '6800').trim(),
  };
}

export function credentialsPresent(config = loadFikenConfig()) {
  return Boolean(config.token && config.companySlug);
}

/**
 * Probe Fiken auth without writing accounting records.
 */
export async function probeFikenAuth(config = loadFikenConfig(), fetchImpl = globalThis.fetch) {
  if (!credentialsPresent(config)) {
    return {
      status: 'blocked',
      authenticated: false,
      detail:
        'Fiken credentials missing. Set FIKEN_API_TOKEN and FIKEN_COMPANY_SLUG (env or secure local config). Live sync will not be faked.',
      config: {
        hasToken: Boolean(config.token),
        hasCompanySlug: Boolean(config.companySlug),
        baseUrl: config.baseUrl,
      },
    };
  }

  if (typeof fetchImpl !== 'function') {
    return {
      status: 'failed',
      authenticated: false,
      detail: 'fetch is unavailable in this runtime',
    };
  }

  try {
    const res = await fetchImpl(`${config.baseUrl}/companies/${encodeURIComponent(config.companySlug)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
      },
    });
    if (res.status === 401 || res.status === 403) {
      return {
        status: 'blocked',
        authenticated: false,
        detail: `Fiken authentication rejected (${res.status}). Check API token and company access.`,
        httpStatus: res.status,
      };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        status: 'failed',
        authenticated: false,
        detail: `Fiken company probe failed (${res.status}): ${body.slice(0, 240)}`,
        httpStatus: res.status,
      };
    }
    const company = await res.json().catch(() => ({}));
    return {
      status: 'ok',
      authenticated: true,
      detail: `Authenticated to Fiken company ${config.companySlug}`,
      company: {
        name: company.name || company.organizationName || null,
        slug: config.companySlug,
        organizationNumber: company.organizationNumber || null,
      },
    };
  } catch (err) {
    return {
      status: 'failed',
      authenticated: false,
      detail: `Fiken unreachable: ${String(err?.message || err)}`,
    };
  }
}
