import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { Pressable, Image, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/app/firebaseConfig';
import { useAuthRequest, makeRedirectUri } from 'expo-auth-session';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/useColorScheme';
import { UserProvider, useUser } from './context/UserContext';
import { SpotifyPlayer } from '@/components/SpotifyPlayer';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Add Spotify OAuth endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

function HeaderLeft() {
  const { user, setUser } = useUser();
  const router = useRouter();
  const colorScheme = useColorScheme();
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
      redirectUri: 'driftfm://spotify-auth',
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
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: spotifyCode,
          redirect_uri: 'driftfm://spotify-auth',
          client_id: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
          client_secret: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET!,
          code_verifier: request?.codeVerifier || '',
        }).toString(),
      });

      const tokenData = await tokenResponse.json();
      const { access_token } = tokenData;
      await AsyncStorage.setItem('spotifyAccessToken', access_token);

      const profile = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }).then(res => res.json());

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
    } catch (error) {
      console.error('Error creating user record:', error);
    }
  };

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      createUserRecord(code);
    }
  }, [response]);

  return (
    <Pressable onPress={() => user ? router.push('/profile') : promptAsync()}>
      {user?.profileImage ? (
        <Image 
          source={{ uri: user.profileImage }} 
          style={{ 
            width: 30, 
            height: 30, 
            borderRadius: 15,
            marginLeft: 16 
          }} 
        />
      ) : (
        <Ionicons 
          name="person-outline"
          size={24} 
          color={colorScheme === 'dark' ? 'white' : 'black'} 
          style={{ marginLeft: 16 }}
        />
      )}
    </Pressable>
  );
}

function HeaderRight() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [showExplore, setShowExplore] = useState(false);

  const toggleView = () => {
    setShowExplore(!showExplore);
    router.push(showExplore ? '/(tabs)' : '/(tabs)/explore');
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={toggleView} style={{ marginRight: 16 }}>
        <Ionicons 
          name={showExplore ? "musical-note" : "map"} 
          size={24} 
          color={colorScheme === 'dark' ? 'white' : 'black'} 
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/settings')}>
        <Ionicons 
          name="settings-outline" 
          size={24} 
          color={colorScheme === 'dark' ? 'white' : 'black'} 
          style={{ marginRight: 16 }}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <UserProvider>
          <RootLayoutContent />
        </UserProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Separate component for content that needs UserContext
function RootLayoutContent() {
  const { user } = useUser();
  
  // Check if user exists in Firestore
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          // Handle auth check without setIsLoggedIn
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    
    checkAuth();
  }, []);

  return (
    <>
      <Stack>
        <Stack.Screen 
          name="(tabs)" 
          options={{
            headerShown: true,
            headerLeft: () => <HeaderLeft />,
            headerRight: () => <HeaderRight />,
            headerTitle: 'DriftFM'
          }} 
        />
        <Stack.Screen name="+not-found" />
        <Stack.Screen 
          name="settings" 
          options={{ 
            presentation: 'modal',
            headerTitle: 'Settings'
          }} 
        />
      </Stack>
      {user && <SpotifyPlayer />}
      <StatusBar style="auto" />
    </>
  );
}
