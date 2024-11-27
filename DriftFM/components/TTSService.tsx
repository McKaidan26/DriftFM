import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Pressable, Platform, Alert, Image, Animated } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { useTTS } from '../app/context/TTSContext';
import { Ionicons } from '@expo/vector-icons';
import SpotifyWebApi from 'spotify-web-api-node';
import { useAuth } from '@/app/context/AuthContext';
import { AudioCache } from '@/utils/audioCache';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../app/context/UserContext';
import { LinearGradient } from 'expo-linear-gradient';

// Radio channels configuration
const RADIO_CHANNELS = [
  {
    id: 1,
    name: "Pulse Underground",
    host: {
      id: "jsCqWAovK2LkecY7zXl4",
      name: "Maya"
    },
    color: "#FF4B4B",
    description: "Alternative & Indie",
    introText: "Pulse Underground, where the underground meets the mainstream. Maya here, keeping you locked in with the freshest indie tracks.",
    genres: ["indie", "indie-pop", "alternative"]
  },
  {
    id: 2,
    name: "Bass Theory",
    host: {
      id: "ThT5KcBeYPX3keUQqHPh",
      name: "Riley"
    },
    color: "#4B9EFF",
    description: "EDM & House",
    introText: "Bass Theory, your source for pure electronic energy. This is Riley, ready to drop the beats that'll shake your world.",
    genres: ["edm", "house", "electronic"]
  },
  {
    id: 3,
    name: "Velvet Lounge",
    host: {
      id: "piTKgcLEGmPE4e6mEKli",
      name: "Sofia"
    },
    color: "#FFB74B",
    description: "Jazz & Soul",
    introText: "Welcome to the Velvet Lounge. Sofia here, bringing you the smoothest vibes in the city.",
    genres: ["jazz", "soul", "neo-soul"]
  },
  {
    id: 4,
    name: "Block Radio",
    host: {
      id: "pFZP5JQG7iQjIQuC4Bku",
      name: "Jade"
    },
    color: "#4BFF5C",
    description: "Hip-Hop & Beats",
    introText: "Block Radio, straight from the streets to your speakers. It's your girl Jade, let's keep this party moving.",
    genres: ["hip-hop", "rap", "trap"]
  }
];

interface SpotifyTrack {
  item: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: {
      images: { url: string }[];
    };
  };
}

