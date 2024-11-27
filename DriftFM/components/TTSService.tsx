import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Platform, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { useTTS } from '../app/context/TTSContext';
import { Ionicons } from '@expo/vector-icons';

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
    introText: "Pulse Underground, where the underground meets the mainstream. Maya here, keeping you locked in with the freshest indie tracks."
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
    introText: "Bass Theory, your source for pure electronic energy. This is Riley, ready to drop the beats that'll shake your world."
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
    introText: "Welcome to the Velvet Lounge. Sofia here, bringing you the smoothest vibes in the city."
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
    introText: "Block Radio, straight from the streets to your speakers. It's your girl Jade, let's keep this party moving."
  }
];

export function TTSService() {
  const [selectedChannel, setSelectedChannel] = useState(RADIO_CHANNELS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const { creditsUsed, incrementCredits } = useTTS();

  const playChannelIntro = async (channel = selectedChannel) => {
    if (isPlaying) return;
    
    const characterCount = channel.introText.length;
    const estimatedCredits = Math.ceil(characterCount / 4);
    const remainingCredits = 10000 - creditsUsed;
    
    if (estimatedCredits > remainingCredits) {
      Alert.alert(
        'Credit Limit Warning',
        `Not enough credits remaining for playback.`
      );
      return;
    }
    
    setIsPlaying(true);
    try {
      const apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_11LABS_API_KEY;
      
      if (!apiKey) {
        throw new Error('11Labs API key is not configured');
      }

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

      if (Platform.OS === 'web') {
        const audioBlob = new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      } else {
        const fileUri = `${FileSystem.documentDirectory}temp_audio.mp3`;
        const audioData = await response.arrayBuffer();
        const uint8Array = new Uint8Array(audioData);
        const base64Data = btoa(
          uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: fileUri },
          { shouldPlay: true }
        );
        
        sound.setOnPlaybackStatusUpdate(async (status: any) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
            await sound.unloadAsync();
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
          }
        });
      }

      incrementCredits(characterCount);
    } catch (error) {
      console.error('Error in playChannelIntro:', error);
      setIsPlaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Radio Channels</ThemedText>
      <View style={styles.channelsGrid}>
        {RADIO_CHANNELS.map((channel) => (
          <Pressable
            key={channel.id}
            style={[
              styles.channelButton,
              { backgroundColor: channel.color },
              selectedChannel.id === channel.id && styles.selectedChannel
            ]}
            onPress={() => {
              setSelectedChannel(channel);
              playChannelIntro(channel);
            }}
          >
            <ThemedText style={styles.channelName}>{channel.name}</ThemedText>
            <ThemedText style={styles.hostName}>Host: {channel.host.name}</ThemedText>
            <ThemedText style={styles.description}>{channel.description}</ThemedText>
            {isPlaying && selectedChannel.id === channel.id && (
              <View style={styles.playingIndicator}>
                <Ionicons name="radio" size={24} color="white" />
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
    maxWidth: 500,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  channelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  channelButton: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  selectedChannel: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  channelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  hostName: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
  playingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
}); 