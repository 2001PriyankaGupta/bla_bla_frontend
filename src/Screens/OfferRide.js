import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  Switch,
  StatusBar,
  Platform,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config/config';
import DatePicker from 'react-native-date-picker';

const OfferRide = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'offer'

  // Offer Ride Form State
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [dateTime, setDateTime] = useState(''); // Simple text input for now as per previous Request
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [seats, setSeats] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [showCarDropdown, setShowCarDropdown] = useState(false);
  const [luggage, setLuggage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // User Cars
  const [userCars, setUserCars] = useState([]);

  // My Rides List State
  const [myRides, setMyRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Autocomplete State
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);

  const fetchSuggestions = async (query, type) => {
    if (query.length < 3) {
      if (type === 'pickup') setPickupSuggestions([]);
      if (type === 'drop') setDropSuggestions([]);
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

      if (type === 'pickup') {
        setPickupSuggestions(response.data);
      } else {
        setDropSuggestions(response.data);
      }
    } catch (error) {
      console.warn("Autocomplete error:", error);
    }
  };

  const handleSelectSuggestion = (item, type) => {
    const address = item.display_name;
    if (type === 'pickup') {
      setPickup(address);
      setPickupSuggestions([]);
    } else {
      setDrop(address);
      setDropSuggestions([]);
    }
  };

  const fetchUserCars = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.get(`${BASE_URL}cars`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.status === true || response.status === 200) {
        setUserCars(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch Cars Error:', error);
    }
  };

  useEffect(() => {
    fetchUserCars();
  }, []);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      // GET request to rides endpoint
      const response = await axios.get(`${BASE_URL}rides`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Fetch Rides Response:', response.data);

      if (response.data.status === true || response.status === 200) {
        setMyRides(response.data.data || []);
      } else {
        // Handle empty or error
        setMyRides([]);
      }
    } catch (error) {
      console.error('Fetch Rides Error:', error);
      Alert.alert('Error', 'Failed to fetch your rides.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'list') {
        fetchRides();
      }
    }, [activeTab])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  const handleCreateRide = async () => {
    if (!pickup || !drop || !dateTime || !seats || !price || !selectedCarId) {
      Alert.alert('Error', 'Please fill all required fields and select a car.');
      return;
    }

    const selectedCar = userCars.find(c => c.id === selectedCarId);

    setSubmitting(true);
    const payload = {
      pickup_point: pickup,
      drop_point: drop,
      date_time: dateTime, // Format: 2025-11-11 08:00:00
      total_seats: parseInt(seats),
      price_per_seat: parseFloat(price),
      car_id: selectedCarId,
      car_make: selectedCar ? selectedCar.car_make : '',
      luggage_allowed: luggage,
      status: 'active'
    };

    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.post(`${BASE_URL}rides`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Create Ride Response:', response.data);

      if (response.data.status === true || response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Ride offered successfully!');
        // Reset Form
        setPickup(''); setDrop(''); setDateTime(''); setDate(new Date()); setSeats(''); setPrice(''); setLuggage(false); setSelectedCarId(null);
        // Switch to list
        setActiveTab('list');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to create ride.');
      }

    } catch (error) {
      console.error('Create Ride Error:', error);
      Alert.alert('Error', 'An error occurred while creating the ride.');
    } finally {
      setSubmitting(false);
    }
  };



  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: true
    });
  };

  const renderRideItem = ({ item }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() => navigation.navigate('RideDetails', { rideId: item.id })}
    >
      <View style={styles.rideCardHeader}>
        <View style={styles.routeContainer}>
          <Text style={styles.routeText}>{item.pickup_point}</Text>
          <Icon name="arrow-right" size={20} color="#777" style={{ marginHorizontal: 10 }} />
          <Text style={styles.routeText}>{item.drop_point}</Text>
        </View>
        <Text style={styles.priceText}>₹{item.price_per_seat}</Text>
      </View>

      <View style={styles.rideDetailsRow}>
        <View style={styles.detailItem}>
          <Icon name="calendar-clock" size={18} color="#248907" />
          <Text style={styles.detailText}>{formatDateTime(item.date_time)}</Text>
        </View>
      </View>

      <View style={styles.rideDetailsRow}>
        <View style={styles.detailItem}>
          <Icon name="car-seat" size={18} color="#555" />
          <Text style={styles.detailText}>{item.total_seats} Seats</Text>
        </View>

        {item.car && (
          <View style={[styles.detailItem, { marginLeft: 15 }]}>
            <Icon name="car" size={18} color="#555" />
            <Text style={styles.detailText}>
              {item.car.car_make} {item.car.car_model}
            </Text>
          </View>
        )}
      </View>

      {item.luggage_allowed && (
        <View style={styles.carRow}>
          <Icon name="bag-suitcase" size={16} color="#248907" />
          <Text style={[styles.carText, { marginLeft: 5 }]}>Luggage Allowed</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offer Ride</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'list' && styles.activeTabButton]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>Published Rides</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'offer' && styles.activeTabButton]}
          onPress={() => setActiveTab('offer')}
        >
          <Text style={[styles.tabText, activeTab === 'offer' && styles.activeTabText]}>Offer a Ride</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: '#f3f3f3' }}>
        {activeTab === 'list' ? (
          loading && !refreshing ? (
            <ActivityIndicator size="large" color="#248907" style={{ marginTop: 50 }} />
          ) : (
            <FlatList
              data={myRides}
              renderItem={renderRideItem}
              keyExtractor={(item) => item.id ? item.id.toString() : Math.random().toString()}
              contentContainerStyle={{ padding: 15 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="car-off" size={60} color="#ccc" />
                  <Text style={styles.emptyText}>No rides offered yet.</Text>
                  <TouchableOpacity onPress={() => setActiveTab('offer')} style={styles.addFirstBtn}>
                    <Text style={styles.addFirstBtnText}>Offer Your First Ride</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
            <View style={styles.formContainer}>
              <Text style={styles.createTitle}>Create New Ride</Text>

              <View style={{ zIndex: 20 }}>
                <TextInput
                  placeholder="Pickup Point"
                  placeholderTextColor="#777"
                  style={styles.input}
                  value={pickup}
                  onChangeText={(text) => {
                    setPickup(text);
                    fetchSuggestions(text, 'pickup');
                  }}
                />
                {pickupSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView keyboardShouldPersistTaps="always">
                      {pickupSuggestions.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(item, 'pickup')}
                        >
                          <Icon name="map-marker-outline" size={16} color="#555" style={{ marginRight: 8 }} />
                          <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={{ zIndex: 10 }}>
                <TextInput
                  placeholder="Drop Point"
                  placeholderTextColor="#777"
                  style={styles.input}
                  value={drop}
                  onChangeText={(text) => {
                    setDrop(text);
                    fetchSuggestions(text, 'drop');
                  }}
                />
                {dropSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView keyboardShouldPersistTaps="always">
                      {dropSuggestions.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(item, 'drop')}
                        >
                          <Icon name="map-marker-outline" size={16} color="#555" style={{ marginRight: 8 }} />
                          <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setOpen(true)} style={styles.dateButton}>
                <Text style={[styles.dateButtonText, !dateTime && { color: '#777' }]}>
                  {dateTime ? dateTime : "Select Date & Time"}
                </Text>
                <Icon name="calendar" size={20} color="#248907" />
              </TouchableOpacity>

              <DatePicker
                modal
                open={open}
                date={date}
                onConfirm={(date) => {
                  setOpen(false)
                  setDate(date)
                  // Format: YYYY-MM-DD HH:MM:SS
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const hours = String(date.getHours()).padStart(2, '0');
                  const minutes = String(date.getMinutes()).padStart(2, '0');
                  const seconds = String(date.getSeconds()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                  setDateTime(formattedDate)
                }}
                onCancel={() => {
                  setOpen(false)
                }}
              />

              <View style={styles.row}>
                <TextInput
                  placeholder="Total Seats"
                  placeholderTextColor="#777"
                  keyboardType="numeric"
                  style={[styles.input, { flex: 1, marginRight: 5 }]}
                  value={seats}
                  onChangeText={setSeats}
                />
                <TextInput
                  placeholder="Price/Seat"
                  placeholderTextColor="#777"
                  keyboardType="numeric"
                  style={[styles.input, { flex: 1, marginLeft: 5 }]}
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              <Text style={styles.label}>Select Car</Text>

              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowCarDropdown(!showCarDropdown)}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedCarId
                    ? userCars.find(c => c.id === selectedCarId)?.car_make + ' ' + userCars.find(c => c.id === selectedCarId)?.car_model
                    : "Select Your Car"}
                </Text>
                <Icon name={showCarDropdown ? "chevron-up" : "chevron-down"} size={24} color="#555" />
              </TouchableOpacity>

              {showCarDropdown && (
                <View style={styles.dropdownList}>
                  {userCars.length > 0 ? (
                    userCars.map((car) => (
                      <TouchableOpacity
                        key={car.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedCarId(car.id);
                          setShowCarDropdown(false);
                        }}
                      >
                        <Icon name="car" size={20} color="#248907" style={{ marginRight: 10 }} />
                        <Text style={styles.dropdownItemText}>
                          {car.car_make} {car.car_model} ({car.licence_plate})
                        </Text>
                        {selectedCarId === car.id && (
                          <Icon name="check" size={20} color="#248907" style={{ marginLeft: 'auto' }} />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <TouchableOpacity onPress={() => navigation.navigate('AddYourCar')} style={styles.dropdownItem}>
                      <Text style={[styles.dropdownItemText, { color: '#248907' }]}>+ Add a New Car</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Luggage Allowed</Text>
                <Switch
                  value={luggage}
                  onValueChange={setLuggage}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={luggage ? "#248907" : "#f4f3f4"}
                />
              </View>

              <TouchableOpacity style={styles.offerButton} onPress={handleCreateRide} disabled={submitting}>
                <Text style={styles.offerText}>{submitting ? 'Submitting...' : 'Offer Ride'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default OfferRide;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 0,
  },
  header: {
    backgroundColor: '#248907',
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row', marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff',
  },
  tabButton: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#248907',
  },
  tabText: {
    fontSize: 16, fontWeight: '600', color: '#777',
  },
  activeTabText: {
    color: '#248907',
  },
  formContainer: {
    padding: 15,
  },
  createTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: '#000',
  },
  input: {
    backgroundColor: '#fff',
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#000',
  },
  row: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  offerButton: {
    backgroundColor: '#248907',
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  offerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
  },
  // Card Styles
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginHorizontal: 5, // Add horizontal margin to prevent cutting off shadows on sides
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  rideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingBottom: 8,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap', // Allow wrapping for long location names
  },
  routeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flexShrink: 1, // Prevent text overflow
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#248907',
    marginLeft: 10,
  },
  // Selection Styles
  label: {
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
    fontSize: 14,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginTop: -5,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  rideDetailsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap', // Responsive wrapping
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 5,
  },
  detailText: {
    marginLeft: 6,
    color: '#555',
    fontSize: 14,
    fontWeight: '500',
  },
  carRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  carText: {
    color: '#444',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    marginBottom: 20,
  },
  addFirstBtn: {
    backgroundColor: '#248907',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addFirstBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Suggestion Styles
  suggestionsContainer: {
    position: 'absolute',
    top: 55, // Directly below the input
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 8,
    zIndex: 1000,
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
