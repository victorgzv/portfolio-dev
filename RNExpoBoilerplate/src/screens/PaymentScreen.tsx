import React from 'react';
import { SafeAreaView } from 'react-native';
import { SubscriptionPlans } from '../components/payment/SubscriptionPlans';

const PaymentScreen: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SubscriptionPlans />
    </SafeAreaView>
  );
};

export default PaymentScreen;