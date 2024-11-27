import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { useUser } from '../context/UserContext';
import { TTSService } from '@/components/TTSService';
import { ThemedText } from '@/components/ThemedText';

export default function IndexScreen() {
  const { user } = useUser();

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Sign in to see your Spotify playback</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <TTSService />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 24,
  },
});
