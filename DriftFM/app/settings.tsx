import React, { useState, useEffect } from 'react';
import { StyleSheet, Switch, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useUser } from './context/UserContext';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { user } = useUser();
  const [locationEnabled, setLocationEnabled] = useState(false);

  // Check location permission status on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationEnabled(status === 'granted');
  };

  const toggleLocation = async () => {
    if (locationEnabled) {
      // If enabled, prompt user to disable in settings
      await Location.getForegroundPermissionsAsync();
    } else {
      // If disabled, request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationEnabled(status === 'granted');
    }
  };

  const requestLocationPermission = async () => {
    // Remove any stored permission status
    await AsyncStorage.removeItem('locationPermissionDenied');
    // Request permission again
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationEnabled(status === 'granted');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.section}>
        <ThemedView style={styles.sectionHeader}>
          <Ionicons name="musical-notes" size={20} color="#1DB954" />
          <ThemedText style={styles.sectionTitle}>Spotify Connection</ThemedText>
        </ThemedView>
        <ThemedView style={styles.sectionContent}>
          <ThemedView style={styles.row}>
            <ThemedText style={styles.label}>Status</ThemedText>
            <ThemedView style={[styles.statusBadge, { backgroundColor: user ? '#1DB95420' : '#ff444420' }]}>
              <ThemedText style={[styles.statusText, { color: user ? '#1DB954' : '#ff4444' }]}>
                {user ? 'Connected' : 'Not Connected'}
              </ThemedText>
            </ThemedView>
          </ThemedView>
          {user && (
            <ThemedText style={styles.detail}>
              Connected as: {user.displayName}
            </ThemedText>
          )}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedView style={styles.sectionHeader}>
          <Ionicons name="location" size={20} color="#1DB954" />
          <ThemedText style={styles.sectionTitle}>Location Services</ThemedText>
        </ThemedView>
        <ThemedView style={styles.sectionContent}>
          <ThemedView style={styles.row}>
            <ThemedText style={styles.label}>Enable Location</ThemedText>
            <Switch
              value={locationEnabled}
              onValueChange={toggleLocation}
              trackColor={{ false: '#76757720', true: '#1DB95420' }}
              thumbColor={locationEnabled ? '#1DB954' : '#767577'}
              ios_backgroundColor="#76757720"
            />
          </ThemedView>
          {!locationEnabled && (
            <TouchableOpacity 
              style={styles.button}
              onPress={requestLocationPermission}
            >
              <ThemedText style={styles.buttonText}>
                Request Location Permission
              </ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  sectionContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detail: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#1DB954',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
}); 