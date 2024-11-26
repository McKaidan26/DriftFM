import React from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useUser } from './context/UserContext';

export default function ProfileScreen() {
  const { user, setUser } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem('userId');
      setUser(null);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Not logged in</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {user.profileImage && (
        <Image 
          source={{ uri: user.profileImage }} 
          style={styles.profileImage}
        />
      )}
      <ThemedText style={styles.name}>{user.displayName}</ThemedText>
      <ThemedText style={styles.id}>Spotify ID: {user.spotifyId}</ThemedText>
      
      <TouchableOpacity 
        style={styles.signOutButton} 
        onPress={handleSignOut}
      >
        <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  id: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 30,
  },
  signOutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 