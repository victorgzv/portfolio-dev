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
import { Button } from '../components/ui/Button';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { activeSubscription, checkSubscriptionStatus } = usePaymentStore();

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView>
        {/* Welcome Section */}
        <View style={{
          backgroundColor: '#3B82F6',
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}>
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
            color: '#E0E7FF',
            marginBottom: 24,
          }}>
            You're using the React Native Expo Boilerplate
          </Text>

          {activeSubscription ? (
            <View style={{
              backgroundColor: '#10B981',
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
                backgroundColor: '#FFFFFF',
                padding: 16,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() => navigation.navigate('payment' as never)}
            >
              <Ionicons name="star" size={24} color="#F59E0B" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{
                  color: '#1F2937',
                  fontWeight: '600',
                  fontSize: 16,
                }}>
                  Upgrade to Premium
                </Text>
                <Text style={{
                  color: '#6B7280',
                  fontSize: 14,
                }}>
                  Unlock all features
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Features Section */}
        <View style={{ padding: 24 }}>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#1F2937',
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
                  backgroundColor: '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  height: 120,
                }}>
                  <Ionicons 
                    name={feature.icon as any} 
                    size={24} 
                    color="#3B82F6" 
                    style={{ marginBottom: 8 }}
                  />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#1F2937',
                    marginBottom: 4,
                  }}>
                    {feature.title}
                  </Text>
                  <Text style={{
                    fontSize: 12,
                    color: '#6B7280',
                    lineHeight: 16,
                  }}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#1F2937',
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