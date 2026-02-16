import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
  Share // Import Share
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, IMG_URL } from '../config/config';

const DriverIntarnal = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId, bookingId } = route.params || {};

  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState('passenger');

  // Fetch Logic
  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');

        // Fetch User Type
        const userDataStr = await AsyncStorage.getItem('user_data');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.user_type) {
            setUserType(userData.user_type);
          }
        }

        const idToFetch = bookingId || tripId;

        if (!idToFetch) {
          Alert.alert("Error", "No Booking/Trip ID provided");
          setLoading(false);
          return;
        }

        const fetchType = bookingId ? 'Booking' : 'Trip';
        console.log(`Fetching ${fetchType} details for ID: ${idToFetch}`);

        const response = await axios.get(`${BASE_URL}trip/${idToFetch}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Trip Data Response:', response.data);

        if (response.data.status === true || response.status === 200) {
          console.log('Trip Data Response:', JSON.stringify(response.data, null, 2));
          setTripData(response.data.data);
        } else {
          console.warn("API returned error status:", response.data);
          Alert.alert("Error", "Failed to load details: " + (response.data.message || "Unknown error"));
        }

      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTripDetails();
  }, [tripId, bookingId]);

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out my ride details! \nFrom: ${tripData?.trip_summary?.pickup_point} \nTo: ${tripData?.trip_summary?.drop_point} \nDate: ${tripData?.trip_summary?.date} \nTime: ${tripData?.trip_summary?.departure_time}`,
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#248907" />
      </SafeAreaView>
    );
  }

  if (!tripData) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ textAlign: 'center', marginTop: 20 }}>No details available.</Text>
      </SafeAreaView>
    );
  }

  // Destructure Data
  const {
    trip_summary,
    booking_information,
    ride_information,
    driver_info,
    passenger_info, // Destructure passenger_info
    car_details,
    pickup_drop_preferences,
    booking_policy,
    contact_options,
    payment_info
  } = tripData;


  const targetInfo = userType === 'driver' ? passenger_info : driver_info;
  const targetImageRaw = targetInfo?.profile_picture;

  const targetImageUri = targetImageRaw
    ? (targetImageRaw.startsWith('http')
      ? targetImageRaw
      : `${IMG_URL}${targetImageRaw}`)
    : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Trip Summary</Text>
          </View>

          <Text style={styles.date}>{trip_summary?.date}</Text>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            {/* Pickup */}
            <View style={styles.timelineRow}>
              <View>
                <Text style={styles.timeText}>{trip_summary?.departure_time}</Text>
                <Text style={styles.placeText}>{trip_summary?.pickup_point}</Text>
                <Text style={styles.subText}>{trip_summary?.pickup_location}</Text>
              </View>
              <View style={styles.iconBox}>
                <Icon name="home-outline" size={24} color="#248907" />
              </View>
            </View>

            {/* Vertical Line */}
            <View style={{ height: 20, borderLeftWidth: 1, borderLeftColor: '#rgba(255,255,255,0.3)', marginLeft: 20, marginVertical: 5 }} />

            {/* Drop */}
            <View style={styles.timelineRow}>
              <View>
                <Text style={styles.timeText}>{trip_summary?.arrival_time}</Text>
                <Text style={styles.placeText}>{trip_summary?.drop_point}</Text>
                <Text style={styles.subText}>{trip_summary?.drop_location}</Text>
              </View>
              <View style={styles.iconBox}>
                <Icon name="map-marker-outline" size={24} color="#248907" />
              </View>
            </View>
          </View>

          <Text style={styles.duration}>{trip_summary?.duration}</Text>
        </View>

        {/* RIDE INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ride Information</Text>
          <View style={styles.whiteBox}>
            <Text style={styles.infoText}>{booking_information?.seats_booked} seats booked ({ride_information?.ride_status})</Text>
            <View style={styles.priceRow}>
              <View style={styles.greenIcon}>
                <Icon name="cash" size={20} color="#fff" />
              </View>
              <Text style={styles.priceText}>{booking_information?.total_price || ride_information?.price_per_seat}</Text>
            </View>
          </View>
        </View>

        {/* PAYMENT INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.whiteBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ color: '#555' }}>Payment Method:</Text>
              <Text style={{ fontWeight: '700', color: '#000' }}>{tripData?.payment_info?.payment_method || 'N/A'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ color: '#555' }}>Status:</Text>
              <Text style={{ fontWeight: '700', color: tripData?.payment_info?.payment_status === 'completed' ? 'green' : 'orange' }}>
                {tripData?.payment_info?.payment_status ? tripData.payment_info.payment_status.toUpperCase() : 'PENDING'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 5, marginTop: 5 }}>
              <Text style={{ color: '#000', fontWeight: 'bold' }}>Total Paid:</Text>
              <Text style={{ fontWeight: '700', color: '#248907' }}>
                {tripData?.payment_info?.amount_paid || '₹0.00'}
              </Text>
            </View>
          </View>
        </View>

        {/* DYNAMIC DRIVER/PASSENGER INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{userType === 'driver' ? 'Passenger' : 'Driver'}</Text>
          <View style={styles.driverCard}>
            <Image source={{ uri: targetImageUri }} style={styles.driverImg} />
            <View style={styles.driverMeta}>
              <Text style={styles.driverName}>{targetInfo?.name}</Text>
              <Text style={styles.driverVerify}>{targetInfo?.verification_status}</Text>
            </View>
          </View>
          {userType === 'passenger' && (
            <Text style={styles.driverStats}>{driver_info?.rating || '0.0'} • {driver_info?.total_rides || 0} rides</Text>
          )}
          <Text style={styles.driverNote}>
            {userType === 'driver'
              ? (targetInfo?.passenger_note ? `Note: ${targetInfo.passenger_note}` : '')
              : (driver_info?.driver_note ? `Driver's note: ${driver_info.driver_note}` : '')}
          </Text>
        </View>

        {/* PREFERENCES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup & Drop Preferences</Text>

          <View style={styles.prefRow}>
            <View>
              <Text style={styles.prefTitle}>Pickup from your Home</Text>
              <Text style={styles.prefSub}>Charges As Per Kilometer</Text>
            </View>
            <Switch
              value={pickup_drop_preferences?.pickup_from_home}
              trackColor={{ false: '#ccc', true: '#248907' }}
              disabled={true}
            />
          </View>

          <View style={styles.prefRow}>
            <View>
              <Text style={styles.prefTitle}>Drop at your Home</Text>
              <Text style={styles.prefSub}>Charges As Per Kilometer</Text>
            </View>
            <Switch
              value={pickup_drop_preferences?.drop_at_home}
              trackColor={{ false: '#ccc', true: '#248907' }}
              disabled={true}
            />
          </View>
        </View>

        {/* POLICY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Policy</Text>
          <Text style={styles.policyText}>
            {booking_policy?.additional_rules?.join('. ') || "No specific rules."}
          </Text>
        </View>

        {/* CONTACT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.actionButtons}>
            {contact_options?.can_contact_driver && (
              <TouchableOpacity
                style={styles.btnRed}
                onPress={() => navigation.navigate("MyRidedetails", {
                  driver_info,
                  passenger_info, // Pass passenger info
                  trip_summary,
                  booking_information,
                  ride_information, // Pass ride_information too
                  tripData,
                  // Pass driverId explicitly (from previous screen or wherever we can find it)
                  driverId: route.params?.driverId || driver_info?.id || driver_info?.user_id
                })}
              >
                <Text style={styles.btnText}>{userType === 'driver' ? 'Contact Passenger' : 'Contact Driver'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnBlue} onPress={handleShare}>
              <Text style={styles.btnText}>Share Ride</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FOOTER BUTTON */}
        <View style={{ padding: 20 }}>
          <TouchableOpacity style={styles.greenBtn} onPress={() => navigation.navigate("Home")}>
            <Text style={styles.btnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default DriverIntarnal;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 0 // Added extra margin/padding as requested
  },
  header: { backgroundColor: '#248907', padding: 20, paddingBottom: 30, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginLeft: 15 },
  date: { color: '#fff', fontSize: 14, marginBottom: 15 },

  timelineContainer: { marginTop: 10 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  timeText: { color: '#fff', fontWeight: '700', fontSize: 13, marginBottom: 2 },
  placeText: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 2 },
  subText: { color: '#e0e0e0', fontSize: 12, maxWidth: 250 },
  iconBox: { backgroundColor: '#fff', padding: 8, borderRadius: 8 },
  duration: { color: '#fff', textAlign: 'center', marginTop: 15, fontWeight: '600' },

  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 15 },

  whiteBox: { backgroundColor: '#fff', elevation: 2, padding: 15, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  infoText: { color: '#333', marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  greenIcon: { backgroundColor: '#248907', padding: 5, borderRadius: 5, marginRight: 10 },
  priceText: { fontSize: 16, fontWeight: '700', color: '#333' },

  driverCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  driverImg: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  driverMeta: { flex: 1 },
  driverName: { fontWeight: '700', fontSize: 16, color: '#000' },
  driverVerify: { color: '#248907', fontSize: 12 },
  driverStats: { fontWeight: '600', color: '#333', marginBottom: 5 },
  driverNote: { color: '#555', fontSize: 13, lineHeight: 18 },

  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  prefTitle: { fontWeight: '600', color: '#000' },
  prefSub: { fontSize: 12, color: '#777' },

  policyText: { color: '#555', lineHeight: 20 },

  actionButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btnRed: { backgroundColor: '#d32f2f', flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginRight: 10 },
  btnBlue: { backgroundColor: '#1976d2', flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  greenBtn: { backgroundColor: '#248907', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' }
});
