import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { getSpotifyAuthUrl } = useAuth();

  const handleLogin = async () => {
    const authUrl = getSpotifyAuthUrl();
    await Linking.openURL(authUrl);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Welcome to DriftFM</ThemedText>
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <ThemedText style={styles.loginText}>Login with Spotify</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  loginButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  loginText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 