import { StyleSheet, View, Text, Platform } from 'react-native';

type HorizontalProgressProps = {
  progress: number;
  duration: number;
  remainingTime: number;
};

const getProgressColor = (progress: number) => {
  if (progress <= 0.25) return '#ef4444'; // Red
  if (progress <= 0.2) return '#f97316'; // Orange
  if (progress <= 0.15) return '#eab308'; // Yellow
  return '#00A3A3'; // Default teal
};

export function HorizontalProgress({ 
  progress, 
  duration,
  remainingTime,
}: HorizontalProgressProps) {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timeText}>{formatTime(remainingTime)}</Text>
      <Text style={styles.remainingText}>remaining</Text>
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressBar, 
            { 
              width: `${progress * 100}%`,
              backgroundColor: getProgressColor(progress)
            }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 20,
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
  timeText: {
    fontSize: 48,
    fontFamily: 'Inter-SemiBold',
    color: '#00A3A3',
    marginBottom: 4,
  },
  remainingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E3',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
});