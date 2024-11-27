import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/app/firebaseConfig';

interface User {
  spotifyId: string;
  displayName: string;
  profileImage?: string;
  lastRadioId?: number;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  updateLastRadio: (radioId: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        }
      }
    };
    loadUser();
  }, []);

  const updateLastRadio = async (radioId: number) => {
    if (!user?.spotifyId) return;

    try {
      await setDoc(doc(db, 'users', user.spotifyId), {
        lastRadioId: radioId
      }, { merge: true });

      setUser(prev => prev ? { ...prev, lastRadioId: radioId } : null);

      await AsyncStorage.setItem('lastRadioId', radioId.toString());
    } catch (error) {
      console.error('Error updating last radio:', error);
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateLastRadio }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserProvider; 