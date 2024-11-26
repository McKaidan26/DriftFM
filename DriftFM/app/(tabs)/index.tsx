import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useUser } from '../context/UserContext';

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
      <ThemedText style={styles.message}>Welcome, {user.displayName}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
});
