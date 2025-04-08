import { StyleSheet, View, Text, useWindowDimensions, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useEffect, useState } from 'react';

type TimeUnit = {
  value: number;
  label: string;
  total: number;
};

type CircularCountdownProps = {
  quitDate: string;
};

export function CircularCountdown({ quitDate }: CircularCountdownProps) {
  const [timeUnits, setTimeUnits] = useState<TimeUnit[]>([]);
  const { width } = useWindowDimensions();
  
  const isSmallScreen = width < 768;
  const containerPadding = 20;
  const gap = 16;
  const availableWidth = Math.min(width - (containerPadding * 2), 800);
  const ringSize = (availableWidth - (gap * 3)) / 4;

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const quit = new Date(quitDate).getTime();
      const distance = quit - now;

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const totalDays = Math.ceil((quit - new Date(quitDate).getTime()) / (1000 * 60 * 60 * 24));

      setTimeUnits([
        { value: days, label: 'Days Left', total: totalDays },
        { value: hours, label: 'Hours', total: 24 },
        { value: minutes, label: 'Minutes', total: 60 },
        { value: seconds, label: 'Seconds', total: 60 },
      ]);
    }, 1000);

    return () => clearInterval(interval);
  }, [quitDate]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Time until you're nicotine free</Text>
      <View style={[
        styles.ringsContainer,
        { flexDirection: 'row' }
      ]}>
        {timeUnits.map((unit, index) => (
          <CountdownRing
            key={unit.label}
            size={ringSize}
            strokeWidth={ringSize * 0.1}
            progress={unit.value / unit.total}
            value={unit.value}
            label={unit.label}
            style={{ marginRight: index < 3 ? gap : 0 }}
          />
        ))}
      </View>
    </View>
  );
}

type CountdownRingProps = {
  size: number;
  strokeWidth: number;
  progress: number;
  value: number;
  label: string;
  style?: any;
};

function CountdownRing({ 
  size, 
  strokeWidth, 
  progress, 
  value, 
  label,
  style
}: CountdownRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progressOffset = circumference - (progress * circumference);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          stroke="#E0E0E3"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <Circle
          stroke="#00A3A3"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={progressOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.textContainer, { width: size, height: size }]}>
        <Text style={[styles.valueText, { fontSize: size * 0.25 }]}>{value}</Text>
        <Text style={[styles.labelText, { fontSize: size * 0.12 }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#F0F0F3',
    borderRadius: 30,
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
  subtitle: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    marginBottom: 32,
  },
  ringsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    color: '#00A3A3',
    fontFamily: 'Inter-SemiBold',
  },
  labelText: {
    color: '#666',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
});