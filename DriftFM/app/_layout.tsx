import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/app/firebaseConfig';

import { useColorScheme } from '@/hooks/useColorScheme';
import { UserProvider, useUser } from './context/UserContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function HeaderLeft() {
  const { user } = useUser();
  const router = useRouter();
  const colorScheme = useColorScheme();
  
  return (
    <Pressable onPress={() => router.push(user ? '/profile' : '/login')}>
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

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Check if user exists in Firestore
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get last logged in user ID from storage
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          setIsLoggedIn(userDoc.exists());
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <UserProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen 
            name="(tabs)" 
            options={{
              headerShown: true,
              headerLeft: () => <HeaderLeft />,
              headerRight: () => (
                <Pressable onPress={() => router.push('/settings')}>
                  <Ionicons 
                    name="settings-outline" 
                    size={24} 
                    color={colorScheme === 'dark' ? 'white' : 'black'} 
                    style={{ marginRight: 16 }}
                  />
                </Pressable>
              ),
              headerTitle: 'DriftFM'
            }} 
          />
          <Stack.Screen name="+not-found" />
          <Stack.Screen 
            name="login" 
            options={{ 
              presentation: 'modal',
              headerTitle: 'Login'
            }} 
          />
          <Stack.Screen 
            name="settings" 
            options={{ 
              presentation: 'modal',
              headerTitle: 'Settings'
            }} 
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </UserProvider>
  );
}
