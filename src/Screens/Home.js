import { useNavigation, useFocusEffect } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Home = ({ route }) => {
  const navigation = useNavigation();
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
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle='dark-content' backgroundColor="#248907" />

      {/* Header */}
      <View style={styles.header}>

        <View style={styles.locationRow}>
          <View style={styles.locationBox}>
            <Text style={styles.locationText}>
              {searchCriteria.from ? `${searchCriteria.from} → ${searchCriteria.to}` : 'Select a route'}
            </Text>
          </View>

          {/* Bell Button */}
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => navigation.navigate('Inbox')}
          >
            <Icon name="bell-outline" size={30} color="#248907" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Filter Row */}
        <View style={styles.filterBox}>
          <Text style={styles.filterText}>
            {searchCriteria.departing ? `${searchCriteria.departing}, ${searchCriteria.passengers} Passenger` : 'Today, 1 Passenger'}
          </Text>
          <TouchableOpacity style={styles.filterButton}>
            <Icon name="filter-variant" size={20} color="#248907" />
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
          rides.map((ride) => (
            <View key={ride.id} style={styles.rideCard}>
              <View style={styles.rideTopRow}>
                <Text style={styles.time}>{formatTime(ride.date_time)}</Text>
                <Text style={styles.price}>₹{ride.price_per_seat}</Text>
              </View>

              <Text style={styles.route}>{ride.pickup_point} → {ride.drop_point}</Text>
              <Text style={styles.seats}>{ride.total_seats} Seats Available</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                <Text style={{ fontSize: 12, color: '#555' }}>Car: {ride.car?.car_make} {ride.car?.car_model}</Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('Prefrance', { rideData: ride })}
                style={styles.detailsButton}
              >
                <Text style={styles.detailsText}>More Details</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ fontSize: 16, color: '#777' }}>No rides found.</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
              <Text style={{ color: '#248907', fontWeight: '600' }}>Go Back to Search</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  /* FIXED SAFE AREA */
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  /* HEADER */
  header: {
    backgroundColor: '#248907',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    height: 150,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  locationBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
  },

  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  bellButton: {
    backgroundColor: '#fff',
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  /* FILTER */
  filterBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },

  filterText: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },

  filterButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  filterButtonText: {
    color: '#248907',
    fontWeight: '600',
    marginLeft: 5,
  },

  /* LIST */
  scroll: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
  },

  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },

  rideTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  time: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  price: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },

  route: {
    fontSize: 14,
    marginTop: 5,
    color: '#555',
  },

  seats: {
    fontSize: 13,
    color: '#777',
    marginVertical: 5,
  },

  detailsButton: {
    backgroundColor: '#248907',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },

  detailsText: {
    color: '#fff',
    fontWeight: '600',
  },
});
