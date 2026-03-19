import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, IMG_URL } from '../config/config';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';

const YourRides = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

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
      console.error('Error fetching unread count:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
      fetchUserId();
      fetchUnreadCount();
    }, [])
  );

  const fetchUserId = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
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
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Bookings Response:', response.data);
      if (response.data.status === true) {
        const fetchedBookings = response.data.data.bookings || [];
        setBookings(fetchedBookings);
      }
    } catch (error) {
      console.error('Fetch Bookings Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // userType: 'driver' ya 'passenger'
  const handleCancel = async (bookingId, userType) => {
    const isDriver = userType === 'driver';
    Alert.alert(
      isDriver ? 'Reject Booking' : 'Cancel Ride',
      isDriver
        ? 'Are you sure you want to reject/cancel this booking?'
        : 'Are you sure you want to cancel this ride?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              let response;
              if (isDriver) {
                // Driver: use status API with 'rejected'
                response = await axios.post(
                  `${BASE_URL}booking/${bookingId}/status`,
                  { status: 'rejected', rejection_reason: 'Cancelled by driver' },
                  { headers: { 'Authorization': `Bearer ${token}` } }
                );
              } else {
                // Passenger: use cancel API
                response = await axios.post(
                  `${BASE_URL}booking/${bookingId}/cancel`,
                  {},
                  { headers: { 'Authorization': `Bearer ${token}` } }
                );
              }
              if (response.data.status === true || response.status === 200) {
                Alert.alert('Success', isDriver ? 'Booking rejected successfully.' : 'Ride cancelled successfully.');
                fetchBookings();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to cancel.');
              }
            } catch (error) {
              console.error('Cancel Error:', error?.response?.data || error);
              Alert.alert('Error', 'Could not cancel. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleReduceSeats = async (bookingId, currentSeats) => {
    if (currentSeats <= 1) {
      Alert.alert('Info', 'You only have 1 seat booked. Use "Cancel" to remove the booking entirely.');
      return;
    }

    Alert.alert(
      'Reduce Seats',
      `You currently have ${currentSeats} seats booked.\nSelect how many seats you want to KEEP:`,
      Array.from({ length: currentSeats - 1 }, (_, i) => {
        const keepCount = i + 1;
        const cancelCount = currentSeats - keepCount;
        return {
          text: `${keepCount} Seat${keepCount === 1 ? '' : 's'} (Cancel ${cancelCount})`,
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              // Updated URL to match new backend route /booking/reduce-seats/{id}
              const response = await axios.post(`${BASE_URL}booking/reduce-seats/${bookingId}`, { new_seats: keepCount }, {
                headers: { 'Authorization': `Bearer ${token}` }
              });

              if (response.data.status === true) {
                Alert.alert('Success', `Booking updated. You now have ${keepCount} seat(s).`);
                fetchBookings();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to update seats.');
              }
            } catch (error) {
              console.error('Reduce Error Details:', error?.response?.data || error.message);
              const errMsg = error?.response?.data?.message || 'Could not reduce seats. Please try again.';
              Alert.alert('Update Failed', errMsg);
            }
          }
        };
      }).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const handleConfirm = async (bookingId) => {
    Alert.alert(
      'Confirm Booking',
      'Are you sure you want to confirm this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              const response = await axios.post(`${BASE_URL}booking/${bookingId}/status`, { status: 'confirmed' }, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (response.data.status === true || response.status === 200) {
                Alert.alert('Success', 'Booking confirmed.');
                fetchBookings();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to confirm.');
              }
            } catch (error) {
              console.error('Confirm Error:', error);
              Alert.alert('Error', 'Could not confirm booking.');
            }
          }
        }
      ]
    );
  };

  const handleMarkComplete = async (bookingId) => {
    Alert.alert(
      'Complete Ride',
      'Are you sure you want to mark this ride as completed?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              const response = await axios.post(`${BASE_URL}booking/${bookingId}/status`, { status: 'completed' }, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (response.data.status === true || response.status === 200) {
                Alert.alert('Success', 'Ride marked as completed.');
                fetchBookings();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to update status.');
              }
            } catch (error) {
              console.error('Complete Error:', error);
              Alert.alert('Error', 'Could not complete ride.');
            }
          }
        }
      ]
    );
  };

  /**
   * Get the "other person" in this booking
   * - If I am the one who BOOKED (user_id = me) → other person is ride creator
   * - If I am the one who CREATED ride (ride.user_id = me) → other person is the booker
   */
  const getOtherPerson = (item) => {
    // user_type: 'driver' = maine ride create ki, 'passenger' = maine ride book ki
    const isIAmCreator = item.user_type === 'driver';

    if (isIAmCreator) {
      // Maine ride create ki → other person is the booker/passenger
      return {
        id: item.user_id || item.passenger_id,
        name: item.passenger_name || item.user?.name || 'Passenger',
        image: item.user?.profile_picture || null,
        phone: item.passenger_phone || item.user?.phone || null,
        role: 'Passenger',
      };
    } else {
      // Maine ride book ki → other person is the driver/creator
      return {
        id: item.ride?.car?.user?.id || item.driver_id,
        name: item.driver_details?.driver_name || item.ride?.car?.user?.name || 'Driver',
        image: item.ride?.car?.user?.profile_picture || null,
        phone: item.driver_details?.driver_phone || item.ride?.car?.user?.phone || null,
        role: 'Driver',
      };
    }
  };

  const handleCall = (phone, name) => {
    if (!phone) {
      Alert.alert('Not Available', `${name}'s phone number is not available.`);
      return;
    }
    const url = `tel:${phone}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Call not supported on this device.');
      }
    });
  };

  const handleMessage = (item, otherPerson) => {
    const rideId = item.ride_id || item.ride?.id;
    if (!rideId || !otherPerson?.id) {
      Alert.alert('Error', 'Cannot open chat. Missing ride or user info.');
      return;
    }

    let otherPersonImage = null;
    if (otherPerson.image) {
      otherPersonImage = otherPerson.image.startsWith('http')
        ? otherPerson.image
        : `${IMG_URL}${otherPerson.image}`;
    }

    navigation.navigate('ChatScreen', {
      rideId: rideId,
      receiverId: otherPerson.id,
      driverName: otherPerson.name,
      driverImage: otherPersonImage,
    });
  };

  /**
   * For Review: who do we review?
   * - If I booked the ride → I review the creator (type: 'driver')
   * - If I created the ride → I review the booker (type: 'passenger')
   */
  const handleRate = (item) => {
    const isIAmCreator = item.user_type === 'driver';

    navigation.navigate('AddReviewScreen', {
      bookingId: item.id,
      targetRole: isIAmCreator ? 'passenger' : 'driver',
      driverId: item.ride?.car?.user?.id || item.driver_id,
      userId: item.user_id,
    });
  };

  const getFilteredBookings = () => {
    return bookings.filter(item => {
      const status = item.status?.toLowerCase();
      if (activeTab === 'Upcoming') return status === 'pending' || status === 'confirmed';
      if (activeTab === 'Completed') return status === 'completed';
      if (activeTab === 'Cancelled') return status === 'cancelled';
      return false;
    });
  };

  const filteredBookings = getFilteredBookings();

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return '#1fa000';
      case 'confirmed': return '#2980b9';
      case 'pending': return '#e67e22';
      case 'cancelled': return '#e74c3c';
      default: return '#888';
    }
  };

  const getCarImage = (item) => {
    const carPhoto = item.car_details?.car_photo
      || item.ride?.car_details?.car_photo
      || item.ride_details?.car_details?.car_photo;
    if (carPhoto) {
      return { uri: carPhoto.startsWith('http') ? carPhoto : `${IMG_URL}${carPhoto}` };
    }
    return require('../asset/Image/Rides.png');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="#248907" barStyle="dark-content" translucent={false} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={scale(28)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Rides</Text>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Inbox')}
        >
          <Icon name="bell-outline" size={scale(24)} color="#fff" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['Upcoming', 'Completed', 'Cancelled'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#248907" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1, padding: scale(15) }} contentContainerStyle={{ paddingBottom: verticalScale(30) }}>
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="car-off" size={scale(64)} color="#ddd" />
              <Text style={styles.emptyText}>No {activeTab} rides found.</Text>
            </View>
          ) : (
            filteredBookings.map((item, index) => {
              const otherPerson = getOtherPerson(item);
              const isCompleted = item.status?.toLowerCase() === 'completed';
              const isUpcoming = item.status?.toLowerCase() === 'pending' || item.status?.toLowerCase() === 'confirmed';
              // user_type: 'driver' = ride creator, 'passenger' = ride booker
              const isIAmCreator = item.user_type === 'driver';

              return (
                <View key={index} style={styles.rideCard}>

                  {/* ── Top Row: Info + Car Image ── */}
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      {/* Route */}
                      <Text style={styles.routeText} numberOfLines={1}>
                        {item.location || item.ride?.pickup_point || '—'} → {item.destination || item.ride?.drop_point || '—'}
                      </Text>

                      {/* Date & Seats */}
                      <View style={styles.metaRow}>
                        <Icon name="calendar" size={13} color="#888" />
                        <Text style={styles.metaText}>{item.booking_date || '—'}</Text>
                        <Icon name="seat-passenger" size={13} color="#888" style={{ marginLeft: 10 }} />
                        <Text style={styles.metaText}>{item.seats_booked} seat(s)</Text>
                      </View>

                      {/* Price */}
                      <Text style={styles.priceText}>{item.price || item.total_price || '0'}</Text>

                      {/* Status Badge */}
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                          {item.status?.toUpperCase()}
                        </Text>
                      </View>

                      {/* My Role */}
                      <Text style={styles.roleLabel}>
                        You are: <Text style={styles.roleBold}>{isIAmCreator ? 'Ride Creator (Driver)' : 'Ride Booker (Passenger)'}</Text>
                      </Text>
                    </View>

                    {/* Car Image */}
                    <Image source={getCarImage(item)} style={styles.carImg} resizeMode="cover" />
                  </View>

                  {/* ── Other Person Info ── */}
                  {otherPerson?.name && (
                    <View style={styles.otherPersonRow}>
                      <Icon
                        name={isIAmCreator ? 'account-arrow-left' : 'account-arrow-right'}
                        size={scale(16)}
                        color="#1fa000"
                      />
                      <Text style={styles.otherPersonText}>
                        {isIAmCreator ? 'Booker: ' : 'Creator: '}
                        <Text style={styles.otherPersonName}>{otherPerson.name}</Text>
                      </Text>
                    </View>
                  )}

                  {/* ── Bottom Actions ── */}
                  <View style={styles.actionRow}>

                    {/* View Details (always) */}
                    <TouchableOpacity
                      style={styles.detailsBtn}
                      onPress={() => navigation.navigate('DriverIntarnal', {
                        bookingId: item.id,
                        driverId: item.ride?.user_id || item.driver_id,
                      })}
                    >
                      <Icon name="information-outline" size={15} color="#fff" />
                      <Text style={styles.detailsBtnText}>Details</Text>
                    </TouchableOpacity>

                    {/* Confirm (Driver/Creator only: Upcoming + Pending) */}
                    {isUpcoming && isIAmCreator && item.status?.toLowerCase() === 'pending' && (
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => handleConfirm(item.id)}
                      >
                        <Icon name="check" size={16} color="#fff" />
                        <Text style={styles.confirmBtnText}>Confirm</Text>
                      </TouchableOpacity>
                    )}

                    {/* Mark Complete (Driver/Creator only: Upcoming + Confirmed) */}
                    {isUpcoming && isIAmCreator && item.status?.toLowerCase() === 'confirmed' && (
                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={() => handleMarkComplete(item.id)}
                      >
                        <Icon name="check-all" size={16} color="#fff" />
                        <Text style={styles.completeBtnText}>Complete</Text>
                      </TouchableOpacity>
                    )}

                    {/* Reduce Seats (Passenger only: Upcoming + >1 seat) */}
                    {isUpcoming && !isIAmCreator && item.seats_booked > 1 && (
                      <TouchableOpacity
                        style={styles.reduceBtn}
                        onPress={() => handleReduceSeats(item.id, item.seats_booked)}
                      >
                        <Icon name="account-minus-outline" size={15} color="#fff" />
                        <Text style={styles.reduceBtnText}>Reduce Seats</Text>
                      </TouchableOpacity>
                    )}

                    {/* Cancel/Reject (Upcoming only: both Driver & Passenger) */}
                    {isUpcoming && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancel(item.id, item.user_type)}
                      >
                        <Icon name="close" size={15} color="#fff" />
                        <Text style={styles.cancelBtnText}>
                          {isIAmCreator && item.status?.toLowerCase() === 'pending' ? 'Reject' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* ⭐ Rate (Completed only) */}
                    {isCompleted && (
                      <TouchableOpacity
                        style={styles.rateBtn}
                        onPress={() => handleRate(item)}
                      >
                        <Icon name="star-outline" size={scale(16)} color="#fff" />
                        <Text style={styles.rateBtnText}>
                          Rate {isIAmCreator ? 'Booker' : 'Creator'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default YourRides;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  /* Header */
  header: {
    height: verticalScale(60),
    backgroundColor: '#248907',
    paddingHorizontal: scale(15),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: responsiveFontSize(20),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  bellButton: {
    padding: scale(5),
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e74c3c',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },

  /* Tabs */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: verticalScale(13),
    alignItems: 'center',
  },
  tabText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
    color: '#888',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#248907',
  },
  activeTabText: {
    color: '#248907',
    fontWeight: '700',
  },

  /* Center / Empty */
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: verticalScale(70),
  },
  emptyText: {
    color: '#aaa',
    fontSize: responsiveFontSize(15),
    marginTop: verticalScale(12),
    fontWeight: '500',
  },

  /* Ride Card */
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(16),
    padding: moderateScale(16),
    marginBottom: verticalScale(15),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },

  /* Card Top */
  cardTop: {
    flexDirection: 'row',
    marginBottom: verticalScale(12),
  },
  routeText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: verticalScale(5),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(5),
  },
  metaText: {
    fontSize: responsiveFontSize(12),
    color: '#888',
    marginLeft: scale(4),
  },
  priceText: {
    fontSize: responsiveFontSize(15),
    fontWeight: '700',
    color: '#248907',
    marginBottom: verticalScale(6),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(20),
    marginBottom: verticalScale(5),
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: scale(5),
  },
  statusText: {
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roleLabel: {
    fontSize: responsiveFontSize(12),
    color: '#aaa',
    marginTop: verticalScale(2),
  },
  roleBold: {
    color: '#248907',
    fontWeight: '700',
  },
  carImg: {
    width: scale(85),
    height: scale(85),
    borderRadius: moderateScale(12),
    marginLeft: scale(12),
  },

  /* Other Person Row */
  otherPersonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0faf0',
    padding: moderateScale(9),
    borderRadius: moderateScale(8),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: '#d4edda',
  },
  otherPersonText: {
    fontSize: responsiveFontSize(13),
    color: '#555',
    marginLeft: scale(7),
  },
  otherPersonName: {
    fontWeight: '700',
    color: '#1a1a1a',
  },

  /* Action Row */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(8),
  },

  /* Details Button */
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#248907',
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(8),
  },
  detailsBtnText: {
    color: '#fff',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },

  /* Message Button */
  msgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebf5fb',
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#2980b9',
  },
  msgBtnText: {
    color: '#2980b9',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },

  /* Call Button */
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eafaf1',
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  callBtnText: {
    color: '#27ae60',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },

  /* Confirm Button */
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(8),
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },

  /* Cancel Button */
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(8),
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },
  /* Complete Button */
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1fa000',
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(8),
  },
  completeBtnText: {
    color: '#fff',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },

  /* Rate Button */
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(8),
  },
  rateBtnText: {
    color: '#fff',
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
    marginLeft: scale(4),
  },
  reduceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(8),
  },
  reduceBtnText: {
    color: '#fff',
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    marginLeft: scale(4),
  },
});