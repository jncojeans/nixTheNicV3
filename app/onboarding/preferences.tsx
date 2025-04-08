import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { GlassContainer } from '@/components/GlassContainer';
import { CustomCheckbox } from '@/components/CustomCheckbox';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';

export default function Preferences() {
  const [reduceTimePerPouch, setReduceTimePerPouch] = useState(false);
  const [increaseTimeBetween, setIncreaseTimeBetween] = useState(false);
  const [startLater, setStartLater] = useState(false);
  const [stopEarlier, setStopEarlier] = useState(false);
  const [noPreference, setNoPreference] = useState(false);
  const [loading, setLoading] = useState(false);
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

  if (!fontsLoaded && !fontError) {
    return <View style={styles.background} />;
  }

  const handleNoPreferenceChange = (value: boolean) => {
    if (value) {
      setReduceTimePerPouch(false);
      setIncreaseTimeBetween(false);
      setStartLater(false);
      setStopEarlier(false);
    }
    setNoPreference(value);
  };

  const handlePreferenceChange = (setter: (value: boolean) => void, value: boolean) => {
    if (value) {
      setNoPreference(false);
    }
    setter(value);
  };

  const handleSavePreferences = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Start a transaction by using multiple operations
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_completed_preferences: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: preferencesError } = await supabase
        .from('user_preferred_methods')
        .insert({
          user_id: user.id,
          reduce_time_per_pouch: reduceTimePerPouch,
          increase_time_between: increaseTimeBetween,
          start_later: startLater,
          stop_earlier: stopEarlier,
          no_preference: noPreference,
        });

      if (preferencesError) throw preferencesError;

      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return noPreference || reduceTimePerPouch || increaseTimeBetween || startLater || stopEarlier;
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=3273&auto=format&fit=crop' }}
      style={styles.background}
    >
      <View style={styles.overlay} />
      <View style={styles.container}>
        <GlassContainer style={styles.formContainer}>
          <Text style={styles.title}>Preferred Method</Text>
          <Text style={styles.subtitle}>How would you like to achieve your goal?</Text>
          
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          
          <CustomCheckbox
            label="Reduce Time per Pouch"
            checked={reduceTimePerPouch}
            onValueChange={(value) => handlePreferenceChange(setReduceTimePerPouch, value)}
            disabled={noPreference}
          />
          
          <CustomCheckbox
            label="Increase Time Between Pouches"
            checked={increaseTimeBetween}
            onValueChange={(value) => handlePreferenceChange(setIncreaseTimeBetween, value)}
            disabled={noPreference}
          />
          
          <CustomCheckbox
            label="Start Later in the Day"
            checked={startLater}
            onValueChange={(value) => handlePreferenceChange(setStartLater, value)}
            disabled={noPreference}
          />
          
          <CustomCheckbox
            label="Stop Earlier in the Day"
            checked={stopEarlier}
            onValueChange={(value) => handlePreferenceChange(setStopEarlier, value)}
            disabled={noPreference}
          />
          
          <View style={styles.divider} />
          
          <CustomCheckbox
            label="No Preference"
            checked={noPreference}
            onValueChange={handleNoPreferenceChange}
            disabled={reduceTimePerPouch || increaseTimeBetween || startLater || stopEarlier}
          />
          
          <TouchableOpacity 
            style={[styles.button, !isFormValid() && styles.buttonDisabled]} 
            onPress={handleSavePreferences}
            disabled={!isFormValid()}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Complete Setup'}
            </Text>
          </TouchableOpacity>
        </GlassContainer>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    marginBottom: 32,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
});