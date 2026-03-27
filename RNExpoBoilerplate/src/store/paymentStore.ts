import { create } from 'zustand';
import { PaymentState, SubscriptionPlan } from '../types';
import { 
  getOfferings, 
  purchasePackage, 
  restorePurchases, 
  getCustomerInfo,
  hasActiveSubscription,
  getActiveSubscription 
} from '../lib/revenuecat';
import { PurchasesPackage } from 'react-native-purchases';

interface PaymentStore extends PaymentState {
  // Actions
  loadOfferings: () => Promise<void>;
  purchaseSubscription: (pkg: PurchasesPackage) => Promise<void>;
  restoreSubscriptions: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

// Default subscription plans (these would typically come from your backend or RevenueCat)
const defaultPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    description: 'Perfect for getting started',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Basic features',
      'Email support',
      '5 GB storage',
      'Mobile app access'
    ],
    revenueCatOffering: 'basic_monthly',
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    description: 'For power users',
    price: 19.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'All basic features',
      'Priority support',
      '50 GB storage',
      'Desktop app access',
      'Advanced analytics',
      'Team collaboration'
    ],
    revenueCatOffering: 'pro_monthly',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    description: 'For large organizations',
    price: 99.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'All pro features',
      'Dedicated support',
      'Unlimited storage',
      'Custom integrations',
      'Advanced security',
      'SLA guarantee'
    ],
    revenueCatOffering: 'enterprise_monthly',
  },
];

export const usePaymentStore = create<PaymentStore>((set, get) => ({
  isLoading: false,
  activeSubscription: null,
  availablePlans: defaultPlans,

  loadOfferings: async () => {
    try {
      set({ isLoading: true });
      
      const offerings = await getOfferings();
      
      // Map RevenueCat offerings to our subscription plans
      const updatedPlans = defaultPlans.map(plan => {
        const offering = offerings.find(o => 
          o.identifier === plan.revenueCatOffering
        );
        
        if (offering && offering.availablePackages.length > 0) {
          const pkg = offering.availablePackages[0];
          return {
            ...plan,
            price: pkg.product.price,
            currency: pkg.product.currencyCode,
          };
        }
        
        return plan;
      });
      
      set({ availablePlans: updatedPlans });
    } catch (error) {
      console.error('Error loading offerings:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  purchaseSubscription: async (pkg: PurchasesPackage) => {
    try {
      set({ isLoading: true });
      
      const customerInfo = await purchasePackage(pkg);
      
      if (hasActiveSubscription(customerInfo)) {
        const subscription = getActiveSubscription(customerInfo);
        
        // Find the corresponding plan
        const plan = get().availablePlans.find(p => 
          p.revenueCatOffering === subscription?.id
        );
        
        if (plan) {
          set({ activeSubscription: plan });
        }
      }
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  restoreSubscriptions: async () => {
    try {
      set({ isLoading: true });
      
      const customerInfo = await restorePurchases();
      
      if (hasActiveSubscription(customerInfo)) {
        const subscription = getActiveSubscription(customerInfo);
        
        // Find the corresponding plan
        const plan = get().availablePlans.find(p => 
          p.revenueCatOffering === subscription?.id
        );
        
        if (plan) {
          set({ activeSubscription: plan });
        }
      } else {
        set({ activeSubscription: null });
      }
    } catch (error) {
      console.error('Error restoring subscriptions:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  checkSubscriptionStatus: async () => {
    try {
      set({ isLoading: true });
      
      const customerInfo = await getCustomerInfo();
      
      if (hasActiveSubscription(customerInfo)) {
        const subscription = getActiveSubscription(customerInfo);
        
        // Find the corresponding plan
        const plan = get().availablePlans.find(p => 
          p.revenueCatOffering === subscription?.id
        );
        
        if (plan) {
          set({ activeSubscription: plan });
        }
      } else {
        set({ activeSubscription: null });
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelSubscription: async () => {
    try {
      set({ isLoading: true });
      
      // Note: RevenueCat doesn't directly cancel subscriptions
      // Users need to cancel through the App Store or Google Play
      // This is just to update the local state
      
      // You might want to call your backend API to handle cancellation
      // or redirect users to the appropriate store cancellation page
      
      console.log('Subscription cancellation initiated');
      
      // For now, just clear the active subscription
      // In a real app, you'd want to check the actual status
      set({ activeSubscription: null });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));