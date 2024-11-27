import React, { useEffect, useState } from 'react';
import { StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useUser } from '@/app/context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SpotifyWebApi from 'spotify-web-api-node';

interface SpotifyProfile {
  display_name?: string;
  images?: Array<{ 
    url: string; 
    width?: number; 
    height?: number;
  }>;
}

export default function ProfileScreen() {
  const { user, setUser } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<SpotifyProfile | null>(null);

  useEffect(() => {
    const fetchSpotifyData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const accessToken = await AsyncStorage.getItem('spotifyAccessToken');
        if (!accessToken) {
          setError('No access token found');
          return;
        }

        const spotifyApi = new SpotifyWebApi({ accessToken });
        const profileResponse = await spotifyApi.getMe();
        if (profileResponse?.body) {
          setUserProfile(profileResponse.body);
        }
      } catch (error: any) {
        setError(error?.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpotifyData();
  }, []);

  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('spotifyAccessToken');
      await AsyncStorage.removeItem('spotifyRefreshToken');
      setUser(null);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;
  if (isLoading) return <ActivityIndicator size="large" color="#1DB954" />;
  if (error) return <ThemedText style={styles.errorText}>{error}</ThemedText>;

  return (
    <ThemedView style={styles.container}>
      {userProfile?.images?.[0]?.url && (
        <Image
          source={{ uri: userProfile.images[0].url }}
          style={styles.profileImage}
        />
      )}
      <ThemedText style={styles.username}>
        {userProfile?.display_name || 'Spotify User'}
      </ThemedText>
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
    paddingTop: 60,
    paddingBottom: 100,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  signOutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 20,
  },
}); 