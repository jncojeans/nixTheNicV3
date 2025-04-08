import { StyleSheet, TextInput, View, Text, Platform } from 'react-native';
import { GlassContainer } from './GlassContainer';

type CustomInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
};

export function CustomInput({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  secureTextEntry 
}: CustomInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <GlassContainer style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          secureTextEntry={secureTextEntry}
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
  inputContainer: {
    padding: Platform.OS === 'web' ? 12 : 8,
  },
  input: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    ...(Platform.OS === 'web' ? {
    } : {}),
  },
});