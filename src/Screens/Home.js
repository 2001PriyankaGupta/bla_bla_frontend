import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';

const Home = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Error fetching unread count:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [])
  );
  const [refreshing, setRefreshing] = useState(false);
  const { searchData } = route.params || {};
  const [rides, setRides] = useState(searchData?.data || []);
  const [searchCriteria, setSearchCriteria] = useState(searchData?.search_criteria || {});
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const getUserData = async () => {
      const storedUser = await AsyncStorage.getItem('user_data');
      if (storedUser) {
        setUserData(JSON.parse(storedUser));
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    if (route.params?.searchData) {
      console.log('Received search data in Home:', route.params.searchData);
      setRides(route.params.searchData.data || []);
      setSearchCriteria(route.params.searchData.search_criteria || {});
    } else {
      console.log('No search data received in Home params');
    }
  }, [route.params?.searchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    console.log('Refreshing Home screen...');
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Refreshed', 'Data refreshed');
    }, 1000);
  }, []);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    // Clean string by removing Z/T to prevent offset shifts
    const cleanDate = typeof dateString === 'string'
      ? dateString.replace('Z', '').replace('T', ' ')
      : dateString;
    const date = new Date(cleanDate);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Helper to shorten long address (e.g., "Connaught Place, New Delhi..." -> "Connaught Place")
  const shortLocation = (address) => {
    if (!address) return '';
    return address.split(',')[0].trim();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle='dark-content' backgroundColor="#248907" translucent={false} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + verticalScale(10) }]}>

        <View style={styles.locationRow}>
          <View style={styles.locationBox}>
            <Text style={styles.locationText} numberOfLines={2}>
              {searchCriteria.from ? `${shortLocation(searchCriteria.from)} → ${shortLocation(searchCriteria.to)}` : 'Select a route'}
            </Text>
          </View>

          {/* Bell Button */}
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => navigation.navigate('Inbox')}
          >
            <Icon name="bell-outline" size={28} color="#248907" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Filter Row */}
        <View style={styles.filterBox}>
          <Text style={styles.filterText} numberOfLines={1}>
            {searchCriteria.departing ? `${searchCriteria.departing} • ${searchCriteria.passengers} Pass.` : 'Today • 1 Pass.'}
          </Text>
          <TouchableOpacity style={styles.filterButton}>
            <Icon name="filter-variant" size={18} color="#248907" />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ride list */}
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#248907']} />
        }
      >
        <Text style={styles.sectionTitle}>Available Rides</Text>

        {rides.length > 0 ? (
          rides.map((ride) => {
            const totalSeats = ride.total_seats || 0;
            const bookedSeats = ride.booked_seats ?? 0;
            const availableSeats = ride.available_seats ?? (totalSeats - bookedSeats);
            const fillPercent = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;

            const seatBarColor = availableSeats === 0 ? '#e74c3c'
              : availableSeats <= 1 ? '#e67e22'
                : '#27ae60';

            return (
              <TouchableOpacity
                key={ride.id}
                style={styles.rideCard}
                onPress={() => navigation.navigate('Prefrance', {
                  rideData: ride,
                  searchPickup: searchCriteria.from,
                  searchDrop: searchCriteria.to
                })}
              >
                <View style={styles.rideTopRow}>
                  <View style={[styles.timeTag, { flex: 1, marginRight: 10 }]}>
                    <Icon name="clock-outline" size={14} color="#248907" />
                    <Text style={styles.timeText} numberOfLines={1}>{formatTime(ride.date_time)}</Text>
                  </View>
                  <Text style={styles.priceText} numberOfLines={1}>₹{ride.price_per_seat}</Text>
                </View>

                <Text style={styles.routeText} numberOfLines={2}>
                  {(ride.search_segment?.pickup || ride.pickup_point)} → {(ride.search_segment?.drop || ride.drop_point)}
                </Text>

                {/* ── Stop Points (Intermediate Cities) ── */}
                {ride.stop_points && ride.stop_points.length > 0 && (
                  <View style={styles.stopsWrapper}>
                    <View style={styles.stopsIndicator}>
                      <View style={styles.stopDot} />
                      <View style={styles.stopLine} />
                      <View style={styles.stopDot} />
                    </View>
                    <Text style={styles.stopsText} numberOfLines={1}>
                      via: <Text style={{ fontWeight: '600', color: '#444' }}>{ride.stop_points.map(s => s.city_name.split(',')[0]).join(', ')}</Text>
                    </Text>
                  </View>
                )}

                <View style={styles.carInfoRow}>
                  <Icon name="car-outline" size={14} color="#666" />
                  <Text style={styles.carText}> {ride.car?.car_make} {ride.car?.car_model}</Text>
                </View>

                {/* ── Seat Visualization ── */}
                <View style={styles.seatContainer}>
                  <View style={styles.seatPillRow}>
                    <View style={[styles.seatStatPill, { backgroundColor: '#f0f4ff' }]}>
                      <Text style={[styles.seatNum, { color: '#2c3e50' }]}>{totalSeats}</Text>
                      <Text style={styles.seatLabel}>Total</Text>
                    </View>
                    <View style={[styles.seatStatPill, { backgroundColor: '#fff3e0' }]}>
                      <Text style={[styles.seatNum, { color: '#e67e22' }]}>{bookedSeats}</Text>
                      <Text style={styles.seatLabel}>Booked</Text>
                    </View>
                    <View style={[styles.seatStatPill, { backgroundColor: availableSeats === 0 ? '#ffebee' : '#e8f5e9' }]}>
                      <Text style={[styles.seatNum, { color: seatBarColor }]}>{availableSeats}</Text>
                      <Text style={styles.seatLabel}>Available</Text>
                    </View>
                  </View>

                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${fillPercent}%`, backgroundColor: seatBarColor }]} />
                  </View>
                  <Text style={[styles.progressCaption, { color: seatBarColor }]}>
                    {availableSeats === 0 ? 'Full' : `${availableSeats} seat${availableSeats !== 1 ? 's' : ''} left`}
                  </Text>
                </View>

                <View style={styles.detailsButton}>
                  <Text style={styles.detailsText}>View Details</Text>
                  <Icon name="chevron-right" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Icon name="car-search" size={60} color="#ccc" />
            <Text style={styles.emptyMessage}>No rides found.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonUnderEmpty}>
              <Text style={styles.backButtonTextUnderEmpty}>Go Back to Search</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  /* HEADER */
  header: {
    backgroundColor: '#248907',
    paddingHorizontal: scale(15),
    paddingBottom: verticalScale(20),
    borderBottomLeftRadius: moderateScale(25),
    borderBottomRightRadius: moderateScale(25),
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: verticalScale(15),
  },

  locationBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginRight: scale(10),
    minHeight: verticalScale(50),
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },

  locationText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    color: '#333',
    lineHeight: verticalScale(20),
  },

  bellButton: {
    backgroundColor: '#fff',
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },

  badge: {
    position: 'absolute',
    top: verticalScale(-5),
    right: scale(-5),
    backgroundColor: '#e74c3c',
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  badgeText: {
    color: '#fff',
    fontSize: responsiveFontSize(10),
    fontWeight: '800',
  },

  /* FILTER */
  filterBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(12),
  },

  filterText: {
    backgroundColor: '#fff',
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    color: '#333',
    fontWeight: '600',
    flex: 1,
    marginRight: scale(10),
    fontSize: responsiveFontSize(13),
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },

  filterButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },

  filterButtonText: {
    color: '#248907',
    fontWeight: '700',
    marginLeft: scale(6),
    fontSize: responsiveFontSize(13),
  },

  /* LIST */
  scroll: {
    flex: 1,
    paddingHorizontal: scale(15),
  },

  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(15),
    color: '#1a1a1a',
  },

  rideCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(15),
    padding: moderateScale(18),
    marginBottom: verticalScale(15),
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },

  rideTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },

  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(8),
  },

  timeText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    color: '#248907',
    marginLeft: scale(5),
  },

  priceText: {
    fontSize: responsiveFontSize(20),
    fontWeight: '800',
    color: '#1a1a1a',
  },

  routeText: {
    lineHeight: verticalScale(24),
    marginBottom: verticalScale(2),
  },
  stopsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    backgroundColor: '#f9f9f9',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#eee',
  },
  stopsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: scale(8),
  },
  stopDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#248907',
  },
  stopLine: {
    width: 10,
    height: 1.5,
    backgroundColor: '#ccc',
    marginHorizontal: 2,
  },
  stopsText: {
    fontSize: responsiveFontSize(11.5),
    color: '#666',
    flex: 1,
  },

  carInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },

  carText: {
    fontSize: responsiveFontSize(12),
    color: '#666',
    fontWeight: '500',
  },

  /* SEAT VISUALIZATION */
  seatContainer: {
    backgroundColor: '#fafafa',
    padding: moderateScale(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: verticalScale(15),
  },

  seatPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(10),
  },

  seatStatPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
    marginHorizontal: scale(4),
  },

  seatNum: {
    fontSize: responsiveFontSize(15),
    fontWeight: '800',
  },

  seatLabel: {
    fontSize: responsiveFontSize(9),
    color: '#777',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: verticalScale(1),
  },

  progressBarBg: {
    height: verticalScale(6),
    backgroundColor: '#eee',
    borderRadius: moderateScale(3),
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    borderRadius: moderateScale(3),
  },

  progressCaption: {
    fontSize: responsiveFontSize(11),
    fontWeight: '600',
    marginTop: verticalScale(6),
    textAlign: 'right',
  },

  /* DETAILS BUTTON */
  detailsButton: {
    backgroundColor: '#248907',
    borderRadius: moderateScale(10),
    paddingVertical: verticalScale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#248907',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },

  detailsText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: responsiveFontSize(15),
    marginRight: scale(5),
  },

  /* EMPTY STATE */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(60),
    paddingHorizontal: scale(40),
  },

  emptyMessage: {
    fontSize: responsiveFontSize(16),
    color: '#999',
    fontWeight: '600',
    marginTop: verticalScale(15),
    textAlign: 'center',
  },

  backButtonUnderEmpty: {
    marginTop: verticalScale(25),
    backgroundColor: '#e8f5e9',
    paddingHorizontal: scale(25),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(10),
  },

  backButtonTextUnderEmpty: {
    color: '#248907',
    fontWeight: '700',
    fontSize: responsiveFontSize(14),
  },
});

