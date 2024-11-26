import React, { useEffect, useState } from 'react';
import { StyleSheet, Image, TouchableOpacity, ActivityIndicator, View, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import Slider from '@react-native-community/slider';

interface SpotifyTrack {
  item: {
    name: string;
    artists: { name: string }[];
    album: {
      images: { url: string }[];
    };
    duration_ms: number;
  };
  is_playing: boolean;
  progress_ms: number;
}

export default function IndexScreen() {
  const { user } = useUser();
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const fetchCurrentTrack = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('spotifyAccessToken');
      if (!accessToken) {
        setError('Not logged in to Spotify');
        setLoading(false);
        return;
      }

      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204) {
        setError('No track currently playing');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setCurrentTrack(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch current track');
      console.error('Error fetching track:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentTrack();
    // Fetch track data every 3 seconds
    const trackInterval = setInterval(fetchCurrentTrack, 3000);
    return () => clearInterval(trackInterval);
  }, []);

  // Add a new useEffect for smooth progress updates
  useEffect(() => {
    if (!currentTrack?.is_playing) return;

    setProgress(currentTrack.progress_ms);
    
    // Update progress every 100ms for smooth progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => prev + 100);
    }, 100);

    return () => clearInterval(progressInterval);
  }, [currentTrack]);

  const handlePlayPause = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('spotifyAccessToken');
      await fetch(`https://api.spotify.com/v1/me/player/${currentTrack?.is_playing ? 'pause' : 'play'}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      fetchCurrentTrack();
    } catch (err) {
      console.error('Error controlling playback:', err);
    }
  };

  const handleSkip = async (direction: 'next' | 'previous') => {
    try {
      const accessToken = await AsyncStorage.getItem('spotifyAccessToken');
      await fetch(`https://api.spotify.com/v1/me/player/${direction}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      fetchCurrentTrack();
    } catch (err) {
      console.error('Error skipping track:', err);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Sign in to see your Spotify playback</ThemedText>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#1DB954" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>{error}</ThemedText>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={fetchCurrentTrack}
        >
          <Ionicons name="refresh" size={24} color="#1DB954" />
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {currentTrack ? (
        <ThemedView style={styles.playerCard}>
          <View style={styles.contentContainer}>
            <Image
              source={{ uri: currentTrack.item.album.images[0].url }}
              style={styles.albumArt}
            />
            <View style={styles.trackInfo}>
              <ThemedText style={styles.trackName} numberOfLines={1}>
                {currentTrack.item.name}
              </ThemedText>
              <ThemedText style={styles.artistName} numberOfLines={1}>
                {currentTrack.item.artists.map(artist => artist.name).join(', ')}
              </ThemedText>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <Slider
              style={styles.progressBar}
              minimumValue={0}
              maximumValue={currentTrack.item.duration_ms}
              value={progress}
              minimumTrackTintColor="#1DB954"
              maximumTrackTintColor="rgba(255,255,255,0.1)"
              thumbTintColor="#1DB954"
            />
            <View style={styles.timeContainer}>
              <ThemedText style={styles.timeText}>
                {formatTime(progress)}
              </ThemedText>
              <ThemedText style={styles.timeText}>
                {formatTime(currentTrack.item.duration_ms)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity onPress={() => handleSkip('previous')}>
              <Ionicons name="play-skip-back" size={28} color="#1DB954" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePlayPause}>
              <Ionicons 
                name={currentTrack.is_playing ? "pause-circle" : "play-circle"} 
                size={44} 
                color="#1DB954" 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSkip('next')}>
              <Ionicons name="play-skip-forward" size={28} color="#1DB954" />
            </TouchableOpacity>
          </View>
        </ThemedView>
      ) : (
        <ThemedText style={styles.message}>No track currently playing</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  playerCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
    opacity: 0.7,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  progressContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 24,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    opacity: 0.6,
    fontWeight: '500',
  },
  message: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 16,
    padding: 8,
  },
});
