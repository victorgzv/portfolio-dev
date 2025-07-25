// Auth Types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

// Payment Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
  revenueCatOffering?: string;
}

export interface PaymentState {
  isLoading: boolean;
  activeSubscription: SubscriptionPlan | null;
  availablePlans: SubscriptionPlan[];
}

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  overlay: string;
  card: string;
  notification: string;
}

export interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  systemTheme: 'light' | 'dark' | null;
}

// Navigation Types
export interface RootStackParamList {
  '(tabs)': undefined;
  auth: undefined;
  payment: undefined;
  profile: undefined;
  modal: { title: string; content: string };
}

export interface TabParamList {
  index: undefined;
  explore: undefined;
  profile: undefined;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

// Component Props Types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  disabled?: boolean;
  className?: string;
}

// RevenueCat Types
export interface RevenueCatOffering {
  identifier: string;
  serverDescription: string;
  availablePackages: RevenueCatPackage[];
}

export interface RevenueCatPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
    subscriptionPeriod?: string;
  };
  offeringIdentifier: string;
}

// Store Types
export interface AppState {
  auth: AuthState;
  payment: PaymentState;
  theme: ThemeState;
  notifications: {
    enabled: boolean;
    pushToken?: string;
  };
}