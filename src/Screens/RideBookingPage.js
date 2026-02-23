import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
  PermissionsAndroid
} from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BASE_URL, GOOGLE_MAPS_API_KEY } from '../config/config';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatePicker from 'react-native-date-picker';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import GetLocation from 'react-native-get-location';

const RideBookingPage = () => {
  const navigation = useNavigation();
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [departing, setDeparting] = React.useState(new Date().toISOString().split('T')[0]);
  const [passengers, setPassengers] = React.useState('2');
  const [userData, setUserData] = React.useState(null);

  // Autocomplete State
  const [fromSuggestions, setFromSuggestions] = React.useState([]);
  const [toSuggestions, setToSuggestions] = React.useState([]);

  // Date Picker State
  const [date, setDate] = React.useState(new Date());
  const [open, setOpen] = React.useState(false);

  // Map State
  const [region, setRegion] = React.useState({
    latitude: 28.6139,
    longitude: 77.2090, // Default to Delhi
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [fromMarker, setFromMarker] = React.useState(null);
  const [toMarker, setToMarker] = React.useState(null);
  const mapRef = React.useRef(null);
  const [loadingLocation, setLoadingLocation] = React.useState(false);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        return (
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.ACCESS_COARSE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn("Permission Error:", err);
        return false;
      }
    }
    return false;
  };

  const getCurrentLocation = async () => {
    console.log("GPS Button Clicked (GetLocation)");
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert("Permission Error", "Please allow location access in settings.");
        return;
      }

      setLoadingLocation(true);

      GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 60000,
      })
        .then(location => {
          console.log("Got Location:", location);
          const { latitude, longitude } = location;

          setFromMarker({ latitude, longitude });
          setRegion({
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });

          // Fetch Address
          axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
            params: {
              latlng: `${latitude},${longitude}`,
              key: GOOGLE_MAPS_API_KEY
            }
          }).then(res => {
            if (res.data && res.data.results && res.data.results.length > 0) {
              setFrom(res.data.results[0].formatted_address);
            }
          }).catch(e => console.log("Geocode Error", e))
            .finally(() => setLoadingLocation(false));

          if (mapRef.current) {
            try {
              mapRef.current.animateToRegion({
                latitude,
                longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }, 1000);
            } catch (mapErr) {
              console.log("Map Animation Error", mapErr);
            }
          }
        })
        .catch(error => {
          const { code, message } = error;
          console.log("GetLocation Error:", code, message);
          setLoadingLocation(false);
          Alert.alert("Location Issue", message || "Could not fetch location.");
        });
    } catch (err) {
      console.log("System Crash Prevented:", err);
      setLoadingLocation(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const getUserData = async () => {
        const storedUser = await AsyncStorage.getItem('user_data');
        if (storedUser) {
          setUserData(JSON.parse(storedUser));
        }
      };
      getUserData();
    }, [])
  );

  const fetchSuggestions = async (query, type) => {
    if (query.length < 3) {
      if (type === 'from') setFromSuggestions([]);
      if (type === 'to') setToSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
        params: {
          input: query,
          key: GOOGLE_MAPS_API_KEY,
          components: 'country:in'
        }
      });

      if (type === 'from') {
        setFromSuggestions(response.data.predictions || []);
      } else {
        setToSuggestions(response.data.predictions || []);
      }
    } catch (error) {
      console.warn("Autocomplete error:", error);
    }
  };

  const handleSelectSuggestion = async (item, type) => {
    const address = item.description;
    if (type === 'from') {
      setFrom(address);
      setFromSuggestions([]);
    } else {
      setTo(address);
      setToSuggestions([]);
    }

    try {
      const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
        params: {
          place_id: item.place_id,
          key: GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.results && response.data.results.length > 0) {
        const { lat, lng } = response.data.results[0].geometry.location;
        const newRegion = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setRegion(newRegion);
        if (type === 'from') {
          setFromMarker({ latitude: lat, longitude: lng });
        } else {
          setToMarker({ latitude: lat, longitude: lng });
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await axios.post(`${BASE_URL}search-ride`, {
        from,
        to,
        departing,
        passengers,
      });

      if (response.data.status) {
        navigation.navigate('TabNavigation', {
          screen: 'Home',
          params: { searchData: response.data }
        });
      } else {
        Alert.alert('No rides', 'No rides available for this route.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search rides.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1fa000" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
          <View style={styles.headerContainer}>
            <Image source={require('../asset/Image/Ellipse.png')} style={styles.bgImage} />
            <Text style={styles.title}>Pick your ride at lowest{'\n'}prices</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>From</Text>
            <View style={{ zIndex: 20, marginBottom: 10 }}>
              <View style={styles.row}>
                <TextInput
                  placeholder="Pickup Point"
                  style={styles.input}
                  value={from}
                  onChangeText={(text) => { setFrom(text); fetchSuggestions(text, 'from'); }}
                />
                <TouchableOpacity style={styles.locationBtn} onPress={getCurrentLocation} disabled={loadingLocation}>
                  <Icon name={loadingLocation ? "sync" : "crosshairs-gps"} size={22} color="#1fa000" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.swapBtn} onPress={() => {
                  const t = from; setFrom(to); setTo(t);
                  const tm = fromMarker; setFromMarker(toMarker); setToMarker(tm);
                }}>
                  <Icon name="swap-vertical" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              {fromSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView keyboardShouldPersistTaps="always">
                    {fromSuggestions.map((item, index) => (
                      <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item, 'from')}>
                        <Icon name="map-marker-outline" size={16} color="#555" style={{ marginRight: 8 }} />
                        <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <Text style={styles.label}>To</Text>
            <View style={{ zIndex: 10, marginBottom: 10 }}>
              <TextInput
                placeholder="Drop Point"
                style={styles.input}
                value={to}
                onChangeText={(text) => { setTo(text); fetchSuggestions(text, 'to'); }}
              />
              {toSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView keyboardShouldPersistTaps="always">
                    {toSuggestions.map((item, index) => (
                      <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item, 'to')}>
                        <Icon name="map-marker-outline" size={16} color="#555" style={{ marginRight: 8 }} />
                        <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.smallRow}>
              <View style={styles.smallBox}>
                <Text style={styles.label}>Departing</Text>
                <TouchableOpacity onPress={() => setOpen(true)} style={styles.smallInput}>
                  <Text style={{ marginTop: 12 }}>{departing}</Text>
                </TouchableOpacity>
                <DatePicker modal mode="date" open={open} date={date} onConfirm={(d) => { setOpen(false); setDate(d); setDeparting(d.toISOString().split('T')[0]); }} onCancel={() => setOpen(false)} />
              </View>
              <View style={styles.smallBox}>
                <Text style={styles.label}>Passengers</Text>
                <TextInput style={styles.smallInput} value={passengers} onChangeText={setPassengers} keyboardType="numeric" />
              </View>
            </View>

            <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
              <Text style={styles.searchText}>Search</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            <MapView ref={mapRef} style={styles.map} region={region} onRegionChangeComplete={setRegion}>
              {fromMarker && <Marker coordinate={fromMarker} title="From" pinColor="green" />}
              {toMarker && <Marker coordinate={toMarker} title="To" pinColor="red" />}
              {fromMarker && toMarker && (
                <MapViewDirections
                  origin={fromMarker}
                  destination={toMarker}
                  apikey={GOOGLE_MAPS_API_KEY}
                  strokeWidth={4}
                  strokeColor="#1fa000"
                  onReady={(res) => {
                    mapRef.current.fitToCoordinates(res.coordinates, {
                      edgePadding: { right: 40, bottom: 40, left: 40, top: 40 }
                    });
                  }}
                />
              )}
            </MapView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="home" size={32} color="#fff" />
          <Text style={styles.bottomText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Publish")}>
          <Icon name="plus" size={32} color="#fff" />
          <Text style={styles.bottomText}>Publish</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("YourRides")}>
          <Icon name="car" size={32} color="#fff" />
          <Text style={styles.bottomText}>Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Icon name="account" size={32} color="#fff" />
          <Text style={styles.bottomText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default RideBookingPage;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { width: '100%', height: 220, justifyContent: 'center', alignItems: 'center' },
  bgImage: { width: '100%', height: 240, position: 'absolute', resizeMode: 'cover' },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 20 },
  card: { width: '85%', backgroundColor: '#fff', alignSelf: 'center', marginTop: -40, borderRadius: 15, padding: 20, elevation: 10 },
  label: { fontSize: 13, color: '#555', marginBottom: 5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, height: 45, paddingHorizontal: 10, marginBottom: 10 },
  swapBtn: { backgroundColor: '#1fa000', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  smallRow: { flexDirection: 'row', justifyContent: 'space-between' },
  smallBox: { width: '48%' },
  smallInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, height: 45, paddingHorizontal: 10 },
  searchBtn: { backgroundColor: '#1fa000', paddingVertical: 14, borderRadius: 10, marginTop: 15 },
  searchText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  map: { width: '100%', height: '100%' },
  mapContainer: { width: '90%', height: 180, borderRadius: 12, alignSelf: 'center', marginTop: 25, overflow: 'hidden', elevation: 5, backgroundColor: '#eee' },
  bottomBar: { position: 'absolute', bottom: 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', backgroundColor: '#1fa000', paddingVertical: 10, marginHorizontal: 40, borderRadius: 30, elevation: 10 },
  bottomText: { color: '#fff', fontSize: 12, textAlign: 'center', marginTop: 4 },
  suggestionsContainer: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 8, elevation: 20, zIndex: 1000, maxHeight: 200, borderWidth: 1, borderColor: '#ddd' },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  suggestionText: { fontSize: 14, color: '#333', flex: 1 },
  locationBtn: { paddingHorizontal: 10, justifyContent: 'center', alignItems: 'center', height: 45, marginBottom: 10 },
});
