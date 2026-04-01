import {
  View,
  Text,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BASE_URL, GOOGLE_MAPS_API_KEY } from '../config/config';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatePicker from 'react-native-date-picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import GetLocation from 'react-native-get-location';
import { promptForEnableLocationIfNeeded } from 'react-native-android-location-enabler';
import { Keyboard } from 'react-native';

const RideBookingPage = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [departing, setDeparting] = React.useState(new Date().toISOString().split('T')[0]);
  const [passengers, setPassengers] = React.useState('2');
  const [userData, setUserData] = React.useState(null);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;
      const response = await axios.get(`${BASE_URL}notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Error fetching unread count:', error);
    }
  };

  // Autocomplete State
  const [fromSuggestions, setFromSuggestions] = React.useState([]);
  const [toSuggestions, setToSuggestions] = React.useState([]);
  const [recentLocations, setRecentLocations] = React.useState([]);
  const [focusedInput, setFocusedInput] = React.useState(null);

  const loadRecentLocations = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      let locationsSet = new Set();
      let locations = [];

      // Fetch Past Bookings History from Server (Like Uber)
      if (token) {
        try {
          const resp = await axios.get(`${BASE_URL}my-bookings`, { headers: { Authorization: `Bearer ${token}` } });
          // Backend returns { status: true, data: { bookings: [...] } }
          if (resp.data?.status === true && resp.data.data?.bookings) {
            resp.data.data.bookings.forEach(booking => {
              if (booking.location && booking.location !== 'N/A') locationsSet.add(booking.location);
              if (booking.destination && booking.destination !== 'N/A') locationsSet.add(booking.destination);
            });
          }
        } catch (err) {
          console.warn('Could not fetch booking history', err);
        }
      }

      // Merge with Local Current Device Searches
      const stored = await AsyncStorage.getItem('@recent_locations');
      if (stored) {
        let localLocs = [];
        try {
          localLocs = JSON.parse(stored);
        } catch (e) { }

        localLocs.forEach(loc => {
          // Support both old object format and new string format
          const parseLoc = typeof loc === 'string' ? loc : loc?.description;
          if (parseLoc) locationsSet.add(parseLoc);
        });
      }

      // Format for UI
      locations = Array.from(locationsSet).slice(0, 8).map(loc => ({ description: loc, isRecent: true }));
      setRecentLocations(locations);

    } catch (e) {
      console.error("Failed to load recent locations", e);
    }
  };

  const saveRecentLocation = async (address) => {
    if (!address) return;
    try {
      let stored = await AsyncStorage.getItem('@recent_locations');
      let localLocs = stored ? JSON.parse(stored) : [];
      localLocs = localLocs.filter(loc => loc !== address);
      localLocs.unshift(address);
      if (localLocs.length > 5) localLocs = localLocs.slice(0, 5);
      await AsyncStorage.setItem('@recent_locations', JSON.stringify(localLocs));
      // Reload in background so the list is updated
      loadRecentLocations();
    } catch (e) { }
  };

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

      // Prompt to enable GPS if on Android
      if (Platform.OS === 'android') {
        try {
          await promptForEnableLocationIfNeeded({
            interval: 10000,
            fastInterval: 5000,
          });
        } catch (err) {
          console.log("GPS Enable Prompt Error/Cancel:", err);
          // If user cancels, we still try to get location, but it will likely fail 
          // react-native-get-location will handle the error.
        }
      }

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
      fetchUnreadCount();
      loadRecentLocations();
    }, [])
  );

  const fetchSuggestions = async (query, type) => {
    // Show recent history if query is empty or too short (Like Uber's Click behavior)
    if (!query || query.length < 2) {
      if (type === 'from') setFromSuggestions(recentLocations);
      if (type === 'to') setToSuggestions(recentLocations);
      return;
    }

    try {
      // Fetch from Google
      const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
        params: {
          input: query,
          key: GOOGLE_MAPS_API_KEY,
          components: 'country:in'
        }
      });
      const googleSuggestions = response.data.predictions || [];

      if (type === 'from') {
        setFromSuggestions(googleSuggestions);
      } else {
        setToSuggestions(googleSuggestions);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.warn("Autocomplete error:", error);
    }
  };

  const handleSelectSuggestion = async (item, type) => {
    const address = item.description;

    // Dismiss keyboard and clear suggestions first to avoid overlaps
    Keyboard.dismiss();
    setFocusedInput(null);
    setFromSuggestions([]);
    setToSuggestions([]);

    // Save to Local history immediately
    saveRecentLocation(address);

    if (type === 'from') {
      setFrom(address);
    } else {
      setTo(address);
    }

    try {
      const params = item.place_id ? { place_id: item.place_id, key: GOOGLE_MAPS_API_KEY } : { address: item.description, key: GOOGLE_MAPS_API_KEY };
      const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, { params });

      if (response.data.results && response.data.results.length > 0) {
        const { lat, lng } = response.data.results[0].geometry.location;
        const newCoords = {
          latitude: lat,
          longitude: lng,
        };

        if (type === 'from') {
          setFromMarker(newCoords);
        } else {
          setToMarker(newCoords);
        }

        // Smoothly animate map to the new location instead of forcing region prop
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            ...newCoords,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error("Geocoding error:", error);
    }
  };

  const handleSearch = async () => {
    try {
      if (from) saveRecentLocation(from);
      if (to) saveRecentLocation(to);

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
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      Alert.alert('Error', 'Failed to search rides.');
    }
  };

  const renderSuggestionItem = (item, type) => {
    const isRecent = item.isRecent;
    const descString = typeof item.description === 'string' ? item.description : String(item.description || '');

    // Split address for Uber-like Title and Subtitle
    const parts = descString.split(',');
    const title = parts[0]?.trim() || '';
    const subtitle = parts.slice(1).join(',').trim();

    return (
      <TouchableOpacity
        key={item.place_id || descString + Math.random()}
        style={styles.suggestionItem}
        onPress={() => handleSelectSuggestion(item, type)}
      >
        <View style={styles.suggestionIconWrapper}>
          <Icon name={isRecent ? "history" : "map-marker-outline"} size={22} color={isRecent ? "#777" : "#1fa000"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.suggestionTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.suggestionSubText} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#1fa000" translucent={false} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerContainer}>
            <Image source={require('../asset/Image/Ellipse.png')} style={styles.bgImage} />
            <TouchableOpacity
              style={[styles.bellButton, { top: verticalScale(10) + insets.top }]}
              onPress={() => navigation.navigate('Inbox')}
            >
              <Icon name="bell" size={28} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={[styles.title, { marginTop: verticalScale(20) + insets.top }]}>Pick your ride at lowest{'\n'}prices</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>From</Text>
            <View style={{ zIndex: 20, marginBottom: 10 }}>
              <View style={styles.row}>
                <TextInput
                  placeholder="Pickup Point"
                  style={[styles.input, { flex: 1 }, focusedInput === 'from' && { borderColor: '#1fa000', borderWidth: 1.5 }]}
                  value={from}
                  onFocus={() => { setFocusedInput('from'); fetchSuggestions(from, 'from'); }}
                  onChangeText={(text) => { setFrom(text); fetchSuggestions(text, 'from'); }}
                />
                <TouchableOpacity style={styles.locationBtn} onPress={getCurrentLocation} disabled={loadingLocation}>
                  <Icon name={loadingLocation ? "sync" : "crosshairs-gps"} size={scale(22)} color="#1fa000" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.swapBtn} onPress={() => {
                  const t = from; setFrom(to); setTo(t);
                  const tm = fromMarker; setFromMarker(toMarker); setToMarker(tm);
                }}>
                  <Icon name="swap-vertical" size={scale(22)} color="#fff" />
                </TouchableOpacity>
              </View>
              {focusedInput === 'from' && fromSuggestions.length > 0 && (
                <View style={[styles.suggestionsContainer, { zIndex: 9999 }]}>
                  <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled={true}>
                    {fromSuggestions.map((item, index) => renderSuggestionItem(item, 'from'))}
                  </ScrollView>
                </View>
              )}
            </View>

            <Text style={styles.label}>To</Text>
            <View style={{ zIndex: 10, marginBottom: 10 }}>
              <TextInput
                placeholder="Drop Point"
                style={[styles.input, focusedInput === 'to' && { borderColor: '#1fa000', borderWidth: 1.5 }]}
                value={to}
                onFocus={() => { setFocusedInput('to'); fetchSuggestions(to, 'to'); }}
                onChangeText={(text) => { setTo(text); fetchSuggestions(text, 'to'); }}
              />
              {focusedInput === 'to' && toSuggestions.length > 0 && (
                <View style={[styles.suggestionsContainer, { zIndex: 9999 }]}>
                  <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled={true}>
                    {toSuggestions.map((item, index) => renderSuggestionItem(item, 'to'))}
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
                <DatePicker
                  modal
                  mode="date"
                  open={open}
                  date={date}
                  minimumDate={new Date()}
                  onConfirm={(d) => { setOpen(false); setDate(d); setDeparting(d.toISOString().split('T')[0]); }}
                  onCancel={() => setOpen(false)}
                />
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

          <View style={[styles.mapContainer, { height: verticalScale(220), marginBottom: verticalScale(80) }]}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={region}
              onRegionChangeComplete={(reg) => setRegion(reg)}
            >
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
        </View>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="home" size={scale(32)} color="#fff" />
          <Text style={styles.bottomText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Publish")}>
          <Icon name="plus" size={scale(32)} color="#fff" />
          <Text style={styles.bottomText}>Publish</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("YourRides")}>
          <Icon name="car" size={scale(32)} color="#fff" />
          <Text style={styles.bottomText}>Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Icon name="account" size={scale(32)} color="#fff" />
          <Text style={styles.bottomText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default RideBookingPage;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { width: '100%', height: verticalScale(220), justifyContent: 'center', alignItems: 'center' },
  bgImage: { width: '100%', height: verticalScale(240), position: 'absolute', resizeMode: 'cover' },
  title: { color: '#fff', fontSize: responsiveFontSize(22), fontWeight: '700', textAlign: 'center', marginTop: verticalScale(20) },
  card: { width: '85%', backgroundColor: '#fff', alignSelf: 'center', marginTop: verticalScale(-50), borderRadius: moderateScale(15), padding: moderateScale(15), elevation: 15, zIndex: 100 },
  label: { fontSize: responsiveFontSize(13), color: '#555', marginBottom: verticalScale(5) },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: moderateScale(10), height: verticalScale(45), paddingHorizontal: scale(10), marginBottom: verticalScale(10) },
  swapBtn: { backgroundColor: '#1fa000', width: scale(40), height: scale(40), borderRadius: scale(20), justifyContent: 'center', alignItems: 'center', marginLeft: scale(10) },
  smallRow: { flexDirection: 'row', justifyContent: 'space-between' },
  smallBox: { width: '48%' },
  smallInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: moderateScale(10), height: verticalScale(45), paddingHorizontal: scale(10) },
  searchBtn: { backgroundColor: '#1fa000', paddingVertical: verticalScale(14), borderRadius: moderateScale(10), marginTop: verticalScale(15) },
  searchText: { color: '#fff', fontSize: responsiveFontSize(16), fontWeight: '700', textAlign: 'center' },
  map: { width: '100%', height: '100%' },
  mapContainer: { width: '88%', height: verticalScale(180), borderRadius: moderateScale(12), alignSelf: 'center', marginTop: verticalScale(15), overflow: 'hidden', elevation: 5, backgroundColor: '#eee' },
  bottomBar: { position: 'absolute', bottom: verticalScale(20), left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', backgroundColor: '#1fa000', paddingVertical: verticalScale(10), marginHorizontal: scale(40), borderRadius: moderateScale(30), elevation: 10, marginBottom: verticalScale(25) },
  bottomText: { color: '#fff', fontSize: responsiveFontSize(12), textAlign: 'center', marginTop: verticalScale(4) },

  suggestionsContainer: {
    position: 'absolute',
    top: verticalScale(50),
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: moderateScale(12),
    elevation: 25,
    zIndex: 9999,
    maxHeight: verticalScale(300),
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8'
  },
  suggestionIconWrapper: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(15)
  },
  suggestionTitle: {
    fontSize: responsiveFontSize(15),
    color: '#333',
    fontWeight: 'bold'
  },
  suggestionSubText: {
    fontSize: responsiveFontSize(12),
    color: '#888',
    marginTop: 2
  },
  suggestionText: { fontSize: responsiveFontSize(14), color: '#333', flex: 1 },

  locationBtn: { paddingHorizontal: scale(10), justifyContent: 'center', alignItems: 'center', height: verticalScale(45), marginBottom: verticalScale(10) },
  bellButton: {
    position: 'absolute',
    right: scale(20),
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: '#fff'
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold'
  }
});

