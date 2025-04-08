import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';

type GlassContainerProps = {
  children: React.ReactNode;
  intensity?: number;
  style?: any;
};

export function GlassContainer({ children, intensity = 40, style }: GlassContainerProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webGlass, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glass: {
    padding: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  webGlass: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
});