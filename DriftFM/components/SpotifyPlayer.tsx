import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, PanResponder, Animated, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/app/context/UserContext';

interface SpotifyTrack {
  item: {
    id: string;
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

interface QueueItem {
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
}

export function SpotifyPlayer() {
  const { user } = useUser();
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [progress, setProgress] = useState(0);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [queueHeight, setQueueHeight] = useState(400);
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) return;
    fetchCurrentTrack();
    const interval = setInterval(fetchCurrentTrack, 3000);
    return () => clearInterval(interval);
  }, [user]);

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
      
      await Promise.all([
        fetchCurrentTrack(),
        fetchQueue()
      ]);
    } catch (err) {
      console.error('Error skipping track:', err);
    }
  };

  const fetchCurrentTrack = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('spotifyAccessToken');
      if (!accessToken) return;

      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204) return;

      const data = await response.json();
      setCurrentTrack(data);
    } catch (err) {
      console.error('Error fetching track:', err);
    }
  };

  const fetchQueue = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('spotifyAccessToken');
      if (!accessToken) return;

      const response = await fetch('https://api.spotify.com/v1/me/player/queue', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQueue(data.queue.slice(0, 3));
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  };

  const calculateQueueHeight = (queueLength: number) => {
    const headerHeight = 44;
    const itemHeight = 64;
    const maxHeight = Dimensions.get('window').height * 0.6;
    const calculatedHeight = headerHeight + (itemHeight * queueLength);
    return Math.min(maxHeight, Math.max(300, calculatedHeight));
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      const newY = Math.min(0, Math.max(-200, gestureState.dy));
      panY.setValue(newY);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy < -50) {
        Animated.spring(panY, {
          toValue: -200,
          useNativeDriver: true,
        }).start(() => {
          setIsExpanded(true);
          fetchQueue();
        });
      } else {
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
        }).start(() => setIsExpanded(false));
      }
    },
  });

  const renderQueueItem = ({ item }: { item: QueueItem }) => (
    <View style={styles.queueItem}>
      {item?.album?.images?.[0]?.url ? (
        <Image
          source={{ uri: item.album.images[0].url }}
          style={styles.queueItemArt}
        />
      ) : (
        <View style={[styles.queueItemArt, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
      )}
      <View style={styles.queueItemInfo}>
        <ThemedText style={styles.queueItemTitle} numberOfLines={1}>
          {item?.name || 'Unknown Track'}
        </ThemedText>
        <ThemedText style={styles.queueItemArtist} numberOfLines={1}>
          {item?.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist'}
        </ThemedText>
      </View>
    </View>
  );

  useEffect(() => {
    if (currentTrack?.progress_ms && currentTrack?.item?.duration_ms) {
      if (currentTrack.progress_ms >= currentTrack.item.duration_ms - 1000) {
        if (isExpanded) {
          fetchQueue();
        }
      }
    }
  }, [currentTrack?.progress_ms]);

  useEffect(() => {
    fetchQueue();

    const queueInterval = setInterval(fetchQueue, 10000);
    return () => clearInterval(queueInterval);
  }, []);

  useEffect(() => {
    if (!currentTrack?.is_playing) return;
    
    // Set initial progress
    setProgress(currentTrack.progress_ms);
    
    // Update progress every 100ms
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        // Reset progress if it exceeds duration
        if (prev >= currentTrack.item.duration_ms) {
          return currentTrack.progress_ms;
        }
        return prev + 100;
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [currentTrack]);

  useEffect(() => {
    if (currentTrack) {
      setProgress(currentTrack.progress_ms);
    }
  }, [currentTrack?.item?.id, currentTrack?.is_playing]);

  if (!user || !currentTrack) return null;

  const progressPercentage = currentTrack?.item?.duration_ms 
    ? (progress / currentTrack.item.duration_ms) * 100 
    : 0;

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: panY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.mainContent}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
          <View style={styles.timeContainer}>
            <ThemedText style={styles.timeText}>
              {formatTime(progress)}
            </ThemedText>
            <ThemedText style={styles.timeText}>
              {formatTime(currentTrack?.item?.duration_ms || 0)}
            </ThemedText>
          </View>
        </View>
        <View style={styles.content}>
          {currentTrack?.item?.album?.images?.[0]?.url ? (
            <Image
              source={{ uri: currentTrack.item.album.images[0].url }}
              style={styles.albumArt}
            />
          ) : (
            <View style={[styles.albumArt, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
          )}
          <View style={styles.trackInfo}>
            <ThemedText numberOfLines={1} style={styles.trackName}>
              {currentTrack?.item?.name || 'Unknown Track'}
            </ThemedText>
            <ThemedText numberOfLines={1} style={styles.artistName}>
              {currentTrack?.item?.artists?.map(artist => artist.name).join(', ') || 'Unknown Artist'}
            </ThemedText>
          </View>
          <View style={styles.controls}>
            <TouchableOpacity onPress={() => handleSkip('previous')}>
              <Ionicons name="play-skip-back" size={24} color="#1DB954" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
              <Ionicons 
                name={currentTrack.is_playing ? "pause" : "play"} 
                size={32} 
                color="#1DB954" 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSkip('next')}>
              <Ionicons name="play-skip-forward" size={24} color="#1DB954" />
            </TouchableOpacity>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.queueContainer}>
            <ThemedText style={styles.queueTitle}>Next Up</ThemedText>
            {queue.map((item, index) => (
              <View key={index} style={styles.queueItem}>
                <Image
                  source={{ uri: item.album.images[0].url }}
                  style={styles.queueItemArt}
                />
                <View style={styles.queueItemInfo}>
                  <ThemedText style={styles.queueItemTitle} numberOfLines={1}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={styles.queueItemArtist} numberOfLines={1}>
                    {item.artists.map(artist => artist.name).join(', ')}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.95)',
    paddingBottom: 34,
  },
  mainContent: {
    width: '100%',
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1DB954',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    opacity: 0.5,
  },
  content: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 4,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  trackName: {
    fontSize: 16,
    fontWeight: '600',
  },
  artistName: {
    fontSize: 14,
    opacity: 0.7,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    marginHorizontal: 8,
  },
  queueContainer: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.95)',
    height: 200,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueItemArt: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  queueItemArtist: {
    fontSize: 12,
    opacity: 0.7,
  },
}); 