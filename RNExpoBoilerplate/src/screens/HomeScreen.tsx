import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store/authStore';
import { usePaymentStore } from '../store/paymentStore';
import { useTheme } from '../components/ui/ThemeProvider';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { activeSubscription, checkSubscriptionStatus } = usePaymentStore();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const features = [
    {
      icon: 'shield-checkmark',
      title: 'Secure Authentication',
      description: 'Email/password and social login with Supabase',
    },
    {
      icon: 'card',
      title: 'Payment Integration',
      description: 'Stripe and RevenueCat for subscriptions',
    },
    {
      icon: 'server',
      title: 'Database Ready',
      description: 'Supabase PostgreSQL with real-time features',
    },
    {
      icon: 'phone-portrait',
      title: 'Cross Platform',
      description: 'Works on iOS, Android, and Web',
    },
    {
      icon: 'flash',
      title: 'Modern Stack',
      description: 'React Native, Expo, TypeScript, TailwindCSS',
    },
    {
      icon: 'notifications',
      title: 'Push Notifications',
      description: 'Expo Notifications with full support',
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView>
        {/* Welcome Section */}
        <View style={{
          backgroundColor: colors.primary,
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}>
          {/* Theme Toggle in Header */}
          <View style={{
            position: 'absolute',
            top: 16,
            right: 24,
            zIndex: 1,
          }}>
            <ThemeToggle size="sm" variant="button" />
          </View>

          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#FFFFFF',
            marginBottom: 8,
          }}>
            Welcome, {user?.name || 'User'}! 👋
          </Text>
          <Text style={{
            fontSize: 16,
            color: isDark ? '#E0E7FF' : '#E0E7FF',
            marginBottom: 24,
          }}>
            You're using the React Native Expo Boilerplate
          </Text>

          {activeSubscription ? (
            <View style={{
              backgroundColor: colors.success,
              padding: 16,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 16,
                }}>
                  {activeSubscription.name} Active
                </Text>
                <Text style={{
                  color: '#D1FAE5',
                  fontSize: 14,
                }}>
                  Enjoying premium features
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: colors.background,
                padding: 16,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() => navigation.navigate('payment' as never)}
            >
              <Ionicons name="star" size={24} color={colors.warning} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{
                  color: colors.text,
                  fontWeight: '600',
                  fontSize: 16,
                }}>
                  Upgrade to Premium
                </Text>
                <Text style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                }}>
                  Unlock all features
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Features Section */}
        <View style={{ padding: 24 }}>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 16,
          }}>
            What's Included
          </Text>

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: -8,
          }}>
            {features.map((feature, index) => (
              <View
                key={index}
                style={{
                  width: '50%',
                  paddingHorizontal: 8,
                  marginBottom: 16,
                }}
              >
                <View style={{
                  backgroundColor: colors.card,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  height: 120,
                }}>
                  <Ionicons 
                    name={feature.icon as any} 
                    size={24} 
                    color={colors.primary} 
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: colors.text,
                    marginBottom: 4,
                  }}>
                    {feature.title}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    lineHeight: 16,
                  }}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Theme Demo Section */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 16,
          }}>
            Theme System
          </Text>
          
          <View style={{
            backgroundColor: colors.card,
            padding: 20,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 12,
            }}>
              🌙 Dark/Light Theme Support
            </Text>
            <Text style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 16,
              lineHeight: 20,
            }}>
              Switch between light, dark, and system themes. The app automatically adapts to your preference and system settings.
            </Text>
            
            {/* Theme Toggle Variants */}
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>
                  Button Style:
                </Text>
                <ThemeToggle variant="button" showLabel />
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>
                  Switch Style:
                </Text>
                <ThemeToggle variant="switch" />
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>
                  Dropdown Style:
                </Text>
                <ThemeToggle variant="dropdown" />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 16,
          }}>
            Quick Actions
          </Text>

          <View style={{ gap: 12 }}>
            <Button
              title="View Subscription Plans"
              onPress={() => navigation.navigate('payment' as never)}
              variant="outline"
            />
            
            <Button
              title="Edit Profile"
              onPress={() => navigation.navigate('profile' as never)}
              variant="outline"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;