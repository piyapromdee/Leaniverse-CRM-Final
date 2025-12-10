# Stripe Embedded Checkout Form Implementation

This codebase implements a complete Stripe payment integration using embedded checkout forms with Stripe Elements. Here's how it works:

## Architecture Overview

The implementation follows a 3-layer approach:
1. **API Layer**: Backend payment intent creation
2. **UI Layer**: Frontend checkout form with Stripe Elements  
3. **Security Layer**: Content Security Policy configuration

## 1. Payment Intent Creation API

**File**: `src/app/api/checkout/create-session/route.ts`

```typescript
// Key components:
- Stripe server-side client initialization
- Product/price validation from database
- Payment intent creation with metadata
- Thai Baht (THB) + PromptPay support
- Return client secret for frontend
```

**Flow**:
1. Receives `productId` and optional `priceId`
2. Validates product exists and is active
3. Creates Stripe PaymentIntent with product metadata
4. Returns `clientSecret` + product/price data

## 2. Checkout Page Component

**File**: `src/app/products/[id]/checkout/page.tsx`

```typescript
// Key features:
- Async Stripe.js loading with @stripe/stripe-js
- Elements provider setup with client secret
- Error handling for Stripe loading failures
- Loading states and error boundaries
```

**Stripe Loading Pattern**:
```typescript
const initStripe = async () => {
  const { loadStripe } = await import('@stripe/stripe-js')
  const stripeInstance = await loadStripe(publishableKey)
  setStripe(stripeInstance)
}
```

## 3. Checkout Form Component

**File**: `src/components/checkout-form.tsx`

```typescript
// Core Stripe Elements implementation:
- PaymentElement for card/payment method input
- useStripe() and useElements() hooks
- Payment confirmation with redirect handling
- Success state management
```

**Payment Flow**:
```typescript
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: `${window.location.origin}/checkout/success?product=${product.id}`,
  },
  redirect: 'if_required'
})
```

## 4. Content Security Policy (CSP)

**File**: `src/lib/supabase/middleware.ts`

**Critical for Stripe Elements**:
```javascript
const stripeCSP = [
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://m.stripe.network",
  "frame-src 'self' https://js.stripe.com https://*.stripe.com https://hooks.stripe.com",
  "connect-src 'self' https://api.stripe.com https://*.stripe.com https://m.stripe.network",
  // ... other directives
]
```

## 5. Dependencies Required

```json
{
  "@stripe/stripe-js": "^7.3.1",
  "@stripe/react-stripe-js": "^3.7.0",
  "stripe": "^latest" // server-side
}
```

## 6. Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_...           # Server-side
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Client-side
```

## Key Implementation Details

### Currency Support
- Automatic payment method detection (card + PromptPay for THB)
- Stripe amount conversion (cents for most currencies)
- Validation for minimum amounts per currency

### Error Handling
- Stripe loading timeouts
- Payment intent creation failures  
- CSP violations
- Network connectivity issues

### Security Considerations
- Server-side product validation
- CSP headers for Stripe domains
- Client secret expiration handling
- Metadata for payment tracking

## Reusable Patterns

1. **Async Stripe Loading**: Always use dynamic imports to avoid SSR issues
2. **CSP Configuration**: Essential for embedded forms - include all Stripe domains
3. **Error Boundaries**: Wrap Stripe components with comprehensive error handling
4. **State Management**: Track loading, error, and success states separately
5. **Payment Methods**: Configure based on currency for regional optimization

This implementation provides a production-ready embedded checkout experience with proper error handling, security, and international currency support.