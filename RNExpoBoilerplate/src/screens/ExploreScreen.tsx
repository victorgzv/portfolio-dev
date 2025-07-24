import React from 'react';
import { View, Text, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ExploreScreen: React.FC = () => {
  const features = [
    {
      icon: 'code-slash',
      title: 'Built with Modern Stack',
      description: 'React Native, Expo, TypeScript, and TailwindCSS for optimal developer experience.',
    },
    {
      icon: 'rocket',
      title: 'Production Ready',
      description: 'Complete authentication, payments, and database integration out of the box.',
    },
    {
      icon: 'layers',
      title: 'Scalable Architecture',
      description: 'Well-organized folder structure with separation of concerns and reusable components.',
    },
    {
      icon: 'shield-checkmark',
      title: 'Security First',
      description: 'Secure authentication with Supabase and encrypted token storage.',
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 24 }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Ionicons name="compass" size={64} color="#3B82F6" />
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: '#1F2937',
              marginTop: 16,
              textAlign: 'center',
            }}>
              Explore the Features
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#6B7280',
              textAlign: 'center',
              marginTop: 8,
            }}>
              Discover what makes this boilerplate special
            </Text>
          </View>

          {features.map((feature, index) => (
            <View
              key={index}
              style={{
                backgroundColor: '#FFFFFF',
                padding: 20,
                borderRadius: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
              }}>
                <View style={{
                  backgroundColor: '#EBF4FF',
                  padding: 12,
                  borderRadius: 8,
                  marginRight: 16,
                }}>
                  <Ionicons name={feature.icon as any} size={24} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: '#1F2937',
                    marginBottom: 8,
                  }}>
                    {feature.title}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#6B7280',
                    lineHeight: 20,
                  }}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <View style={{
            backgroundColor: '#3B82F6',
            padding: 24,
            borderRadius: 12,
            marginTop: 16,
            alignItems: 'center',
          }}>
            <Ionicons name="heart" size={32} color="#FFFFFF" />
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#FFFFFF',
              marginTop: 12,
              textAlign: 'center',
            }}>
              Built with ❤️
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#E0E7FF',
              textAlign: 'center',
              marginTop: 8,
            }}>
              This boilerplate was created to help developers build amazing React Native apps faster.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExploreScreen;