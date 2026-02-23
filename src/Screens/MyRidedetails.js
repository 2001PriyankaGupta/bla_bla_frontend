import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { IMG_URL, GOOGLE_MAPS_API_KEY } from '../config/config';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import axios from 'axios';

const MyRidedetails = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // ─── All data passed from DriverIntarnal ─────────────────────
  const {
    driver_info,
    passenger_info,
    trip_summary,
    booking_information,
    ride_information,
    myRole,           // 'driver' or 'passenger'
    contactPerson,    // already resolved correct person to contact
    contactLabel,     // 'Driver' or 'Passenger'
    openChat,         // if true, open chat screen
  } = route.params || {};

  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [loadingCoords, setLoadingCoords] = useState(true);
  const mapRef = React.useRef(null);
  // ─────────────────────────────────────────────────────────────

  // myRole = 'driver'    → I created the ride → contactPerson = passenger_info
  // myRole = 'passenger' → I booked the ride  → contactPerson = driver_info
  const isIAmDriver = myRole === 'driver';

  // Resolve the person to contact (fallback if contactPerson not passed)
  const resolvedContact = contactPerson
    ? contactPerson
    : isIAmDriver
      ? passenger_info
      : driver_info;

  const targetName = resolvedContact?.name || contactLabel || 'Contact';
  const targetPhone = resolvedContact?.phone || resolvedContact?.mobile || null;
  const targetId = resolvedContact?.id || resolvedContact?.user_id || null;

  const targetImageRaw = resolvedContact?.profile_picture;
  const targetImage = targetImageRaw
    ? (targetImageRaw.startsWith('http')
      ? targetImageRaw
      : `${IMG_URL}${targetImageRaw}`)
    : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  // Geocode address strings to coordinates
  useEffect(() => {
    const fetchCoords = async () => {
      setLoadingCoords(true);
      try {
        const fetchGeocode = async (address) => {
          if (!address) return null;
          const res = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
            params: { address, key: GOOGLE_MAPS_API_KEY }
          });
          if (res.data.results && res.data.results.length > 0) {
            return res.data.results[0].geometry.location;
          }
          return null;
        };

        const pickupAddr = trip_summary?.pickup_point || trip_summary?.pickup_location;
        const dropAddr = trip_summary?.drop_point || trip_summary?.drop_location;

        const [pCoords, dCoords] = await Promise.all([
          fetchGeocode(pickupAddr),
          fetchGeocode(dropAddr)
        ]);

        if (pCoords) {
          setOrigin({ latitude: pCoords.lat, longitude: pCoords.lng });
        }
        if (dCoords) {
          setDestination({ latitude: dCoords.lat, longitude: dCoords.lng });
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      } finally {
        setLoadingCoords(false);
      }
    };

    fetchCoords();

    if (openChat) {
      setTimeout(() => handleMessage(), 400);
    }
  }, []);

  // Short location: sirf pehle 2 parts (comma se)
  const getShortPlace = (loc) => {
    if (!loc) return '—';
    return loc.split(',').slice(0, 2).map(p => p.trim()).join(', ');
  };

  const handleCall = () => {
    if (targetPhone && targetPhone !== 'Not available') {
      const cleanPhone = targetPhone.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${cleanPhone}`).catch(() =>
        Alert.alert('Error', 'Could not open dialer.')
      );
    } else {
      Alert.alert('Not Available', `${targetName}'s phone number is not available.`);
    }
  };

  const handleMessage = () => {
    if (!targetId) {
      Alert.alert('Error', 'Contact user ID not available.');
      return;
    }
    navigation.navigate('ChatScreen', {
      driverName: targetName,
      driverImage: targetImage,
      rideId: trip_summary?.ride_id,
      receiverId: targetId,
      tripId: trip_summary?.booking_id,
    });
  };

  // Shorten long location text
  const shortText = (txt, max = 40) => {
    if (!txt) return '—';
    return txt.length > max ? txt.substring(0, max) + '...' : txt;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left', 'bottom']}>
      <StatusBar barStyle="dark-content" translucent={false} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Confirmed</Text>
      </View>

      {/* ── Map ── */}
      <View style={styles.mapContainer}>
        {loadingCoords ? (
          <View style={[styles.mapImage, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color="#248907" />
          </View>
        ) : origin ? (
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: origin.latitude,
              longitude: origin.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={origin} title="Pickup" pinColor="green" />
            {destination && (
              <>
                <Marker coordinate={destination} title="Drop" pinColor="red" />
                <MapViewDirections
                  origin={origin}
                  destination={destination}
                  apikey={GOOGLE_MAPS_API_KEY}
                  strokeWidth={4}
                  strokeColor="#248907"
                  onReady={(result) => {
                    mapRef.current?.fitToCoordinates(result.coordinates, {
                      edgePadding: { right: scale(30), bottom: scale(30), left: scale(30), top: scale(30) }
                    });
                  }}
                />
              </>
            )}
          </MapView>
        ) : (
          <Image
            source={require('../asset/Image/Map.png')}
            style={styles.mapImage}
            resizeMode="cover"
          />
        )}

        {/* Map overlay: short location name */}
        <View style={styles.mapOverlay}>
          <Icon name="map-marker" size={14} color="#248907" style={{ marginRight: scale(4) }} />
          <Text style={styles.mapOverlayText} numberOfLines={1} ellipsizeMode="tail">
            {getShortPlace(trip_summary?.pickup_point)}
          </Text>
          <Text style={{ color: '#888', marginHorizontal: scale(4) }}>→</Text>
          <Text style={styles.mapOverlayText} numberOfLines={1} ellipsizeMode="tail">
            {getShortPlace(trip_summary?.drop_point)}
          </Text>
        </View>
      </View>

      {/* ── Info Section ── */}
      <View style={styles.content}>

        {/* Person info (Driver or Passenger) */}
        <View style={styles.personRow}>
          <Image source={{ uri: targetImage }} style={styles.personImage} />
          <View style={{ flex: 1 }}>
            <Text style={styles.personName}>{targetName}</Text>
            <Text style={styles.subLabel}>
              {contactLabel || (isIAmDriver ? 'Passenger' : 'Driver')} · {trip_summary?.departure_time || ''}
            </Text>
            {!isIAmDriver && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                <Icon name="star" size={13} color="#FFD700" />
                <Text style={styles.ratingText}>{driver_info?.rating || '0.0'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Pickup */}
        <View style={styles.locationCard}>
          <View style={styles.locationIcon}>
            <Icon name="map-marker" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationAddress} numberOfLines={2} ellipsizeMode="tail">
              {trip_summary?.pickup_location || trip_summary?.pickup_point || '—'}
            </Text>
          </View>
        </View>

        {/* Dropoff */}
        <View style={styles.locationCard}>
          <View style={[styles.locationIcon, { backgroundColor: '#e74c3c' }]}>
            <Icon name="map-marker" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationLabel}>Dropoff</Text>
            <Text style={styles.locationAddress} numberOfLines={2} ellipsizeMode="tail">
              {trip_summary?.drop_location || trip_summary?.drop_point || '—'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Icon name="phone" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.callText}>
              Call {contactLabel || (isIAmDriver ? 'Passenger' : 'Driver')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
            <Icon name="message-text" size={18} color="#fff" style={{ marginRight: 6 }} />
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
    paddingHorizontal: scale(15),
    paddingVertical: verticalScale(14),
    marginTop: 35,
  },
  backBtn: { padding: scale(4) },
  headerTitle: {
    color: '#fff',
    fontSize: responsiveFontSize(17),
    fontWeight: '700',
    marginLeft: scale(10),
  },

  /* Map */
  mapContainer: {
    width: '100%',
    height: verticalScale(200),
    backgroundColor: '#eee'
  },
  mapImage: { width: '100%', height: '100%' },
  mapOverlay: {
    position: 'absolute',
    top: verticalScale(10),
    left: scale(10),
    right: scale(10),
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },
  mapOverlayText: {
    color: '#1a1a1a',
    fontSize: responsiveFontSize(13),
    fontWeight: '600',
    flex: 1,
  },

  /* Content */
  content: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(16),
  },

  /* Person row */
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(18),
  },
  personImage: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    marginRight: scale(14),
    backgroundColor: '#eee',
  },
  personName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#1a1a1a'
  },
  subLabel: {
    color: '#888',
    fontSize: responsiveFontSize(12),
    marginTop: verticalScale(2)
  },
  ratingText: {
    marginLeft: scale(4),
    fontWeight: '600',
    fontSize: responsiveFontSize(13),
    color: '#333'
  },

  /* Location card */
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: '#eee',
  },
  locationIcon: {
    backgroundColor: '#248907',
    borderRadius: moderateScale(8),
    padding: moderateScale(6),
    marginRight: scale(12),
  },
  locationLabel: {
    fontWeight: '600',
    fontSize: responsiveFontSize(13),
    color: '#1a1a1a',
    marginBottom: verticalScale(2)
  },
  locationAddress: {
    color: '#666',
    fontSize: responsiveFontSize(12),
    lineHeight: verticalScale(17)
  },

  /* Buttons */
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(18),
    gap: scale(10),
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b60000',
    paddingVertical: verticalScale(13),
    borderRadius: moderateScale(10),
  },
  callText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: responsiveFontSize(15)
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565c0',
    paddingVertical: verticalScale(13),
    borderRadius: moderateScale(10),
  },
  messageText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: responsiveFontSize(15)
  },
});

