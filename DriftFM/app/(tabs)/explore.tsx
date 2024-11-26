import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Dimensions, TextInput, View, TouchableOpacity, FlatList } from 'react-native';
import MapView, { Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

interface RoutePoint {
  latitude: number;
  longitude: number;
}

interface TurnInstruction {
  text: string;
  distance: string;
}

interface RouteStep {
  maneuver: {
    instruction: string;
  };
  distance: number;
}

// Add debounce utility to prevent too many API calls
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);
  const [routeDistance, setRouteDistance] = useState<string>('');
  const [turnInstructions, setTurnInstructions] = useState<TurnInstruction[]>([]);
  const [showDirections, setShowDirections] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const getLocation = async () => {
    try {
      // Request permissions first
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      // Get current position
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation(currentLocation);

      // Animate map to user location
      if (mapRef.current && currentLocation) {
        mapRef.current.animateToRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Error getting location');
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  // Update searchLocation to be called automatically
  useEffect(() => {
    if (debouncedSearchQuery.length >= 3) {
      searchLocation();
    } else {
      setShowResults(false);
    }
  }, [debouncedSearchQuery]);

  const searchLocation = async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedSearchQuery)}&limit=5`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(data.length > 0);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const getDirections = async (startLat: number, startLon: number, endLat: number, endLon: number) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`
      );
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        // Set route coordinates
        const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0]
        }));
        setRouteCoordinates(coordinates);
        
        // Set distance
        const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
        setRouteDistance(`${distanceKm} km`);

        // Process turn-by-turn instructions
        const instructions = data.routes[0].legs[0].steps.map((step: RouteStep) => ({
          text: step.maneuver.instruction,
          distance: `${(step.distance / 1000).toFixed(1)} km`
        }));
        setTurnInstructions(instructions);
        setShowDirections(true);
      }
    } catch (error) {
      console.error('Error getting directions:', error);
    }
  };

  const clearRoute = () => {
    setRouteCoordinates([]);
    setRouteDistance('');
    setTurnInstructions([]);
    setShowDirections(false);
  };

  const handleSelectLocation = async (item: SearchResult) => {
    const destLat = parseFloat(item.lat);
    const destLon = parseFloat(item.lon);

    if (location) {
      await getDirections(
        location.coords.latitude,
        location.coords.longitude,
        destLat,
        destLon
      );
    }

    mapRef.current?.animateToRegion({
      latitude: destLat,
      longitude: destLon,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 1000);

    setShowResults(false);
    setSearchQuery('');
  };

  const startNavigation = () => {
    setIsNavigating(true);
    setCurrentStep(0);
    setShowDirections(true);
  };

  const nextStep = () => {
    if (currentStep < turnInstructions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const endNavigation = () => {
    setIsNavigating(false);
    clearRoute();
  };

  if (errorMsg) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>{errorMsg}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search location..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity 
          style={[
            styles.searchButton,
            { opacity: searchQuery.length < 3 ? 0.5 : 1 }
          ]} 
          onPress={searchLocation}
          disabled={searchQuery.length < 3}
        >
          <Ionicons name="search" size={24} color="#1DB954" />
        </TouchableOpacity>
      </View>

      {showResults && searchResults.length > 0 && (
        <FlatList
          data={searchResults}
          style={styles.resultsList}
          keyExtractor={(item) => item.place_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleSelectLocation(item)}
            >
              <ThemedText numberOfLines={2}>{item.display_name}</ThemedText>
            </TouchableOpacity>
          )}
        />
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={true}
        initialRegion={{
          latitude: location?.coords.latitude ?? 37.78825,
          longitude: location?.coords.longitude ?? -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#1DB954"
            strokeWidth={3}
          />
        )}
      </MapView>

      {routeDistance && !showDirections && (
        <TouchableOpacity 
          style={styles.directionsButton}
          onPress={() => setShowDirections(true)}
        >
          <ThemedText style={styles.directionsButtonText}>
            Show Directions
          </ThemedText>
        </TouchableOpacity>
      )}

      {showDirections && (
        <View style={styles.directionsContainer}>
          <View style={styles.directionsHeader}>
            <ThemedText style={styles.directionsTitle}>
              {isNavigating ? 'Current Direction' : 'Overview'}
            </ThemedText>
            <TouchableOpacity onPress={endNavigation}>
              <Ionicons name="close-circle" size={24} color="#ff4444" />
            </TouchableOpacity>
          </View>
          
          {isNavigating ? (
            <View style={styles.currentDirectionContainer}>
              <ThemedText style={styles.currentDirectionText}>
                {turnInstructions[currentStep].text}
              </ThemedText>
              <ThemedText style={styles.currentDirectionDistance}>
                {turnInstructions[currentStep].distance}
              </ThemedText>
              {currentStep < turnInstructions.length - 1 && (
                <TouchableOpacity 
                  style={styles.nextButton}
                  onPress={nextStep}
                >
                  <ThemedText style={styles.nextButtonText}>Next</ThemedText>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <FlatList
                data={turnInstructions}
                style={styles.directionsList}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                  <View style={styles.directionItem}>
                    <ThemedText style={styles.directionText}>{item.text}</ThemedText>
                    <ThemedText style={styles.directionDistance}>{item.distance}</ThemedText>
                  </View>
                )}
              />
              <TouchableOpacity 
                style={styles.startNavigationButton}
                onPress={startNavigation}
              >
                <ThemedText style={styles.startNavigationText}>
                  Start Navigation
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {routeDistance && !showDirections && (
        <View style={styles.distanceContainer}>
          <ThemedText style={styles.distanceText}>
            Distance: {routeDistance}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: 'white',
    paddingHorizontal: 12,
    fontSize: 16,
  },
  searchButton: {
    padding: 8,
  },
  resultsList: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    zIndex: 1,
    maxHeight: 200,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  distanceContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 8,
  },
  distanceText: {
    color: 'white',
    fontSize: 16,
  },
  directionsButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  directionsButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  directionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  directionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  directionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  directionsList: {
    flex: 1,
  },
  directionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  directionText: {
    flex: 1,
    marginRight: 12,
  },
  directionDistance: {
    opacity: 0.7,
  },
  currentDirectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  currentDirectionText: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  currentDirectionDistance: {
    fontSize: 18,
    opacity: 0.7,
    marginBottom: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  startNavigationButton: {
    backgroundColor: '#1DB954',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  startNavigationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
