import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface PageIndicatorProps {
  position: Animated.AnimatedInterpolation<number>;
  total: number;
}

export function PageIndicator({ position, total }: PageIndicatorProps) {
  const dots = Array(total).fill(0);

  return (
    <View style={styles.container}>
      {dots.map((_, i) => {
        const opacity = position.interpolate({
          inputRange: [i - 1, i, i + 1],
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        const scale = position.interpolate({
          inputRange: [i - 1, i, i + 1],
          outputRange: [1, 1.2, 1],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    padding: 8,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1DB954',
  },
}); 