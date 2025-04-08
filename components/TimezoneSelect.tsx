import { StyleSheet, View, Text, Platform } from 'react-native';
import { GlassContainer } from './GlassContainer';
import RNPickerSelect from 'react-native-picker-select';
import { useEffect, useState } from 'react';

type TimezoneSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
};

export function TimezoneSelect({ value, onValueChange }: TimezoneSelectProps) {
  const [timezones, setTimezones] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    // Get list of IANA timezones
    const zones = Intl.supportedValuesOf('timeZone')
      .map(zone => ({
        label: zone.replace(/_/g, ' ').replace(/\//g, ' / '),
        value: zone
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    setTimezones(zones);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Your Timezone</Text>
      <GlassContainer style={styles.selectContainer}>
        <RNPickerSelect
          value={value}
          onValueChange={onValueChange}
          items={timezones}
          style={{
            inputIOS: styles.select,
            inputAndroid: styles.select,
            inputWeb: styles.select,
          }}
          placeholder={{ label: 'Select your timezone', value: '' }}
        />
      </GlassContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  selectContainer: {
    padding: Platform.OS === 'web' ? 12 : 8,
  },
  select: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
});