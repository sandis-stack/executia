/**
 * TASK-47 — visitor currency for the homepage calculator.
 * FX table is fixed for demonstration defaults (approximate). Base = USD.
 */

export const FX_AS_OF = '2026-11-01';

/** @type {Record<string, { code: string, label: string, locale: string, usdPerUnit: number, hourlyDefault: number, delayWeekDefault: number }>} */
export const CURRENCIES = {
  NOK: {
    code: 'NOK',
    label: 'NOK',
    locale: 'nb-NO',
    usdPerUnit: 0.091,
    hourlyDefault: 550,
    delayWeekDefault: 10_000,
  },
  SEK: {
    code: 'SEK',
    label: 'SEK',
    locale: 'sv-SE',
    usdPerUnit: 0.095,
    hourlyDefault: 550,
    delayWeekDefault: 10_000,
  },
  DKK: {
    code: 'DKK',
    label: 'DKK',
    locale: 'da-DK',
    usdPerUnit: 0.145,
    hourlyDefault: 400,
    delayWeekDefault: 7_500,
  },
  EUR: {
    code: 'EUR',
    label: 'EUR',
    locale: 'de-DE',
    usdPerUnit: 1.08,
    hourlyDefault: 50,
    delayWeekDefault: 1_000,
  },
  GBP: {
    code: 'GBP',
    label: 'GBP',
    locale: 'en-GB',
    usdPerUnit: 1.27,
    hourlyDefault: 40,
    delayWeekDefault: 850,
  },
  USD: {
    code: 'USD',
    label: 'USD',
    locale: 'en-US',
    usdPerUnit: 1,
    hourlyDefault: 55,
    delayWeekDefault: 1_100,
  },
  AED: {
    code: 'AED',
    label: 'AED',
    locale: 'en-AE',
    usdPerUnit: 0.272,
    hourlyDefault: 180,
    delayWeekDefault: 4_000,
  },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES);

const EUROZONE = new Set([
  'AT',
  'BE',
  'HR',
  'CY',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PT',
  'SK',
  'SI',
  'ES',
]);

const COUNTRY_TO_CURRENCY = {
  NO: 'NOK',
  SE: 'SEK',
  DK: 'DKK',
  GB: 'GBP',
  UK: 'GBP',
  AE: 'AED',
  US: 'USD',
};

const TZ_HINTS = [
  { re: /Oslo|Europe\/Oslo/i, code: 'NOK' },
  { re: /Stockholm|Europe\/Stockholm/i, code: 'SEK' },
  { re: /Copenhagen|Europe\/Copenhagen/i, code: 'DKK' },
  { re: /London|Europe\/London/i, code: 'GBP' },
  { re: /Dubai|Asia\/Dubai/i, code: 'AED' },
  { re: /Berlin|Paris|Madrid|Rome|Amsterdam|Brussels|Vienna|Helsinki|Riga|Vilnius|Tallinn|Dublin|Lisbon|Athens|Europe\//i, code: 'EUR' },
];

const LANG_HINTS = [
  { re: /^nb|^nn|^no/i, code: 'NOK' },
  { re: /^sv/i, code: 'SEK' },
  { re: /^da/i, code: 'DKK' },
  { re: /^en-GB/i, code: 'GBP' },
  { re: /^ar-AE|^en-AE/i, code: 'AED' },
  { re: /^(de|fr|es|it|nl|pt|fi|el|et|lv|lt|sk|sl|hr|mt)/i, code: 'EUR' },
];

export function currencyFromCountry(countryCode) {
  if (!countryCode) return null;
  const cc = String(countryCode).toUpperCase();
  if (COUNTRY_TO_CURRENCY[cc]) return COUNTRY_TO_CURRENCY[cc];
  if (EUROZONE.has(cc)) return 'EUR';
  return null;
}

export function detectCurrencyClient() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    for (const hint of TZ_HINTS) {
      if (hint.re.test(tz)) return hint.code;
    }
  } catch {
    /* ignore */
  }
  try {
    const lang = typeof navigator !== 'undefined' ? navigator.language || '' : '';
    for (const hint of LANG_HINTS) {
      if (hint.re.test(lang)) return hint.code;
    }
  } catch {
    /* ignore */
  }
  return 'USD';
}

/**
 * Prefer server geo (meta / data attribute), then client hints, then USD.
 * @param {{ country?: string|null, stored?: string|null }} opts
 */
export function resolveCurrency(opts = {}) {
  const stored = opts.stored && CURRENCIES[opts.stored] ? opts.stored : null;
  if (stored) return stored;
  const fromCountry = currencyFromCountry(opts.country);
  if (fromCountry) return fromCountry;
  return detectCurrencyClient();
}

export function toUsd(amount, currencyCode) {
  const c = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return Number(amount) * c.usdPerUnit;
}

export function fromUsd(amountUsd, currencyCode) {
  const c = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return Number(amountUsd) / c.usdPerUnit;
}

export function formatMoney(amount, currencyCode = 'USD') {
  const c = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const n = Math.round(Number(amount) || 0);
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: c.code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${c.code} ${n.toLocaleString('en-US')}`;
  }
}

export const SESSION_CURRENCY_KEY = 'executia.calculator.currency.v1';

export function loadSessionCurrency() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(SESSION_CURRENCY_KEY);
    return v && CURRENCIES[v] ? v : null;
  } catch {
    return null;
  }
}

export function saveSessionCurrency(code) {
  if (typeof sessionStorage === 'undefined') return;
  if (!CURRENCIES[code]) return;
  try {
    sessionStorage.setItem(SESSION_CURRENCY_KEY, code);
  } catch {
    /* ignore */
  }
}
