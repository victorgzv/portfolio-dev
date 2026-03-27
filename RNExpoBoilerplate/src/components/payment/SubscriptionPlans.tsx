import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePaymentStore } from '../../store/paymentStore';
import { Button } from '../ui/Button';
import { SubscriptionPlan } from '../../types';
import { getOfferings } from '../../lib/revenuecat';
import { PurchasesPackage } from 'react-native-purchases';

export const SubscriptionPlans: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  
  const { 
    availablePlans, 
    activeSubscription, 
    isLoading,
    loadOfferings,
    purchaseSubscription,
    restoreSubscriptions 
  } = usePaymentStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await loadOfferings();
      
      // Load RevenueCat packages
      const offerings = await getOfferings();
      const allPackages: PurchasesPackage[] = [];
      
      offerings.forEach(offering => {
        allPackages.push(...offering.availablePackages);
      });
      
      setPackages(allPackages);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    }
  };

  const handlePurchase = async (plan: SubscriptionPlan) => {
    try {
      // Find the corresponding RevenueCat package
      const pkg = packages.find(p => 
        p.identifier === plan.revenueCatOffering || 
        p.offeringIdentifier === plan.revenueCatOffering
      );

      if (!pkg) {
        Alert.alert('Error', 'Package not found. Please try again.');
        return;
      }

      await purchaseSubscription(pkg);
      Alert.alert('Success', 'Subscription activated successfully!');
    } catch (error: any) {
      Alert.alert('Purchase Failed', error.message || 'Failed to purchase subscription');
    }
  };

  const handleRestore = async () => {
    try {
      await restoreSubscriptions();
      Alert.alert('Success', 'Purchases restored successfully!');
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'Failed to restore purchases');
    }
  };

  const PlanCard: React.FC<{ plan: SubscriptionPlan }> = ({ plan }) => {
    const isActive = activeSubscription?.id === plan.id;
    const isSelected = selectedPlan === plan.id;
    const isPopular = plan.id === 'pro';

    return (
      <TouchableOpacity
        style={{
          backgroundColor: isSelected ? '#EBF4FF' : '#FFFFFF',
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? '#3B82F6' : '#E5E7EB',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          position: 'relative',
        }}
        onPress={() => setSelectedPlan(plan.id)}
        activeOpacity={0.7}
      >
        {isPopular && (
          <View style={{
            position: 'absolute',
            top: -10,
            left: 20,
            backgroundColor: '#3B82F6',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '600',
            }}>
              Most Popular
            </Text>
          </View>
        )}

        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: 12 
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#1F2937',
              marginBottom: 4,
            }}>
              {plan.name}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6B7280',
              marginBottom: 8,
            }}>
              {plan.description}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: '#1F2937',
              }}>
                ${plan.price}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6B7280',
                marginLeft: 4,
              }}>
                /{plan.interval}
              </Text>
            </View>
          </View>

          <View style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: isSelected ? '#3B82F6' : '#D1D5DB',
            backgroundColor: isSelected ? '#3B82F6' : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {isSelected && (
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            )}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          {plan.features.map((feature, index) => (
            <View key={index} style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <Ionicons 
                name="checkmark-circle" 
                size={16} 
                color="#10B981" 
                style={{ marginRight: 8 }}
              />
              <Text style={{
                fontSize: 14,
                color: '#4B5563',
                flex: 1,
              }}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        {isActive && (
          <View style={{
            backgroundColor: '#D1FAE5',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 6,
            alignItems: 'center',
          }}>
            <Text style={{
              color: '#065F46',
              fontSize: 14,
              fontWeight: '600',
            }}>
              Current Plan
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const selectedPlanData = availablePlans.find(plan => plan.id === selectedPlan);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ padding: 24 }}>
        <View style={{ marginBottom: 32, alignItems: 'center' }}>
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#1F2937',
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Choose Your Plan
          </Text>
          <Text style={{
            fontSize: 16,
            color: '#6B7280',
            textAlign: 'center',
          }}>
            Upgrade to unlock premium features
          </Text>
        </View>

        {availablePlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}

        {selectedPlanData && !activeSubscription && (
          <Button
            title={`Subscribe to ${selectedPlanData.name}`}
            onPress={() => handlePurchase(selectedPlanData)}
            loading={isLoading}
            size="lg"
            style={{ marginBottom: 16 }}
          />
        )}

        <Button
          title="Restore Purchases"
          onPress={handleRestore}
          variant="outline"
          loading={isLoading}
          style={{ marginBottom: 24 }}
        />

        <View style={{
          padding: 16,
          backgroundColor: '#F3F4F6',
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <Text style={{
            fontSize: 12,
            color: '#6B7280',
            textAlign: 'center',
            lineHeight: 18,
          }}>
            Subscriptions automatically renew unless auto-renew is turned off at least 24 hours before the end of the current period. 
            You can manage your subscription in your {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} account settings.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};