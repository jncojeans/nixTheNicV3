import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ImageBackground, Platform } from 'react-native';
import { router } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { GlassContainer } from '@/components/GlassContainer';
import { CustomSelect } from '@/components/CustomSelect';
import { CustomInput } from '@/components/CustomInput';
import { TimezoneSelect } from '@/components/TimezoneSelect';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';

const goalOptions = [
  { label: 'Quit', value: 'quit' },
  { label: 'Control my habit', value: 'control' },
];

export default function Goal() {
  const [goalType, setGoalType] = useState('');
  const [targetDate, setTargetDate] = useState(new Date());
  const [timezone, setTimezone] = useState('');
  const [pouchesPerDay, setPouchesPerDay] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'web');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set default timezone based on user's system
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

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

  const handleSaveGoal = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Update profile with timezone
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          timezone,
          has_completed_goal: true 
        })
        .eq('id', user.id);

      if (profileUpdateError) throw profileUpdateError;

      // Create user goal
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_completed_goal: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { error: goalError } = await supabase
        .from('user_goals')
        .insert({
          user_id: user.id,
          goal_type: goalType,
          target_date: targetDate.toISOString().split('T')[0],
          pouches_per_day: goalType === 'control' ? Number(pouchesPerDay) : null,
        });

      if (goalError) throw goalError;

      router.push('/onboarding/habits');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'web') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const showDatePickerModal = () => {
    if (Platform.OS !== 'web') {
      setShowDatePicker(true);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=3272&auto=format&fit=crop' }}
      style={styles.background}
    >
      <View style={styles.overlay} />
      <View style={styles.container}>
        <GlassContainer style={styles.formContainer}>
          <Text style={styles.title}>Set Your Goal</Text>
          <Text style={styles.subtitle}>Let's establish your journey's destination</Text>
          
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          
          <CustomSelect
            label="What is your Goal?"
            value={goalType}
            onValueChange={setGoalType}
            options={goalOptions}
          />
          
          <View style={styles.dateContainer}>
            <Text style={styles.label}>When will you achieve your goal?</Text>
            {Platform.OS === 'web' ? (
              <GlassContainer style={styles.dateInputContainer}>
                <input
                  type="date"
                  value={targetDate.toISOString().split('T')[0]}
                  onChange={(e) => setTargetDate(new Date(e.target.value))}
                  style={styles.webDateInput}
                  min={new Date().toISOString().split('T')[0]}
                />
              </GlassContainer>
            ) : (
              <>
                <TouchableOpacity onPress={showDatePickerModal}>
                  <GlassContainer style={styles.dateInputContainer}>
                    <Text style={styles.dateText}>
                      {targetDate.toLocaleDateString()}
                    </Text>
                  </GlassContainer>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={targetDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>
          
          <TimezoneSelect
            value={timezone}
            onValueChange={setTimezone}
          />
          
          {goalType === 'control' && (
            <CustomInput
              label="Pouches per day"
              value={pouchesPerDay}
              onChangeText={setPouchesPerDay}
              placeholder="Enter number of pouches"
              keyboardType="numeric"
            />
          )}
          
          <TouchableOpacity 
            style={[
              styles.button,
              (!goalType || !timezone || (goalType === 'control' && !pouchesPerDay)) && styles.buttonDisabled
            ]} 
            onPress={handleSaveGoal}
            disabled={!goalType || !timezone || (goalType === 'control' && !pouchesPerDay)}
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
  dateContainer: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  dateInputContainer: {
    padding: Platform.OS === 'web' ? 12 : 16,
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  webDateInput: {
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