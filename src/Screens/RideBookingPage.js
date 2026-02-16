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
  Platform
} from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BASE_URL } from '../config/config';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatePicker from 'react-native-date-picker';

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
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        headers: {
          'User-Agent': 'TravelApp/1.0',
          'Accept-Language': 'en'
        },
        params: {
          q: query,
          format: 'json',
          limit: 5,
          addressdetails: 1,
          countrycodes: 'in'
        }
      });

      console.log(`Autocomplete Response (${type}):`, response.data.length);
      if (type === 'from') {
        setFromSuggestions(response.data);
      } else {
        setToSuggestions(response.data);
      }
    } catch (error) {
      console.warn("Autocomplete error:", error);
    }
  };

  const handleSelectSuggestion = (item, type) => {
    // Used display_name directly as it provides the full address.
    // Can optionally split if only city is desired: item.display_name.split(',')[0]
    const address = item.display_name;
    if (type === 'from') {
      setFrom(address);
      setFromSuggestions([]);
    } else {
      setTo(address);
      setToSuggestions([]);
    }
  };

  const handleSearch = async () => {
    try {
      console.log('Searching rides with:', { from, to, departing, passengers });
      const response = await axios.post(`${BASE_URL}search-ride`, {
        from: from,
        to: to,
        departing: departing,
        passengers: passengers,
      });

      console.log('Search Response:', response.data);
      Alert.alert('Success', 'Search completed', [
        {
          text: 'OK',
          onPress: () => {
            if (response.data.status) {
              navigation.navigate('TabNavigation', {
                screen: 'Home',
                params: { searchData: response.data }
              });
            } else {
              Alert.alert('Error', 'No rides found or invalid response');
            }
          }
        }
      ]);

    } catch (error) {
      console.error('Search Error:', error);
      if (error.response) {
        console.error('Error Data:', error.response.data);
        Alert.alert('Error', error.response.data.message || 'Search failed.');
      } else if (error.request) {
        Alert.alert('Error', 'No response from server. Check your internet connection.');
      } else {
        Alert.alert('Error', 'An error occurred. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1fa000" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Image
              source={require('../asset/Image/Ellipse.png')}
              style={styles.bgImage}
            />
            <Text style={styles.title}>Pick your ride at lowest{'\n'}prices</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* From */}
            <Text style={styles.label}>From</Text>
            <View style={{ zIndex: 20, marginBottom: 10 }}>
              <View style={styles.row}>
                <TextInput
                  placeholder="Noida"
                  style={styles.input}
                  value={from}
                  onChangeText={(text) => {
                    setFrom(text);
                    fetchSuggestions(text, 'from');
                  }}
                />
                <TouchableOpacity style={styles.swapBtn} onPress={() => {
                  const temp = from; setFrom(to); setTo(temp);
                  setFromSuggestions([]); setToSuggestions([]);
                }}>
                  <Icon name="swap-vertical" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              {fromSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView keyboardShouldPersistTaps="always">
                    {fromSuggestions.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectSuggestion(item, 'from')}
                      >
                        <Icon name="map-marker-outline" size={16} color="#555" style={{ marginRight: 8 }} />
                        <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* To */}
            <Text style={styles.label}>To</Text>
            <View style={{ zIndex: 10, marginBottom: 10 }}>
              <TextInput
                placeholder="Agra"
                style={styles.input}
                value={to}
                onChangeText={(text) => {
                  setTo(text);
                  fetchSuggestions(text, 'to');
                }}
              />
              {toSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView keyboardShouldPersistTaps="always">
                    {toSuggestions.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectSuggestion(item, 'to')}
                      >
                        <Icon name="map-marker-outline" size={16} color="#555" style={{ marginRight: 8 }} />
                        <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Depart & Passenger */}
            <View style={[styles.smallRow, { zIndex: 1 }]}>
              <View style={styles.smallBox}>
                <Text style={styles.label}>Departing</Text>
                <TouchableOpacity onPress={() => setOpen(true)} style={[styles.smallInput, { justifyContent: 'center' }]}>
                  <Text style={{ color: '#000' }}>{departing}</Text>
                </TouchableOpacity>
                <DatePicker
                  modal
                  mode="date"
                  open={open}
                  date={date}
                  onConfirm={(date) => {
                    setOpen(false)
                    setDate(date)
                    setDeparting(date.toISOString().split('T')[0])
                  }}
                  onCancel={() => {
                    setOpen(false)
                  }}
                />
              </View>

              <View style={styles.smallBox}>
                <Text style={styles.label}>Passengers</Text>
                <TextInput
                  placeholder="2 Adult"
                  style={styles.smallInput}
                  value={passengers}
                  onChangeText={setPassengers}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSearch}
              style={[styles.searchBtn, { zIndex: 0 }]}
            >
              <Text style={styles.searchText}>Search</Text>
            </TouchableOpacity>
          </View>

          {/* Map */}
          <Image
            source={require('../asset/Image/Map.png')}
            style={styles.map}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Icon name="home" size={32} color="#fff" />
          <Text style={styles.bottomText}>Home</Text>
        </TouchableOpacity>

        {userData?.user_type === 'driver' && (
          <TouchableOpacity onPress={() => navigation.navigate("Publish")}>
            <Icon name="plus" size={32} color="#fff" />
            <Text style={styles.bottomText}>Publish</Text>
          </TouchableOpacity>
        )}

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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  headerContainer: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bgImage: {
    width: '100%',
    height: 240,
    position: 'absolute',
    resizeMode: 'cover',
  },

  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
  },

  card: {
    width: '85%',
    backgroundColor: '#fff',
    alignSelf: 'center',
    marginTop: -40,
    borderRadius: 15,
    padding: 20,
    elevation: 10,
  },

  label: {
    fontSize: 13,
    color: '#555',
    marginBottom: 5,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    height: 45,
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  swapBtn: {
    backgroundColor: '#1fa000',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // Added margin instead of absolute positioning for cleaner layout in the row
  },

  smallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  smallBox: {
    width: '48%',
  },

  smallInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    height: 45,
    paddingHorizontal: 10,
  },

  searchBtn: {
    backgroundColor: '#1fa000',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 15,
  },

  searchText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  map: {
    width: '90%',
    height: 180,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 25,
    resizeMode: 'cover',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    backgroundColor: '#1fa000',
    paddingVertical: 10,
    marginHorizontal: 40,
    borderRadius: 30,
    elevation: 10,
  },

  bottomText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },

  // Suggestion Styles
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 20, // Increased elevation for Android
    zIndex: 1000, // Explicit zIndex for iOS/others
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});
