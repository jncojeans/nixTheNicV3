import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ImageBackground, Platform } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { GlassContainer } from '@/components/GlassContainer';
import { CustomInput } from '@/components/CustomInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';

export default function Habits() {
  const [pouchMgs, setPouchMgs] = useState('');
  const [firstPouchTime, setFirstPouchTime] = useState(new Date());
  const [pouchesPerDay, setPouchesPerDay] = useState('');
  const [durationPerPouch, setDurationPerPouch] = useState('');
  const [timeBetweenPouches, setTimeBetweenPouches] = useState('');
  const [lastPouchTime, setLastPouchTime] = useState(new Date());
  const [showFirstPouchPicker, setShowFirstPouchPicker] = useState(Platform.OS === 'web');
  const [showLastPouchPicker, setShowLastPouchPicker] = useState(Platform.OS === 'web');
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

  const handleSaveHabits = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Start a transaction by using multiple operations
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_completed_habits: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: habitsError } = await supabase
        .from('current_habits')
        .insert({
          user_id: user.id,
          pouch_mgs: Number(pouchMgs),
          first_pouch_time: firstPouchTime.toLocaleTimeString('en-US', { hour12: false }),
          pouches_per_day: Number(pouchesPerDay),
          duration_per_pouch: Number(durationPerPouch),
          time_between_pouches: Number(timeBetweenPouches),
          last_pouch_time: lastPouchTime.toLocaleTimeString('en-US', { hour12: false }),
        });

      if (habitsError) throw habitsError;

      router.replace('/onboarding/preferences');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (setter: (date: Date) => void) => (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'web') {
      setShowFirstPouchPicker(false);
      setShowLastPouchPicker(false);
    }
    if (selectedDate) {
      setter(selectedDate);
    }
  };

  const isFormValid = () => {
    return (
      pouchMgs &&
      pouchesPerDay &&
      durationPerPouch &&
      timeBetweenPouches &&
      firstPouchTime < lastPouchTime
    );
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=3270&auto=format&fit=crop' }}
      style={styles.background}
    >
      <View style={styles.overlay} />
      <View style={styles.container}>
        <GlassContainer style={styles.formContainer}>
          <Text style={styles.title}>Current Habits</Text>
          <Text style={styles.subtitle}>Help us understand your current usage</Text>
          
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          
          <CustomInput
            label="Pouch MGs"
            value={pouchMgs}
            onChangeText={setPouchMgs}
            placeholder="Enter MGs per pouch"
            keyboardType="numeric"
          />

          <View style={styles.timeContainer}>
            <Text style={styles.label}>First Pouch of the Day</Text>
            {Platform.OS === 'web' ? (
              <GlassContainer style={styles.timeInputContainer}>
                <input
                  type="time"
                  value={firstPouchTime.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)}
                  onChange={(e) => setFirstPouchTime(new Date(`2000-01-01T${e.target.value}`))}
                  style={styles.webTimeInput}
                />
              </GlassContainer>
            ) : (
              <>
                <TouchableOpacity onPress={() => setShowFirstPouchPicker(true)}>
                  <GlassContainer style={styles.timeInputContainer}>
                    <Text style={styles.timeText}>
                      {firstPouchTime.toLocaleTimeString()}
                    </Text>
                  </GlassContainer>
                </TouchableOpacity>
                {showFirstPouchPicker && (
                  <DateTimePicker
                    value={firstPouchTime}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange(setFirstPouchTime)}
                  />
                )}
              </>
            )}
          </View>

          <CustomInput
            label="Pouches per Day"
            value={pouchesPerDay}
            onChangeText={setPouchesPerDay}
            placeholder="Enter number of pouches"
            keyboardType="numeric"
          />

          <CustomInput
            label="Duration per Pouch (minutes)"
            value={durationPerPouch}
            onChangeText={setDurationPerPouch}
            placeholder="Enter duration"
            keyboardType="numeric"
          />

          <CustomInput
            label="Time Between Pouches (minutes)"
            value={timeBetweenPouches}
            onChangeText={setTimeBetweenPouches}
            placeholder="Enter time"
            keyboardType="numeric"
          />

          <View style={styles.timeContainer}>
            <Text style={styles.label}>Last Pouch of the Day</Text>
            {Platform.OS === 'web' ? (
              <GlassContainer style={styles.timeInputContainer}>
                <input
                  type="time"
                  value={lastPouchTime.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5)}
                  onChange={(e) => setLastPouchTime(new Date(`2000-01-01T${e.target.value}`))}
                  style={styles.webTimeInput}
                />
              </GlassContainer>
            ) : (
              <>
                <TouchableOpacity onPress={() => setShowLastPouchPicker(true)}>
                  <GlassContainer style={styles.timeInputContainer}>
                    <Text style={styles.timeText}>
                      {lastPouchTime.toLocaleTimeString()}
                    </Text>
                  </GlassContainer>
                </TouchableOpacity>
                {showLastPouchPicker && (
                  <DateTimePicker
                    value={lastPouchTime}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange(setLastPouchTime)}
                  />
                )}
              </>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.button, !isFormValid() && styles.buttonDisabled]} 
            onPress={handleSaveHabits}
            disabled={!isFormValid()}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Continue'}
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
  timeContainer: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  timeInputContainer: {
    padding: Platform.OS === 'web' ? 12 : 16,
  },
  timeText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  webTimeInput: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    width: '100%',
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