export function TTSService() {
  const { user, updateLastRadio } = useUser();
  const [selectedChannel, setSelectedChannel] = useState(RADIO_CHANNELS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const { creditsUsed, incrementCredits } = useTTS();
  const { accessToken, refreshAccessToken } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fadePlayingAnim = useRef(new Animated.Value(0)).current;
  const [previousChannel, setPreviousChannel] = useState<number | null>(null);
  const [activeTrackChannel, setActiveTrackChannel] = useState<number | null>(null);
  const [isChangingChannel, setIsChangingChannel] = useState(false);

  useEffect(() => {
    AudioCache.setup();
  }, []);

  // Load last selected radio on mount
  useEffect(() => {
    const loadLastRadio = async () => {
      try {
        // Try AsyncStorage first for quick load
        const storedId = await AsyncStorage.getItem('lastRadioId');
        if (storedId) {
          const channel = RADIO_CHANNELS.find(c => c.id === parseInt(storedId));
          if (channel) setSelectedChannel(channel);
        } else if (user?.lastRadioId) {
          // Fall back to user data from context
          const channel = RADIO_CHANNELS.find(c => c.id === user.lastRadioId);
          if (channel) setSelectedChannel(channel);
        }
      } catch (error) {
        console.error('Error loading last radio:', error);
      }
    };

    loadLastRadio();
  }, [user]);

  const handleChannelChange = async (channel: typeof RADIO_CHANNELS[0]) => {
    console.log('Starting handleChannelChange');
    setIsChangingChannel(true);
    setSelectedChannel(channel);
    await updateLastRadio(channel.id);  // Save the selection
    await playChannelIntro(channel);
    setIsChangingChannel(false);
  };

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchCurrentTrack = async () => {
      if (!accessToken || !isMounted) return;

      const api = new SpotifyWebApi({ accessToken });

      try {
        // Add timeout to prevent hanging requests
        const deviceController = new AbortController();
        const deviceTimeoutId = setTimeout(() => {
          deviceController.abort();
        }, 5000);

        const deviceState = await api.getMyDevices() as any;
        clearTimeout(deviceTimeoutId);

        if (!deviceState?.body?.devices?.length || !isMounted) {
          return;
        }

        const playbackController = new AbortController();
        const playbackTimeoutId = setTimeout(() => {
          playbackController.abort();
        }, 5000);

        const playbackState = await api.getMyCurrentPlaybackState() as any;
        clearTimeout(playbackTimeoutId);

        if (!playbackState?.body?.item || !isMounted) {
          return;
        }

        const track = playbackState.body.item;
        if (!track || !('artists' in track)) {
          return;
        }

        setCurrentTrack({
          item: {
            id: track.id,
            name: track.name,
            artists: track.artists,
            album: track.album
          }
        });

      } catch (error) {
        // Silent error handling
        return;
      }
    };

    const interval = setInterval(fetchCurrentTrack, 1000); // Increased interval to 1 second
    fetchCurrentTrack();

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [accessToken]);

  useEffect(() => {
    if (previousChannel !== selectedChannel.id) {
      setCurrentTrack(null);
      setPreviousChannel(selectedChannel.id);
    }
  }, [selectedChannel.id]);

  useEffect(() => {
    if (currentTrack?.item?.album?.images?.[0]?.url) {
      // Wait 2 seconds before starting animations
      setTimeout(() => {
        // Background fade in first
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Then fade in currently playing info
          Animated.timing(fadePlayingAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
        });
      }, 2000);  // 2 second delay
    } else {
      fadeAnim.setValue(0);
      fadePlayingAnim.setValue(0);
    }
  }, [currentTrack?.item?.album?.images?.[0]?.url]);

  const startRadioStation = async (channel = selectedChannel) => {
    if (!accessToken) return;

    try {
      console.log('Starting startRadioStation');
      const spotifyApi = new SpotifyWebApi({
        accessToken: accessToken
      });

      const response = await spotifyApi.getRecommendations({
        seed_genres: channel.genres,
        limit: 50,
        min_energy: 0.4,
        min_popularity: 30
      });

      if (!response.body || !response.body.tracks) {
        throw new Error('No tracks received from Spotify');
      }

      const trackUris = response.body.tracks.map(track => track.uri);
      
      // Get current playback state
      const state = await spotifyApi.getMyCurrentPlaybackState();
      const deviceId = state.body?.device?.id;

      if (!deviceId) {
        throw new Error('No active Spotify device found');
      }

      // Start playing on the active device
      await spotifyApi.play({
        device_id: deviceId,
        uris: trackUris,
      });

    } catch (error) {
      console.error('Error starting radio station:', error);
      Alert.alert(
        'Playback Error',
        'Unable to start the radio station. Please make sure Spotify is active and try again.'
      );
    }
  };

  const playChannelIntro = async (channel = selectedChannel) => {
    if (isPlaying) return;
    setIsPlaying(true);

    try {
      console.log('Starting playChannelIntro');
      // Start radio station immediately and show current track
      await startRadioStation(channel);
      setIsChangingChannel(false);  // Allow track display immediately

      let audioPath: string;
      
      // Check if intro is cached
      const isCached = await AudioCache.hasIntro(channel.host.id);
      
      if (!isCached) {
        // Generate new intro if not cached
        const characterCount = channel.introText.length;
        const estimatedCredits = Math.ceil(characterCount / 4);
        const remainingCredits = 10000 - creditsUsed;
        
        if (estimatedCredits > remainingCredits) {
          Alert.alert('Credit Limit Warning', 'Not enough credits remaining for playback.');
          return;
        }

        const apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_11LABS_API_KEY;
        if (!apiKey) throw new Error('11Labs API key is not configured');

        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${channel.host.id}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': apiKey,
            },
            body: JSON.stringify({
              text: channel.introText,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5,
              },
              output_format: 'mp3',
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Save to cache
        const arrayBuffer = await response.arrayBuffer();
        await AudioCache.saveIntro(channel.host.id, arrayBuffer);
        incrementCredits(characterCount);
      }

      // Play the cached intro
      audioPath = AudioCache.getIntroPath(channel.host.id);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioPath },
        { shouldPlay: true }
      );
      
      // Wait for intro to finish
      await new Promise((resolve) => {
        sound.setOnPlaybackStatusUpdate(async (status: any) => {
          if (status && 'didJustFinish' in status && status.didJustFinish === true) {
            setIsPlaying(false);
            await sound.unloadAsync();
            resolve(null);
          }
        });
      });

    } catch (error) {
      console.error('Error in playChannelIntro:', error);
      setIsPlaying(false);
      Alert.alert('Error', 'Failed to play channel introduction');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.channelsGrid}>
        {RADIO_CHANNELS.map((channel) => (
          <Pressable
            key={channel.id}
            style={[
              styles.channelButton,
              selectedChannel.id !== channel.id && styles.inactiveChannel,
              selectedChannel.id === channel.id && styles.selectedChannel
            ]}
            onPress={() => handleChannelChange(channel)}
          >
            {!isChangingChannel && 
             currentTrack && 
             selectedChannel.id === channel.id && 
             currentTrack.item?.album?.images?.[0]?.url && (
              <>
                <Animated.Image
                  source={{ uri: currentTrack.item.album.images[0].url }}
                  style={[styles.backgroundImage, { opacity: fadeAnim }]}
                />
                <BlurView intensity={80} style={styles.blurContent} />
              </>
            )}
            <View style={styles.channelContent}>
              <View style={styles.channelInfo}>
                <ThemedText style={styles.channelName}>{channel.name}</ThemedText>
                <View style={styles.hostContainer}>
                  <Ionicons name="person" size={14} color="white" />
                  <ThemedText style={styles.hostName}>{channel.host.name}</ThemedText>
                </View>
                <ThemedText style={styles.description}>{channel.description}</ThemedText>
              </View>
              {!isChangingChannel && 
               currentTrack && 
               selectedChannel.id === channel.id && 
               currentTrack.item?.album?.images?.[0]?.url && (
                <Animated.View style={[styles.nowPlaying, { opacity: fadePlayingAnim }]}>
                  {currentTrack.item?.album?.images?.[0]?.url ? (
                    <Image
                      source={{ uri: currentTrack.item.album.images[0].url }}
                      style={styles.albumArt}
                    />
                  ) : (
                    <View style={[styles.albumArt, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                  )}
                  <ThemedText style={styles.trackName} numberOfLines={1}>
                    {currentTrack.item?.name}
                  </ThemedText>
                  <ThemedText style={styles.artistName} numberOfLines={1}>
                    {currentTrack.item?.artists[0].name}
                  </ThemedText>
                </Animated.View>
              )}
            </View>
            {isPlaying && selectedChannel.id === channel.id && (
              <View style={styles.playingIndicator}>
                <Ionicons name="radio" size={20} color="white" />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 800,
    padding: 16,
    paddingTop: 40,
  },
  channelsGrid: {
    width: '100%',
    gap: 12,
  },
  channelButton: {
    width: '100%',
    height: 130, // Default height
    padding: 16,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  inactiveChannel: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    opacity: 0.7,
  },
  selectedChannel: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  channelContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    zIndex: 1,
  },
  channelInfo: {
    flex: 1,
    marginRight: 16,
  },
  channelName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  hostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  hostName: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  description: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.8,
  },
  nowPlaying: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 2,
    borderRadius: 8,
    width: 100,
  },
  albumArt: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginBottom: 4,
  },
  trackName: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
    marginBottom: 2,
  },
  artistName: {
    fontSize: 9,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 11,
  },
  playingIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 6,
    borderRadius: 20,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: -2,
  },
  blurContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
}); 