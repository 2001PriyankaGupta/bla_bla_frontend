import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Switch,
  StatusBar,
  Platform,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, GOOGLE_MAPS_API_KEY } from '../config/config';
import DatePicker from 'react-native-date-picker';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';

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
      const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
        params: {
          input: query,
          key: GOOGLE_MAPS_API_KEY,
          components: 'country:in'
        }
      });

      if (type === 'pickup') {
        setPickupSuggestions(response.data.predictions || []);
      } else {
        setDropSuggestions(response.data.predictions || []);
      }
    } catch (error) {
      console.warn("Autocomplete error:", error);
    }
  };

  const handleSelectSuggestion = (item, type) => {
    const address = item.description;
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

  // Helper: grab first meaningful part of a long address
  const shortLocation = (address) => {
    if (!address) return '—';
    // Take text before first comma (usually city/area name)
    const parts = address.split(',');
    return parts[0].trim();
  };

  const renderRideItem = ({ item }) => {
    const totalSeats = item.total_seats || 0;
    const bookedSeats = item.booked_seats ?? 0;
    const availableSeats = item.available_seats ?? (totalSeats - bookedSeats);
    const fillPercent = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;

    const seatBarColor = availableSeats === 0 ? '#e74c3c'
      : availableSeats <= 1 ? '#e67e22'
        : '#27ae60';

    return (
      <TouchableOpacity
        style={styles.rideCard}
        onPress={() => navigation.navigate('RideDetails', { rideId: item.id })}
      >
        {/* ── Price badge (top-right) ── */}
        <View style={styles.priceBadge}>
          <Text style={styles.priceBadgeText}>₹{item.price_per_seat}</Text>
          <Text style={styles.perSeatText}>/seat</Text>
        </View>

        {/* ── Route: From → To (truncated) ── */}
        <View style={styles.routeRow}>
          {/* FROM */}
          <View style={styles.routePoint}>
            <Icon name="map-marker" size={16} color="#248907" />
            <Text style={styles.routeLabel} numberOfLines={1}>
              {shortLocation(item.pickup_point)}
            </Text>
          </View>

          {/* Arrow */}
          <Icon name="arrow-right-thin" size={22} color="#bbb" style={{ marginHorizontal: 6 }} />

          {/* TO */}
          <View style={styles.routePoint}>
            <Icon name="map-marker-check" size={16} color="#e74c3c" />
            <Text style={styles.routeLabel} numberOfLines={1}>
              {shortLocation(item.drop_point)}
            </Text>
          </View>
        </View>

        {/* ── Full address (small, 1 line each) ── */}
        <Text style={styles.fullAddr} numberOfLines={1}>
          {item.pickup_point}
        </Text>
        <View style={styles.arrowDivider}>
          <Icon name="arrow-down" size={12} color="#ccc" />
        </View>
        <Text style={styles.fullAddr} numberOfLines={1}>
          {item.drop_point}
        </Text>

        <View style={styles.divider} />

        {/* ── Date + Car ── */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Icon name="calendar-clock" size={15} color="#248907" />
            <Text style={styles.metaText}>{formatDateTime(item.date_time)}</Text>
          </View>
          {item.car && (
            <View style={styles.metaItem}>
              <Icon name="car" size={15} color="#555" />
              <Text style={styles.metaText}>{item.car.car_make} {item.car.car_model}</Text>
            </View>
          )}
        </View>

        {/* ── Seat Stats ── */}
        <View style={styles.seatBox}>
          {/* 3 stat pills */}
          <View style={styles.seatStatRow}>
            <View style={[styles.seatPill, { backgroundColor: '#f0f4ff' }]}>
              <Icon name="car-seat" size={14} color="#2c3e50" />
              <Text style={[styles.seatPillNum, { color: '#2c3e50' }]}>{totalSeats}</Text>
              <Text style={styles.seatPillLabel}>Total</Text>
            </View>

            <View style={[styles.seatPill, { backgroundColor: '#fff3e0' }]}>
              <Icon name="account-check" size={14} color="#e67e22" />
              <Text style={[styles.seatPillNum, { color: '#e67e22' }]}>{bookedSeats}</Text>
              <Text style={styles.seatPillLabel}>Booked</Text>
            </View>

            <View style={[styles.seatPill, { backgroundColor: availableSeats === 0 ? '#ffebee' : '#e8f5e9' }]}>
              <Icon name="seat-passenger" size={14} color={seatBarColor} />
              <Text style={[styles.seatPillNum, { color: seatBarColor }]}>{availableSeats}</Text>
              <Text style={styles.seatPillLabel}>Available</Text>
            </View>
          </View>

          {/* Visual fill bar */}
          <View style={styles.seatBarBg}>
            <View style={[styles.seatBarFill, { width: `${fillPercent}%`, backgroundColor: seatBarColor }]} />
          </View>
          <Text style={[styles.seatBarCaption, { color: seatBarColor }]}>
            {availableSeats === 0
              ? 'Fully Booked'
              : `${availableSeats} seat${availableSeats !== 1 ? 's' : ''} still available`}
          </Text>
        </View>

        {/* ── Luggage ── */}
        {item.luggage_allowed && (
          <View style={styles.luggageRow}>
            <Icon name="bag-suitcase-outline" size={14} color="#248907" />
            <Text style={styles.luggageText}>Luggage Allowed</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };



  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left', 'bottom']}>
      <StatusBar barStyle="dark-content" translucent={false} />

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
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
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="always">
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
                            <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
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
                            <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
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

                <DatePicker modal
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

                {/* ── Verified Cars Only Label ── */}
                <Text style={styles.label}>Select Car</Text>
                {/* Info: only verified cars shown */}
                {userCars.length > 0 && userCars.filter(c => c.license_verified === 'verified').length === 0 && (
                  <View style={styles.noVerifiedBanner}>
                    <Icon name="shield-alert-outline" size={26} color="#e67e22" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.noVerifiedTitle}>Car Not Verified Yet</Text>
                      <Text style={styles.noVerifiedSub}>
                        Your car and driving license have not been verified by the admin yet.
                        You will be able to offer rides only after your car's license is approved.{"\n\n"}
                        Please wait for admin verification or contact support for assistance.
                      </Text>
                    </View>
                  </View>
                )}


                {/* Only show dropdown if at least one verified car exists */}
                {userCars.filter(c => c.license_verified === 'verified').length > 0 && (
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowCarDropdown(!showCarDropdown)}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {selectedCarId
                        ? userCars.find(c => c.id === selectedCarId)?.car_make + ' ' + userCars.find(c => c.id === selectedCarId)?.car_model
                        : 'Select Verified Car'}
                    </Text>
                    <Icon name={showCarDropdown ? 'chevron-up' : 'chevron-down'} size={24} color="#555" />
                  </TouchableOpacity>
                )}

                {showCarDropdown && (
                  <View style={styles.dropdownList}>
                    {/* ONLY admin-verified cars shown — unverified cars completely hidden */}
                    {userCars.filter(c => c.license_verified === 'verified').map((car) => (
                      <TouchableOpacity
                        key={car.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedCarId(car.id);
                          setShowCarDropdown(false);
                        }}
                      >
                        <Icon name="car" size={20} color="#248907" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dropdownItemText}>
                            {car.car_make} {car.car_model} ({car.licence_plate})
                          </Text>
                          <View style={styles.badgeVerified}>
                            <Text style={styles.verBadgeText}>Verified</Text>
                          </View>
                        </View>
                        {selectedCarId === car.id && (
                          <Icon name="check" size={20} color="#248907" />
                        )}
                      </TouchableOpacity>
                    ))}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OfferRide;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#248907',
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(15),
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 35,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: verticalScale(5),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  tabButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#248907',
  },
  tabText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#777',
  },
  activeTabText: {
    color: '#248907',
  },
  formContainer: {
    padding: moderateScale(15),
  },
  createTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    marginBottom: verticalScale(15),
    color: '#000',
  },
  input: {
    backgroundColor: '#fff',
    marginVertical: verticalScale(8),
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    fontSize: responsiveFontSize(16),
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
    paddingVertical: verticalScale(15),
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(10),
    marginVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: '#ddd',
  },
  switchLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
    color: '#000',
  },
  offerButton: {
    backgroundColor: '#248907',
    marginTop: verticalScale(20),
    padding: moderateScale(15),
    borderRadius: moderateScale(10),
    alignItems: 'center',
  },
  offerText: {
    color: '#fff',
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    marginVertical: verticalScale(8),
  },
  dateButtonText: {
    fontSize: responsiveFontSize(16),
    color: '#000',
  },
  // Card Styles
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(15),
    padding: moderateScale(15),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginHorizontal: scale(5),
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },

  // ── Price badge (absolute top-right) ──
  priceBadge: {
    position: 'absolute',
    top: verticalScale(12),
    right: scale(12),
    backgroundColor: '#e8f5e9',
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    alignItems: 'center',
  },
  priceBadgeText: {
    fontSize: responsiveFontSize(15),
    fontWeight: '800',
    color: '#248907',
  },
  perSeatText: {
    fontSize: responsiveFontSize(9),
    color: '#555',
    fontWeight: '500',
  },

  // ── Route row (short names) ──
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(4),
    marginRight: scale(80),      // leave space for price badge
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    overflow: 'hidden',
  },
  routeLabel: {
    fontSize: responsiveFontSize(15),
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: scale(4),
    flexShrink: 1,
  },

  // ── Full address (small) ──
  fullAddr: {
    fontSize: responsiveFontSize(11),
    color: '#aaa',
    marginLeft: scale(4),
    marginBottom: verticalScale(1),
  },
  arrowDivider: {
    marginLeft: scale(4),
    marginVertical: verticalScale(1),
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: verticalScale(10),
  },

  // ── Meta row (date + car) ──
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(12),
    marginBottom: verticalScale(12),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: responsiveFontSize(12),
    color: '#555',
    marginLeft: scale(5),
    fontWeight: '500',
  },

  // ── Seat Box ──
  seatBox: {
    backgroundColor: '#fafafa',
    borderRadius: moderateScale(10),
    padding: moderateScale(10),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  seatStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  seatPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
    marginHorizontal: scale(3),
  },
  seatPillNum: {
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  seatPillLabel: {
    fontSize: responsiveFontSize(9),
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seatBarBg: {
    height: verticalScale(6),
    backgroundColor: '#e0e0e0',
    borderRadius: moderateScale(4),
    overflow: 'hidden',
    marginBottom: verticalScale(5),
  },
  seatBarFill: {
    height: '100%',
    borderRadius: moderateScale(4),
  },
  seatBarCaption: {
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
    textAlign: 'right',
  },

  // ── Luggage ──
  luggageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(4),
  },
  luggageText: {
    fontSize: responsiveFontSize(12),
    color: '#248907',
    marginLeft: scale(5),
    fontWeight: '500',
  },

  // ── OLD styles kept for form area compatibility ──
  priceText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#248907',
    marginLeft: scale(10),
  },

  // Selection Styles
  label: {
    fontWeight: '700',
    color: '#333',
    marginBottom: verticalScale(5),
    fontSize: responsiveFontSize(14),
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    marginBottom: verticalScale(10),
  },
  dropdownButtonText: {
    fontSize: responsiveFontSize(16),
    color: '#333',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: moderateScale(8),
    marginTop: verticalScale(-5),
    marginBottom: verticalScale(15),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: responsiveFontSize(14),
    color: '#333',
    fontWeight: '500',
  },
  rideDetailsRow: {
    flexDirection: 'row',
    marginBottom: verticalScale(12),
    flexWrap: 'wrap', // Responsive wrapping
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: scale(20),
    marginBottom: verticalScale(5),
  },
  detailText: {
    marginLeft: scale(6),
    color: '#555',
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
  },
  carRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(8),
  },
  carText: {
    color: '#444',
    fontWeight: '600',
    fontSize: responsiveFontSize(14),
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: verticalScale(50),
  },
  emptyText: {
    fontSize: responsiveFontSize(16),
    color: '#999',
    marginTop: verticalScale(10),
    marginBottom: verticalScale(20),
  },
  addFirstBtn: {
    backgroundColor: '#248907',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(20),
  },
  addFirstBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  // No verified cars banner
  noVerifiedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff8e1',
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
  },
  noVerifiedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#c0392b',
    marginBottom: 4,
  },
  noVerifiedSub: {
    fontSize: 12,
    color: '#7f6000',
    lineHeight: 18,
  },
  // Verification badge (verified only)
  badgeVerified: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 3,
    backgroundColor: '#e8f5e9',
  },
  verBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1fa000',
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
