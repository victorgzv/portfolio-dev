import { initStripe, StripeProvider } from '@stripe/stripe-react-native';

const stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  throw new Error('Missing Stripe publishable key');
}

// Initialize Stripe
export const initializeStripe = async () => {
  await initStripe({
    publishableKey: stripePublishableKey,
    merchantIdentifier: 'merchant.com.yourcompany.rnexpoboilerplate',
    urlScheme: 'rnexpoboilerplate',
  });
};

// Stripe configuration
export const stripeConfig = {
  publishableKey: stripePublishableKey,
  merchantIdentifier: 'merchant.com.yourcompany.rnexpoboilerplate',
  urlScheme: 'rnexpoboilerplate',
};

// Payment method types
export interface PaymentMethodData {
  type: 'card' | 'apple_pay' | 'google_pay';
  card?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };
}

// Payment intent result
export interface PaymentResult {
  success: boolean;
  paymentIntent?: any;
  error?: string;
}

// Helper function to create payment intent
export const createPaymentIntent = async (amount: number, currency: string = 'usd') => {
  try {
    // This would typically call your backend API
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100, // Convert to cents
        currency,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};