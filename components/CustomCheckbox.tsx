import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Check } from 'lucide-react-native';

type CustomCheckboxProps = {
  label: string;
  checked: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function CustomCheckbox({ 
  label, 
  checked, 
  onValueChange,
  disabled = false
}: CustomCheckboxProps) {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => !disabled && onValueChange(!checked)}
      disabled={disabled}
    >
      <View style={[
        styles.checkbox,
        checked && styles.checked,
        disabled && styles.disabled
      ]}>
        {checked && <Check size={16} color="#fff" />}
      </View>
      <Text style={[
        styles.label,
        disabled && styles.disabledText
      ]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  disabledText: {
    opacity: 0.5,
  },
});