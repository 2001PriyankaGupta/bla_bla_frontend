import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, IMG_URL } from '../config/config';

const YourRides = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userType, setUserType] = useState(null);
  const [userId, setUserId] = useState(null);

  // Use useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
      fetchUserType();
    }, [])
  );

  const fetchUserType = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUserType(userData.user_type);
        setUserId(userData.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.get(`${BASE_URL}my-bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Bookings Response:', response.data);
      if (response.data.status === true) {
        const fetchedBookings = response.data.data.bookings || [];
        // DEBUG: Check for driver_id in booking list
        if (fetchedBookings.length > 0) {
          console.log('Sample Booking Item (Look for driver_id):', JSON.stringify(fetchedBookings[0], null, 2));
        }
        setBookings(fetchedBookings);
      } else {
        // Alert.alert("Error", "Failed to fetch bookings"); 
      }
    } catch (error) {
      console.error("Fetch Bookings Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this ride?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes", onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              // Endpoint: /api/booking/1/cancel
              const response = await axios.post(`${BASE_URL}booking/${bookingId}/cancel`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (response.data.status === true || response.status === 200) {
                Alert.alert("Success", "Ride cancelled successfully.");
                fetchBookings(); // Refresh list
              } else {
                Alert.alert("Error", response.data.message || "Failed to cancel ride.");
              }
            } catch (error) {
              console.error("Cancel Error:", error);
              Alert.alert("Error", "Could not cancel ride.");
            }
          }
        }
      ]
    );
  };

  const handleConfirm = async (bookingId) => {
    Alert.alert(
      "Confirm Ride",
      "Are you sure you want to confirm this booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes", onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              // Endpoint: /api/booking/1/status (Driver only)
              // Assuming payload needed, usually status: 'confirmed'. 
              // Based on prompt: http://.../api/booking/1/status (Driver krega)
              // It's likely a POST or PUT to update status.
              const response = await axios.post(`${BASE_URL}booking/${bookingId}/status`, { status: 'confirmed' }, {
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (response.data.status === true || response.status === 200) {
                Alert.alert("Success", "Ride confirmed successfully.");
                fetchBookings(); // Refresh list
              } else {
                Alert.alert("Error", response.data.message || "Failed to confirm ride.");
              }
            } catch (error) {
              console.error("Confirm Error:", error);
              Alert.alert("Error", "Could not confirm ride.");
            }
          }
        }
      ]
    );
  };

  const getFilteredBookings = () => {
    return bookings.filter(item => {
      const status = item.status?.toLowerCase();
      // Upcoming now includes both pending and confirmed
      if (activeTab === 'Upcoming') return status === 'pending' || status === 'confirmed';
      if (activeTab === 'Completed') return status === 'completed';
      if (activeTab === 'Cancelled') return status === 'cancelled';
      return false;
    });
  };

  const filteredBookings = getFilteredBookings();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="#248907" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Rides</Text>

        <View style={{ width: 20 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['Upcoming', 'Completed', 'Cancelled'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#248907" />
        </View>
      ) : (
        <ScrollView style={{ padding: 15 }} contentContainerStyle={{ paddingBottom: 20 }}>
          {filteredBookings.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text style={{ color: '#777', fontSize: 16 }}>No {activeTab} rides found.</Text>
            </View>
          ) : (
            filteredBookings.map((item, index) => (
              <View key={index} style={[styles.rideCard, { flexDirection: 'column' }]}>
                {/* Top Row: Info + Image */}
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timeText}>
                      {item.booking_date}
                    </Text>

                    {/* Location fallback */}
                    <Text style={styles.titleText}>
                      {item.location || item.destination ? `${item.location || ''} -> ${item.destination || ''}` : `Booking #${item.reference || item.id}`}
                    </Text>

                    <Text style={styles.datePriceText}>
                      {item.seats_booked} Seats • {item.price}
                    </Text>

                    <Text style={[styles.datePriceText, { color: item.status === 'pending' ? 'orange' : item.status === 'completed' ? 'green' : 'red' }]}>
                      Status: {item.status}
                    </Text>
                  </View>

                  {/* Image with Robust Path Handling */}
                  <Image
                    source={(() => {
                      const carPhoto = item.car_details?.car_photo
                        || item.ride?.car_details?.car_photo
                        || item.ride_details?.car_details?.car_photo;
                      if (carPhoto) {
                        return { uri: carPhoto.startsWith('http') ? carPhoto : `${IMG_URL}${carPhoto}` };
                      }
                      return require('../asset/Image/Rides.png');
                    })()}
                    style={styles.rideImage}
                    resizeMode="cover"
                  />
                </View>

                {/* Bottom Row: Actions */}
                <View style={[styles.actionRow, { justifyContent: 'space-between', marginTop: 15 }]}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('DriverIntarnal', {
                      bookingId: item.id,
                      // Passing driverId explicitly in case internal fetch misses it
                      driverId: item.ride?.user_id || item.driver_id || item.ride?.driver_id
                    })}
                    style={[styles.detailsButton, { marginTop: 0 }]}
                  >
                    <Text style={styles.detailsButtonText}>View Details</Text>
                  </TouchableOpacity>

                  {/* Actions for Pending and Confirmed */}
                  {(item.status === 'pending' || item.status === 'confirmed') && (
                    <View style={{ flexDirection: 'row' }}>

                      {/* Driver Confirm Option - ONLY for Pending */}
                      {userType === 'driver' && item.status === 'pending' && (
                        <TouchableOpacity
                          style={[styles.smallBtn, styles.confirmBtn]}
                          onPress={() => handleConfirm(item.id)}
                        >
                          <Text style={styles.smallBtnText}>Confirm</Text>
                        </TouchableOpacity>
                      )}

                      {/* Cancel Option - For both Pending and Confirmed */}
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.cancelBtn]}
                        onPress={() => handleCancel(item.id)}
                      >
                        <Text style={styles.smallBtnText}>Cancel</Text>
                      </TouchableOpacity>

                    </View>
                  )}

                  {/* Completed: Rate Button */}
                  {item.status === 'completed' && (
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.rateBtn]}
                        onPress={() => navigation.navigate('AddReviewScreen', {
                          bookingId: item.id,
                          targetRole: userType === 'driver' ? 'passenger' : 'driver',
                          driverId: item.ride?.user_id || item.driver_id || item.ride?.driver_id,
                          userId: userId
                        })}
                      >
                        <Text style={[styles.smallBtnText, { color: '#000' }]}>Rate {userType === 'driver' ? 'Passenger' : 'Driver'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default YourRides;

/* =============== FIXED SAFE AREA STYLES =============== */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },

  header: {
    height: 60,
    backgroundColor: '#248907',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e6f5e6',
  },

  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },

  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },

  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#248907',
  },

  activeTabText: {
    color: '#248907',
    fontWeight: '700',
  },

  rideCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 3,
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
  },

  rideImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginLeft: 15,
  },

  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },

  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginTop: 2,
  },

  datePriceText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },

  detailsButton: {
    backgroundColor: '#248907',
    borderRadius: 8,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },

  detailsButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  actionRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginLeft: 10,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  rateBtn: {
    backgroundColor: '#FFD700', // Gold color for rating
    marginLeft: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8
  },

  smallBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  smallBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  cancelBtn: {
    backgroundColor: '#ff4d4d', // Red
  },

  confirmBtn: {
    backgroundColor: '#248907', // Green
  },
});