const STORAGE_KEY = 'lynxo.currency_code';
let runtimeCurrencyCode: string | null = null;

function normalizeCurrencyCode(input?: string | null): string | null {
  const candidate = (input ?? '').trim().toUpperCase();
  return candidate || null;
}

function readStoredCurrencyCode(): string | null {
  if (typeof window === 'undefined') return null;
  return normalizeCurrencyCode(window.localStorage.getItem(STORAGE_KEY));
}

export function setCurrencyCode(code?: string | null): void {
  const normalized = normalizeCurrencyCode(code);
  if (!normalized) return;
  runtimeCurrencyCode = normalized;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  }
}

export function getCurrencyCode(): string | null {
  return runtimeCurrencyCode ?? readStoredCurrencyCode();
}

export function formatMoney(amount: number, currencyCode?: string | null): string {
  const currency = normalizeCurrencyCode(currencyCode) ?? getCurrencyCode();
  const normalized = Number.isFinite(amount) ? amount : 0;

  if (!currency) {
    return normalized.toFixed(2);
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(normalized);
  } catch {
    return `${normalized.toFixed(2)} ${currency}`;
  }
}
