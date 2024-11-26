import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/app/firebaseConfig';
import { useUser } from './context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

// Spotify OAuth endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

// Add function to fetch Spotify profile
async function getSpotifyProfile(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.json();
}

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useUser();

  const redirectUri = 'driftfm://spotify-auth';

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
      scopes: [
        'user-read-email',
        'playlist-modify-public',
        'user-read-private',
        'user-read-playback-state',
        'user-read-currently-playing',
        'user-modify-playback-state',
        'streaming'
      ],
      redirectUri,
      responseType: 'code',
      usePKCE: true,
      extraParams: {
        show_dialog: 'true'
      },
    },
    discovery
  );

  const createUserRecord = async (spotifyCode: string) => {
    try {
      console.log('Exchanging code for token...', spotifyCode);
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: spotifyCode,
          redirect_uri: redirectUri,
          client_id: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
          client_secret: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET!,
          code_verifier: request?.codeVerifier || '',
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('Token received:', tokenData);
      const { access_token } = tokenData;
      await AsyncStorage.setItem('spotifyAccessToken', access_token);
      const profile = await getSpotifyProfile(access_token);
      
      await setDoc(doc(db, 'users', profile.id), {
        spotifyId: profile.id,
        displayName: profile.display_name,
        email: profile.email,
        profileImage: profile.images?.[0]?.url,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        provider: 'spotify'
      });

      await AsyncStorage.setItem('userId', profile.id);
      setUser({
        spotifyId: profile.id,
        displayName: profile.display_name,
        profileImage: profile.images?.[0]?.url,
      });

      console.log('User record created:', profile.id);
    } catch (error) {
      console.error('Error creating user record:', error);
    }
  };

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      createUserRecord(code);
      router.back();
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <Button
        disabled={!request}
        title="Login with Spotify"
        onPress={() => promptAsync()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 