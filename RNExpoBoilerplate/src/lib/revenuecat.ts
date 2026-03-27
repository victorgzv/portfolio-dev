import Purchases, { 
  PurchasesOffering, 
  PurchasesPackage, 
  CustomerInfo,
  PurchasesError,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const revenueCatApiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

if (!revenueCatApiKey) {
  throw new Error('Missing RevenueCat API key');
}

// Initialize RevenueCat
export const initializeRevenueCat = async (userId?: string) => {
  try {
    await Purchases.configure({
      apiKey: revenueCatApiKey,
      appUserID: userId,
    });
    
    // Enable debug logs (disable in production)
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    
    console.log('RevenueCat initialized successfully');
  } catch (error) {
    console.error('Error initializing RevenueCat:', error);
    throw error;
  }
};

// Get available offerings
export const getOfferings = async (): Promise<PurchasesOffering[]> => {
  try {
    const offerings = await Purchases.getOfferings();
    return Object.values(offerings.all);
  } catch (error) {
    console.error('Error fetching offerings:', error);
    throw error;
  }
};

// Purchase a package
export const purchasePackage = async (pkg: PurchasesPackage): Promise<CustomerInfo> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error) {
    console.error('Error purchasing package:', error);
    if (error instanceof PurchasesError) {
      // Handle specific RevenueCat errors
      switch (error.code) {
        case Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED:
          throw new Error('Purchase was cancelled');
        case Purchases.PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED:
          throw new Error('Purchase not allowed');
        case Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING:
          throw new Error('Payment is pending');
        default:
          throw new Error(error.message || 'Purchase failed');
      }
    }
    throw error;
  }
};

// Restore purchases
export const restorePurchases = async (): Promise<CustomerInfo> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Error restoring purchases:', error);
    throw error;
  }
};

// Get customer info
export const getCustomerInfo = async (): Promise<CustomerInfo> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Error fetching customer info:', error);
    throw error;
  }
};

// Check if user has active subscription
export const hasActiveSubscription = (customerInfo: CustomerInfo): boolean => {
  return Object.keys(customerInfo.activeSubscriptions).length > 0;
};

// Get active subscription info
export const getActiveSubscription = (customerInfo: CustomerInfo) => {
  const activeSubscriptions = customerInfo.activeSubscriptions;
  if (Object.keys(activeSubscriptions).length === 0) {
    return null;
  }
  
  const subscriptionId = Object.keys(activeSubscriptions)[0];
  return {
    id: subscriptionId,
    ...activeSubscriptions[subscriptionId],
  };
};

// Identify user (call after login)
export const identifyUser = async (userId: string) => {
  try {
    await Purchases.logIn(userId);
    console.log('User identified with RevenueCat:', userId);
  } catch (error) {
    console.error('Error identifying user with RevenueCat:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await Purchases.logOut();
    console.log('User logged out from RevenueCat');
  } catch (error) {
    console.error('Error logging out user from RevenueCat:', error);
    throw error;
  }
};