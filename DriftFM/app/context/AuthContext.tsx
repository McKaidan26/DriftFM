import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  refreshToken: string | null;
  refreshAccessToken: () => Promise<string | null>;
  getSpotifyAuthUrl: () => string;
}

const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative'
].join(' ');

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    const loadTokens = async () => {
      const storedAccessToken = await AsyncStorage.getItem('spotifyAccessToken');
      const storedRefreshToken = await AsyncStorage.getItem('spotifyRefreshToken');
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setIsAuthenticated(!!storedAccessToken);
    };
    loadTokens();
  }, []);

  const refreshAccessToken = async () => {
    if (!refreshToken) return null;

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
          client_secret: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET!,
        }).toString(),
      });

      const data = await response.json();
      const newAccessToken = data.access_token;
      await AsyncStorage.setItem('spotifyAccessToken', newAccessToken);
      setAccessToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  const getSpotifyAuthUrl = () => {
    return `https://accounts.spotify.com/authorize?${new URLSearchParams({
      response_type: 'code',
      client_id: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!,
      scope: SPOTIFY_SCOPES,
      redirect_uri: process.env.EXPO_PUBLIC_SPOTIFY_REDIRECT_URI!,
      show_dialog: 'true'
    }).toString()}`;
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        setIsAuthenticated,
        accessToken,
        setAccessToken,
        refreshToken,
        refreshAccessToken,
        getSpotifyAuthUrl
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 