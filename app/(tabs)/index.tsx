import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { HorizontalProgress } from '@/components/HorizontalProgress';
import { TimeSinceLastPouch } from '@/components/TimeSinceLastPouch';
import { Timer, Pause, Play, CircleStop as StopCircle } from 'lucide-react-native';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

const BACKGROUND_FETCH_TASK = 'background-fetch';

// Define the background task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return BackgroundFetch.BackgroundFetchResult.NoData;

  const { data: activePouches } = await supabase
    .from('pouches')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('end_time', null);

  if (!activePouches?.length) return BackgroundFetch.BackgroundFetchResult.NoData;

  for (const pouch of activePouches) {
    const elapsedTime = (Date.now() - new Date(pouch.start_time).getTime()) / 1000;
    const pauseDuration = pouch.total_pause_duration ? 
      parseInt(pouch.total_pause_duration.replace(' seconds', '')) : 0;
    
    const actualDuration = (elapsedTime - pauseDuration) / 60;
    
    if (actualDuration >= pouch.target_duration) {
      await supabase
        .from('pouches')
        .update({
          end_time: new Date().toISOString(),
          is_active: false,
          paused_at: null
        })
        .eq('id', pouch.id);

      if (Platform.OS !== 'web') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Pouch Timer Complete',
            body: 'Your pouch timer has finished!',
            sound: true,
          },
          trigger: null,
        });
      }
    }
  }

  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function Dashboard() {
  const [duration, setDuration] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [pouchCount, setPouchCount] = useState(0);
  const [targetPouches, setTargetPouches] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPouchId, setCurrentPouchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundTaskRegistered, setBackgroundTaskRegistered] = useState(false);
  const [lastPouchEndTime, setLastPouchEndTime] = useState<string | null>(null);
  const [timeBetweenPouches, setTimeBetweenPouches] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
  });

  // Register background fetch task
  useEffect(() => {
    const registerBackgroundFetch = async () => {
      try {
        if (Platform.OS === 'web') return;
        
        if (!backgroundTaskRegistered) {
          await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
            minimumInterval: 60, // 1 minute
            stopOnTerminate: false,
            startOnBoot: true,
          });
          setBackgroundTaskRegistered(true);
        }
      } catch (err) {
        console.warn(
          "Background fetch task registration failed:", 
          err instanceof Error ? err.message : 'Unknown error'
        );
      }
    };

    registerBackgroundFetch();
  }, [backgroundTaskRegistered]);

  // Cleanup background task on unmount
  useEffect(() => {
    return () => {
      if (Platform.OS !== 'web' && backgroundTaskRegistered) {
        BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK).catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [backgroundTaskRegistered]);

  const fetchHabits = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Get today's schedule
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: schedule, error: scheduleError } = await supabase
        .from('weaning_schedule_days')
        .select(`
          pouches_allowed,
          duration_per_pouch,
          time_between_pouches,
          weaning_plans!inner(user_id)
        `)
        .eq('weaning_plans.user_id', user.id)
        .eq('date', today.toISOString().split('T')[0]);

      if (scheduleError) throw scheduleError;

      // Handle case where no schedule is found
      if (!schedule || schedule.length === 0) {
        setDuration(0);
        setRemainingTime(0);
        setTimeBetweenPouches(0);
        setTargetPouches(0);
        setError('No schedule found for today. Please check your weaning plan.');
        setLoading(false);
        return;
      }

      const scheduleData = schedule[0];
      const durationInSeconds = scheduleData.duration_per_pouch * 60;
      setDuration(durationInSeconds);
      setRemainingTime(durationInSeconds);
      setTimeBetweenPouches(scheduleData.time_between_pouches);
      setTargetPouches(scheduleData.pouches_allowed);

      const { data: pouches, error: pouchesError } = await supabase
        .from('pouches')
        .select('id, end_time')
        .select('*')
        .match({
          user_id: user.id,
          is_active: false
        })
        .not('end_time', 'is', null)
        .order('end_time', { ascending: false })
        .limit(1);

      if (pouchesError) throw pouchesError;
      if (pouches && pouches.length > 0 && pouches[0].end_time) {
        setLastPouchEndTime(pouches[0].end_time);
      }

      const { data: todaysPouches, error: todaysPouchesError } = await supabase
        .from('pouches')
        .select('id')
        .eq('user_id', user.id)
        .gte('start_time', today.toISOString())
        .lt('start_time', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

      if (todaysPouchesError) throw todaysPouchesError;
      setPouchCount(todaysPouches?.length || 0);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to send notifications was denied');
        }
      }
    };

    requestPermissions();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors when hiding splash screen
      });
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && !isPaused && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime((time) => {
          if (time <= 1) {
            // Schedule notification when timer ends
            if (Platform.OS !== 'web') {
              Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Pouch Timer Complete',
                  body: 'Your pouch timer has finished!',
                  sound: true,
                },
                trigger: null, // Send immediately
              });
            }
            handleStop();
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, isPaused]);

  const handleError = (error: PostgrestError | Error) => {
    setError(error instanceof Error ? error.message : 'An error occurred');
    setLoading(false);
  };

  if (!fontsLoaded && !fontError) {
    return <View style={styles.background} />;
  }

  const handleStart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data: pouch, error: pouchError } = await supabase
        .from('pouches')
        .insert({
          user_id: user.id,
          target_duration: duration / 60, // Convert seconds to minutes
          is_active: true,
        })
        .select()
        .single();

      if (pouchError) throw pouchError;
      if (!pouch) throw new Error('Failed to create pouch');

      setCurrentPouchId(pouch.id);
      setPouchCount(prev => prev + 1);
    } catch (err) {
      handleError(err as Error | PostgrestError);
      return;
    }

    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (currentPouchId) {
      supabase
        .from('pouches')
        .update({
          paused_at: new Date().toISOString(),
        })
        .eq('id', currentPouchId)
        .then(({ error }) => {
          if (error) {
            handleError(error);
            return;
          }
          setIsPaused(true);
        });
    }
  };

  const handleResume = () => {
    if (currentPouchId) {
      supabase
        .from('pouches')
        .select('paused_at')
        .eq('id', currentPouchId)
        .single()
        .then(({ data: pouch, error }) => {
          if (error) {
            handleError(error);
            return;
          }
          
          if (pouch?.paused_at) {
            const pauseDuration = (Date.now() - new Date(pouch.paused_at).getTime()) / 1000;
            
            supabase
              .from('pouches')
              .update({
                paused_at: null,
                total_pause_duration: `${Math.floor(pauseDuration)} seconds`
              })
              .eq('id', currentPouchId)
              .then(({ error: updateError }) => {
                if (updateError) {
                  handleError(updateError);
                  return;
                }
                setIsPaused(false);
              });
          }
        });
    }
  };

  const handleStop = async () => {
    if (currentPouchId) {
      try {
        const { data: pouch, error: pouchError } = await supabase
          .from('pouches')
          .update({
            end_time: new Date().toISOString(),
            is_active: false,
            paused_at: null
          })
          .eq('id', currentPouchId)
          .select()
          .single();

        if (pouchError) throw pouchError;
        if (pouch?.end_time) {
          setLastPouchEndTime(pouch.end_time);
        }
      } catch (err) {
        handleError(err as Error | PostgrestError);
        return;
      }
    }

    setIsActive(false);
    setIsPaused(false);
    setRemainingTime(duration);
    setCurrentPouchId(null);
  };

  const progress = remainingTime / duration;
  const pouchProgress = pouchCount / targetPouches;

  const getProgressColor = (progress: number) => {
    if (progress >= 0.9) return '#ef4444'; // Red
    if (progress >= 0.8) return '#f97316'; // Orange
    if (progress >= 0.75) return '#eab308'; // Yellow
    return '#00A3A3'; // Default teal
  };

  return (
    <View style={styles.background}>
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            <>
              <Text style={styles.title}>Pouch Tracker</Text>
              <View style={styles.pouchCountContainer}>
                <Text style={styles.pouchCountText}>Today's Pouches</Text>
                <Text style={styles.pouchCount}>{pouchCount} / {targetPouches}</Text>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${pouchProgress * 100}%`,
                        backgroundColor: getProgressColor(pouchProgress)
                      }
                    ]} 
                  />
                </View>
              </View>
              {!isActive ? (
                <View style={styles.buttonContainer}>
                  {lastPouchEndTime && timeBetweenPouches > 0 && (
                    <TimeSinceLastPouch
                      lastPouchEndTime={lastPouchEndTime}
                      timeBetweenPouches={timeBetweenPouches}
                    />
                  )}
                  <Pressable
                    style={styles.mainButton}
                    onPress={handleStart}
                  >
                    <Text style={styles.mainButtonText}>Start New Pouch</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.currentPouchContainer}>
                  <Text style={styles.currentPouchTitle}>Current Pouch</Text>
                  <View style={styles.timerContainer}>
                    <HorizontalProgress
                      progress={progress}
                      duration={duration}
                      remainingTime={remainingTime}
                    />
                  </View>
                  <Pressable
                    style={styles.finishEarlyButton}
                    onPress={handleStop}
                  >
                    <Text style={styles.finishEarlyText}>Finish Early</Text>
                  </Pressable>
                </View>
              )}
            </>
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
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    borderRadius: 30,
    padding: 20,
  },
  title: {
    fontSize: 32,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 32,
  },
  pouchCountContainer: {
    width: '100%',
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '10px 10px 20px #D1D9E6, -10px -10px 20px #FFFFFF',
      }
    }),
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E3',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  pouchCountText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  pouchCount: {
    fontSize: 24,
    color: '#666',
    fontFamily: 'Inter-SemiBold',
    marginTop: 8,
  },
  currentPouchContainer: {
    width: '100%',
    marginTop: 20,
  },
  currentPouchTitle: {
    fontSize: 24,
    color: '#666',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  timerContainer: {
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
  },
  mainButton: {
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '10px 10px 20px #D1D9E6, -10px -10px 20px #FFFFFF',
      }
    }),
  },
  mainButtonText: {
    color: '#00A3A3',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  finishEarlyButton: {
    backgroundColor: '#F0F0F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#ef4444',
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '10px 10px 20px #D1D9E6, -10px -10px 20px #FFFFFF',
      }
    }),
  },
  finishEarlyText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
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