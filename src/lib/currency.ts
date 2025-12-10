// Currency configurations for the application
export interface CurrencyInfo {
  code: string
  symbol: string
  name: string
  locale: string
  // Stripe minimum amount in the currency's smallest unit
  minimumAmount: number
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  usd: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    minimumAmount: 50, // $0.50 minimum
  },
  eur: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'en-EU',
    minimumAmount: 50, // €0.50 minimum
  },
  gbp: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    minimumAmount: 30, // £0.30 minimum
  },
  thb: {
    code: 'THB',
    symbol: '฿',
    name: 'Thai Baht',
    locale: 'en-US', // Use en-US for better THB support
    minimumAmount: 2000, // ฿20.00 minimum (2000 satang)
  }
}

export function getCurrencyInfo(currencyCode: string): CurrencyInfo {
  if (!currencyCode || typeof currencyCode !== 'string') {
    return SUPPORTED_CURRENCIES.usd
  }
  
  const code = currencyCode.toLowerCase()
  return SUPPORTED_CURRENCIES[code] || SUPPORTED_CURRENCIES.usd
}

export function formatCurrency(amount: number, currencyCode: string): string {
  // Handle null/undefined currency codes
  if (!currencyCode || typeof currencyCode !== 'string') {
    return `${(amount / 100).toFixed(2)}`
  }
  
  const currency = getCurrencyInfo(currencyCode)
  
  // All amounts from Stripe are in smallest currency unit
  // For THB: 1 baht = 100 satang (like cents), so we need to divide by 100
  const actualAmount = amount / 100
  
  // Special handling for THB to ensure proper symbol display
  if (currencyCode.toLowerCase() === 'thb') {
    return `฿${actualAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code
  }).format(actualAmount)
}

export function convertToStripeAmount(amount: number, currencyCode: string): number {
  // For THB, Stripe expects the amount in the base unit (satang), not divided by 100
  // But since THB doesn't commonly use subdivisions, we treat it as base units
  const currency = currencyCode.toLowerCase()
  
  if (currency === 'thb') {
    // THB amount is already in the correct unit for Stripe
    return Math.round(amount * 100) // Convert from baht to satang (smallest unit)
  }
  
  // For other currencies, convert to smallest unit (cents)
  return Math.round(amount * 100)
}

export function validateCurrencyAmount(amount: number, currencyCode: string): { valid: boolean; error?: string } {
  const currency = getCurrencyInfo(currencyCode)
  const stripeAmount = convertToStripeAmount(amount, currencyCode)
  
  if (stripeAmount < currency.minimumAmount) {
    // The minimum amount is already in smallest currency unit, so format it directly
    return {
      valid: false,
      error: `Minimum amount for ${currency.code} is ${formatCurrency(currency.minimumAmount, currencyCode)}`
    }
  }
  
  return { valid: true }
}