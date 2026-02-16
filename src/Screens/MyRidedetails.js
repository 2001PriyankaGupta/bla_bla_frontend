import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Image,
  Linking,
  Alert,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMG_URL } from '../config/config';

const MyRidedetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { driver_info, trip_summary, booking_information, passenger_info, ride_information } = route.params || {};

  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserType = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('user_data');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUserType(userData.user_type || 'passenger');
        } else {
          setUserType('passenger');
        }
      } catch (e) {
        console.error("Error fetching user type", e);
        setUserType('passenger');
      } finally {
        setLoading(false);
      }
    };
    getUserType();
  }, []);

  // Determine who to show (The OTHER person)
  // If I am passenger -> Show Driver
  // If I am driver -> Show Passenger (from passenger_info or booking_information.user)
  const isDriver = userType === 'driver';

  const targetInfo = isDriver
    ? (passenger_info || booking_information?.user)
    // Fallback for passenger viewing driver
    : (driver_info || trip_summary?.driver_details || booking_information?.ride?.user || ride_information?.user);

  const targetName = targetInfo?.name || (isDriver ? 'Passenger' : 'Driver');
  const targetPhone = targetInfo?.phone || targetInfo?.mobile || targetInfo?.phone_number;
  const targetImage = targetInfo?.profile_picture
    ? (targetInfo.profile_picture.startsWith('http')
      ? targetInfo.profile_picture
      : `${IMG_URL}${targetInfo.profile_picture}`)
    : 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; // Generic user icon

  // Extensive ID search because API structure varies greatly
  const targetId = targetInfo?.id || targetInfo?.user_id || targetInfo?.userId || targetInfo?.driver_id || targetInfo?.user?.id
    || (driver_info?.id || driver_info?.user_id)
    || (trip_summary?.driver_details?.id)
    || (booking_information?.ride?.user_id)
    || (ride_information?.user_id);

  

  const handleCall = () => {
    if (targetPhone) {
      Linking.openURL(`tel:${targetPhone}`);
    } else {
      Alert.alert("Error", `${isDriver ? 'Passenger' : 'Driver'} phone number not available.`);
    }
  };

  const handleMessage = () => {
    console.log("Navigating to ChatScreen with:");
    console.log("  targetId:", targetId);
    console.log("  targetName:", targetName);
    console.log("  rideId:", trip_summary?.ride_id);
    console.log("  tripId:", trip_summary?.booking_id);

    if (!targetId) {
      Alert.alert("Error", "Contact user ID not available");
      console.error("Missing targetId. Info:", targetInfo);
      return;
    }
    navigation.navigate('ChatScreen', {
      driverName: targetName,
      driverImage: targetImage,
      rideId: trip_summary?.ride_id,
      receiverId: targetId, // The ID of the person we are messaging
      tripId: trip_summary?.booking_id,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#248907" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" style={{ marginTop: 30 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride confirmed</Text>
      </View>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        {trip_summary?.pickup_point && trip_summary?.drop_point ? (
          <WebView
            source={{
              uri: `https://www.google.com/maps?q=${encodeURIComponent(trip_summary.pickup_point)}`
            }}
            style={{ flex: 1 }}
          />
        ) : (
          <Image
            source={require('../asset/Image/Map.png')}
            style={styles.mapImage}
            resizeMode="cover"
          />
        )}
      </View>

      {/* Info Section */}
      <View style={styles.content}>
        <View style={styles.driverRow}>
          <Image
            source={{ uri: targetImage }}
            style={styles.driverImage}
          />
          <View>
            <Text style={styles.driverName}>{targetName}</Text>
            <Text style={styles.arrivalText}>
              {isDriver ? 'Passenger' : 'Driver'} • {trip_summary?.departure_time || 'N/A'}
            </Text>
            {!isDriver && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Icon name="star" size={14} color="#FFD700" />
                <Text style={{ marginLeft: 4, fontWeight: '600' }}>{driver_info?.rating || '0.0'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pickup */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconContainer}>
            <Icon name="map-marker" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationAddress} numberOfLines={2}>
              {trip_summary?.pickup_location || trip_summary?.pickup_point || 'Select Pickup'}
            </Text>
          </View>
        </View>

        {/* Dropoff */}
        <View style={styles.locationCard}>
          <View style={styles.locationIconContainer}>
            <Icon name="map-marker" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationLabel}>Dropoff</Text>
            <Text style={styles.locationAddress} numberOfLines={2}>
              {trip_summary?.drop_location || trip_summary?.drop_point || 'Select Dropoff'}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Text style={styles.callText}>Call {isDriver ? 'Passenger' : 'Driver'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
            <Text style={styles.messageText}>Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default MyRidedetails;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#248907',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    marginTop: 30,
  },
  mapContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#eee',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  driverImage: {
    width: 55,
    height: 55,
    borderRadius: 50,
    marginRight: 15,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  arrivalText: {
    color: '#777',
    fontSize: 13,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  locationIconContainer: {
    backgroundColor: '#248907',
    borderRadius: 8,
    padding: 6,
    marginRight: 12,
  },
  locationLabel: {
    fontWeight: '600',
    fontSize: 14,
    color: '#000',
  },
  locationAddress: {
    color: '#555',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#b60000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  callText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  messageText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
