# React Native Expo Boilerplate

A comprehensive, production-ready React Native boilerplate built with Expo, featuring authentication, payments, database integration, and modern development tools.

## 🚀 Features

### 🔐 Authentication
- **Email/Password Authentication** with Supabase
- **Social Login** support (Google, Apple, Facebook)
- **Secure token storage** with Expo SecureStore
- **Password reset** functionality
- **Profile management**

### 💳 Payments & Subscriptions
- **Stripe integration** for one-time payments
- **RevenueCat integration** for subscription management
- **Multiple subscription plans** with feature comparison
- **Restore purchases** functionality
- **Cross-platform payment support** (iOS, Android)

### 🗄️ Database & Backend
- **Supabase PostgreSQL** database
- **Real-time subscriptions**
- **Row Level Security (RLS)**
- **Auto-generated TypeScript types**
- **File storage** capabilities

### 🎨 UI/UX
- **Modern, responsive design**
- **TailwindCSS** with NativeWind
- **🌙 Dark/Light theme** support with system detection
- **Theme persistence** across app sessions
- **Animated theme transitions**
- **Reusable component library**
- **Smooth animations** with Reanimated

### 📱 Cross-Platform
- **iOS, Android, and Web** support
- **Native navigation** with React Navigation
- **Platform-specific optimizations**
- **Responsive layouts**

### 🔧 Developer Experience
- **TypeScript** for type safety
- **ESLint & Prettier** for code quality
- **Expo Dev Tools** integration
- **Hot reloading** for fast development
- **Component-based architecture**

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator / Android Emulator (for testing)

## 🛠️ Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd RNExpoBoilerplate
npm install
```

### 2. Environment Setup

Copy the environment example file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-api-key

# OAuth Configuration (optional)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_APPLE_CLIENT_ID=your-apple-client-id
EXPO_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id
```

### 3. Start Development

```bash
npm start
```

Choose your platform:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Press `w` for Web
- Scan QR code with Expo Go app on your device

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your URL and anon key
3. Create the following tables:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
```

### Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your publishable key from the dashboard
3. Set up your products and prices in the Stripe dashboard
4. Configure webhooks for subscription events (optional)

### RevenueCat Setup

1. Create a RevenueCat account at [revenuecat.com](https://revenuecat.com)
2. Create a new app and get your API key
3. Configure your products in RevenueCat
4. Set up offerings and packages
5. Connect your Stripe account to RevenueCat

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── payment/         # Payment components
│   └── ui/              # Basic UI components
│       ├── ThemeProvider.tsx    # Theme context provider
│       └── ThemeToggle.tsx      # Theme toggle component
├── hooks/               # Custom React hooks
├── lib/                 # External service configurations
│   ├── supabase.ts      # Supabase client
│   ├── stripe.ts        # Stripe configuration
│   └── revenuecat.ts    # RevenueCat configuration
├── navigation/          # Navigation configuration
├── screens/             # Screen components
├── store/               # Zustand stores
│   ├── authStore.ts     # Authentication state
│   ├── paymentStore.ts  # Payment state
│   └── themeStore.ts    # Theme state management
├── types/               # TypeScript type definitions
└── utils/               # Utility functions
```

## 🎯 Usage Examples

### Authentication

```typescript
import { useAuthStore } from '../store/authStore';

const MyComponent = () => {
  const { login, register, logout, user, isLoading } = useAuthStore();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password' });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    // Your component JSX
  );
};
```

### Payments

```typescript
import { usePaymentStore } from '../store/paymentStore';

const SubscriptionComponent = () => {
  const { purchaseSubscription, availablePlans, isLoading } = usePaymentStore();

  const handlePurchase = async (plan) => {
    try {
      await purchaseSubscription(plan);
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  return (
    // Your component JSX
  );
};
```

### Theme System

```typescript
import { useTheme } from '../components/ui/ThemeProvider';
import { ThemeToggle } from '../components/ui/ThemeToggle';

const ThemedComponent = () => {
  const { colors, isDark, setTheme, toggleTheme } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello World</Text>
      
      {/* Simple toggle button */}
      <ThemeToggle />
      
      {/* Toggle with label */}
      <ThemeToggle showLabel variant="button" />
      
      {/* Switch style toggle */}
      <ThemeToggle variant="switch" />
      
      {/* Dropdown with all options */}
      <ThemeToggle variant="dropdown" />
      
      {/* Manual theme control */}
      <Button onPress={() => setTheme('dark')} title="Dark Mode" />
      <Button onPress={() => setTheme('light')} title="Light Mode" />
      <Button onPress={() => setTheme('system')} title="System" />
    </View>
  );
};
```

### Theme Colors Available

```typescript
// Access all theme colors
const { colors } = useTheme();

// Available colors:
colors.background      // Main background
colors.surface         // Secondary background
colors.card           // Card background
colors.primary        // Primary brand color
colors.primaryDark    // Darker primary variant
colors.secondary      // Secondary text/elements
colors.text           // Primary text color
colors.textSecondary  // Secondary text color
colors.border         // Border color
colors.error          // Error/danger color
colors.success        // Success color
colors.warning        // Warning color
colors.info           // Info color
colors.overlay        // Modal overlay
colors.notification   // Notification color
```

## 🌙 Theme Features

- **🎨 Three theme modes**: Light, Dark, and System
- **📱 System detection**: Automatically follows device theme
- **💾 Persistence**: Remembers user preference across sessions
- **🔄 Live switching**: Instant theme changes without restart
- **🎛️ Multiple UI variants**: Button, switch, and dropdown toggles
- **🎨 Comprehensive color system**: 15+ semantic colors
- **⚡ Optimized performance**: Minimal re-renders with Zustand

## 🚀 Deployment

### Development Build

```bash
# iOS
eas build --platform ios --profile development

# Android
eas build --platform android --profile development
```

### Production Build

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### App Store Submission

```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## 🔍 Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npm start -- --clear`
2. **iOS build issues**: Make sure Xcode is updated
3. **Android build issues**: Check Android SDK configuration
4. **Dependency conflicts**: Try `npm install --legacy-peer-deps`
5. **Theme not persisting**: Ensure AsyncStorage permissions are set

### Getting Help

- Check the [Expo documentation](https://docs.expo.dev/)
- Visit [Supabase docs](https://supabase.com/docs)
- Review [Stripe documentation](https://stripe.com/docs)
- Check [RevenueCat guides](https://docs.revenuecat.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) for the amazing development platform
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Stripe](https://stripe.com/) for payment processing
- [RevenueCat](https://revenuecat.com/) for subscription management
- [TailwindCSS](https://tailwindcss.com/) and [NativeWind](https://nativewind.dev/) for styling
- [Zustand](https://zustand.surge.sh/) for state management

---

**Built with ❤️ for the React Native community**