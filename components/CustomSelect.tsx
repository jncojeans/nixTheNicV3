import { StyleSheet, View, Text, Platform } from 'react-native';
import { GlassContainer } from './GlassContainer';
import RNPickerSelect from 'react-native-picker-select';

type Option = {
  label: string;
  value: string;
};

type CustomSelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
};

export function CustomSelect({ 
  label, 
  value, 
  onValueChange, 
  options,
  placeholder = 'Select an option'
}: CustomSelectProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <GlassContainer style={styles.selectContainer}>
        <RNPickerSelect
          value={value}
          onValueChange={onValueChange}
          items={options}
          style={{
            inputIOS: styles.select,
            inputAndroid: styles.select,
            inputWeb: styles.select,
          }}
          placeholder={{ label: placeholder, value: '' }}
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