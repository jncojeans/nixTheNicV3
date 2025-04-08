import { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { CircularCountdown } from '@/components/CircularCountdown';
import { supabase } from '@/lib/supabase';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

export default function Plan() {
  const [quitDate, setQuitDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors when hiding splash screen
      });
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    async function fetchQuitDate() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        const { data: plan, error: planError } = await supabase
          .from('weaning_plans')
          .select('quit_date')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (planError) throw planError;
        if (!plan) throw new Error('No weaning plan found');

        setQuitDate(plan.quit_date);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchQuitDate();
  }, []);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.background} />;
  }

  return (
    <View style={styles.background}>
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : quitDate ? (
            <>
              <Text style={styles.title}>Your Journey</Text>
              <CircularCountdown quitDate={quitDate} />
            </>
          ) : (
            <Text style={styles.errorText}>No quit date set</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#F0F0F3',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  loadingText: {
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
});