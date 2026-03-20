import React, { useState, useEffect } from 'react';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
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
  Switch,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, IMG_URL } from '../config/config';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const DriverIntarnal = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { tripId, bookingId } = route.params || {};

  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedInUserId, setLoggedInUserId] = useState(null);

  const handleStatusUpdate = async (status) => {
    const bId = tripData?.booking_information?.id || bookingId;
    if (!bId) {
      Alert.alert('Error', 'Booking ID is missing');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.post(
        `${BASE_URL}booking/${bId}/status`,
        {
          status: status,
          rejection_reason: status === 'rejected' ? 'Rejected by driver' : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status) {
        Alert.alert('Success', `Ride status updated to ${status}`);
        init();
      } else {
        Alert.alert('Error', response.data.message || response.data.error || 'Failed to update status');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Update Status Error:', error);
      const serverMsg = error.response?.data?.message || error.response?.data?.error || error.response?.data?.errors;
      const finalMsg = typeof serverMsg === 'object' ? JSON.stringify(serverMsg) : serverMsg;
      Alert.alert('Error', finalMsg || 'Something went wrong while updating status');
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = () => handleStatusUpdate('completed');

  const init = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');

      // Get logged-in user's ID
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setLoggedInUserId(userData.id);
      }

      const idToFetch = bookingId || tripId;
      if (!idToFetch) {
        Alert.alert('Error', 'No Booking/Trip ID provided');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${BASE_URL}trip/${idToFetch}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.status === true || response.status === 200) {
        setTripData(response.data.data);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to load details');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, [tripId, bookingId]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Ride: ${tripData?.trip_summary?.pickup_point} → ${tripData?.trip_summary?.drop_point}\nDate: ${tripData?.trip_summary?.date} | Time: ${tripData?.trip_summary?.departure_time}`,
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      Alert.alert(error.message);
    }
  };

  if (loading && !tripData) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#248907" />
      </SafeAreaView>
    );
  }

  if (!tripData) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorBox}>
          <Icon name="alert-circle-outline" size={60} color="#ddd" />
          <Text style={styles.errorText}>No details available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const {
    trip_summary,
    booking_information,
    ride_information,
    driver_info,
    passenger_info,
    pickup_drop_preferences,
    booking_policy,
  } = tripData;

  // ─── CONTACT LOGIC (no user_type, use ID comparison) ──────────
  const isIAmPassenger = loggedInUserId && String(loggedInUserId) === String(passenger_info?.id);
  const isIAmDriver = loggedInUserId && String(loggedInUserId) === String(driver_info?.id);
  const contactPerson = isIAmPassenger ? driver_info : passenger_info;
  const contactLabel = isIAmPassenger ? 'Driver' : 'Passenger';
  // ──────────────────────────────────────────────────────────────

  const contactImageRaw = contactPerson?.profile_picture;
  const contactImageUri = contactImageRaw
    ? contactImageRaw.startsWith('http') ? contactImageRaw : `${IMG_URL}${contactImageRaw}`
    : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  // Show only first 2 comma parts of address
  const shortPlace = (loc) => {
    if (!loc) return '—';
    const parts = loc.split(',').map(p => p.trim()).filter(Boolean);
    return parts.slice(0, 2).join(', ');
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return '#2980b9';
      case 'pending': return '#e67e22';
      case 'cancelled': return '#e74c3c';
      case 'completed': return '#1fa000';
      default: return '#888';
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#248907" translucent={false} />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ══ HEADER ══════════════════════════════════════════════ */}
        <View style={[styles.header, { paddingTop: insets.top + verticalScale(16) }]}>

          {/* Back + Title */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Icon name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Trip Summary</Text>
          </View>

          <Text style={styles.dateText}>{trip_summary?.date}</Text>

          {/* ── Timeline Card ── */}
          <View style={styles.timelineCard}>

            {/* Pickup */}
            <View style={styles.tlRow}>
              {/* Left: dot + line */}
              <View style={styles.tlDotCol}>
                <View style={styles.dotGreen} />
                <View style={styles.tlLine} />
                <View style={styles.tlLine} />
              </View>
              {/* Middle: text */}
              <View style={styles.tlTextCol}>
                <Text style={styles.tlTime}>{trip_summary?.departure_time}</Text>
                <Text style={styles.tlPlace} numberOfLines={2} ellipsizeMode="tail">
                  {shortPlace(trip_summary?.pickup_point)}
                </Text>
              </View>
              {/* Right: icon */}
              <View style={styles.tlIcon}>
                <Icon name="circle-slice-8" size={16} color="#248907" />
              </View>
            </View>

            {/* Divider space */}
            <View style={{ height: 6 }} />

            {/* Drop */}
            <View style={styles.tlRow}>
              <View style={styles.tlDotCol}>
                <View style={styles.dotRed} />
              </View>
              <View style={styles.tlTextCol}>
                <Text style={styles.tlTime}>{trip_summary?.arrival_time}</Text>
                <Text style={styles.tlPlace} numberOfLines={2} ellipsizeMode="tail">
                  {shortPlace(trip_summary?.drop_point)}
                </Text>
              </View>
              <View style={styles.tlIcon}>
                <Icon name="map-marker" size={16} color="#e74c3c" />
              </View>
            </View>

          </View>

          {/* Duration chip */}
          <View style={styles.durationChip}>
            <Icon name="clock-outline" size={14} color="#248907" />
            <Text style={styles.durationText}> {trip_summary?.duration || '—'}</Text>
          </View>

        </View>
        {/* ══ END HEADER ═════════════════════════════════════════ */}


        {/* ── Ride Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ride Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="seat-passenger" label="Seats Booked" value={String(booking_information?.seats_booked ?? '—')} />
            <View style={styles.divider} />
            <InfoRow icon="cash" label="Total Price" value={booking_information?.total_price ?? '—'} valueColor="#248907" />
            <View style={styles.divider} />
            <InfoRow
              icon="tag-outline"
              label="Status"
              value={(booking_information?.booking_status ?? '—').toUpperCase()}
              valueColor={getStatusColor(booking_information?.booking_status)}
            />
          </View>
        </View>


        {/* ── Payment Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="credit-card-outline" label="Method" value={tripData?.payment_info?.payment_method || 'Cash'} />
            <View style={styles.divider} />
            <InfoRow
              icon="check-circle-outline"
              label="Status"
              value={(tripData?.payment_info?.payment_status || 'PENDING').toUpperCase()}
              valueColor={getStatusColor(tripData?.payment_info?.payment_status || 'pending')}
            />
            <View style={styles.divider} />
            <InfoRow icon="wallet-outline" label="Total Paid" value={tripData?.payment_info?.amount_paid || '₹0.00'} valueColor="#248907" bold />
          </View>
        </View>

        {/* ── REVIEW SECTION (New) ── */}
        {booking_information?.booking_status?.toLowerCase() === 'completed' && booking_information.has_reviewed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Review</Text>
            <View style={styles.reviewShowCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Icon
                      key={i}
                      name={i <= booking_information.my_review.rating ? "star" : "star-outline"}
                      size={16}
                      color="#f39c12"
                    />
                  ))}
                </View>
                <Text style={styles.reviewDateText}>{booking_information.my_review.created_at}</Text>
              </View>
              <Text style={styles.reviewCommentText}>"{booking_information.my_review.comment || 'No comment left.'}"</Text>
            </View>
          </View>
        )}


        {/* ── Contact Person (Driver / Passenger) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{contactLabel}</Text>
          <View style={styles.personCardOuter}>
            <View style={styles.personCard}>
              <Image source={{ uri: contactImageUri }} style={styles.personImg} />
              <View style={{ flex: 1 }}>
                <Text style={styles.personName}>{contactPerson?.name || contactLabel}</Text>
                <Text style={styles.personTag}>
                  {contactPerson?.verification_status || (isIAmPassenger ? 'Verified Driver' : 'Verified Passenger')}
                </Text>
                {isIAmPassenger && (
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={13} color="#f5a623" />
                    <Text style={styles.ratingText}> {driver_info?.rating || '0.0'} · {driver_info?.total_rides || 0} rides</Text>
                  </View>
                )}
              </View>
            </View>
            {isIAmPassenger && driver_info?.driver_note ? (
              <Text style={styles.noteText}>"{driver_info.driver_note}"</Text>
            ) : null}
          </View>
        </View>


        {/* ── Preferences ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup & Drop Preferences</Text>
          <View style={styles.prefCard}>
            <View style={styles.prefRow}>
              <View style={styles.prefIconWrap}>
                <Icon name="home-map-marker" size={18} color="#248907" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prefTitle}>Pickup from Home</Text>
                <Text style={styles.prefSub}>Charges As Per Kilometer</Text>
              </View>
              <Switch value={pickup_drop_preferences?.pickup_from_home ?? true} trackColor={{ false: '#ccc', true: '#a5d6a7' }} thumbColor={pickup_drop_preferences?.pickup_from_home ? '#248907' : '#f4f3f4'} disabled />
            </View>
            <View style={styles.prefDivider} />
            <View style={styles.prefRow}>
              <View style={styles.prefIconWrap}>
                <Icon name="map-marker-check" size={18} color="#248907" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prefTitle}>Drop at Home</Text>
                <Text style={styles.prefSub}>Charges As Per Kilometer</Text>
              </View>
              <Switch value={pickup_drop_preferences?.drop_at_home ?? true} trackColor={{ false: '#ccc', true: '#a5d6a7' }} thumbColor={pickup_drop_preferences?.drop_at_home ? '#248907' : '#f4f3f4'} disabled />
            </View>
          </View>
        </View>


        {/* ── Policy ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Policy</Text>
          <View style={styles.policyCard}>
            <Icon name="shield-check-outline" size={18} color="#248907" style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={styles.policyText}>
              {booking_policy?.additional_rules?.join('. ') || 'No specific rules.'}
            </Text>
          </View>
        </View>


        {/* ── Contact Buttons ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact {contactLabel}</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.btnRed}
              onPress={() => navigation.navigate('MyRidedetails', {
                driver_info,
                passenger_info,
                trip_summary,
                booking_information,
                ride_information,
                tripData,
                isIAmPassenger,
                contactPerson,
                contactLabel,
              })}>
              <Icon name="phone" size={16} color="#fff" />
              <Text style={styles.btnTxt}>  Call {contactLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnBlue}
              onPress={() => navigation.navigate('MyRidedetails', {
                driver_info,
                passenger_info,
                trip_summary,
                booking_information,
                ride_information,
                tripData,
                isIAmPassenger,
                contactPerson,
                contactLabel,
                openChat: true,
              })}>
              <Icon name="message-text-outline" size={16} color="#fff" />
              <Text style={styles.btnTxt}>  Message</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnShare} onPress={handleShare}>
            <Icon name="share-variant" size={16} color="#248907" />
            <Text style={[styles.btnTxt, { color: '#248907' }]}>  Share Ride</Text>
          </TouchableOpacity>
        </View>


        {/* ── Action Buttons (Mark Complete / Rate) ── */}
        <View style={{ padding: 20 }}>

          {/* Driver: Confirm/Reject Buttons (for Pending) */}
          {isIAmDriver && booking_information?.booking_status?.toLowerCase() === 'pending' && (
            <View style={[styles.btnRow, { marginBottom: 12 }]}>
              <TouchableOpacity
                style={[styles.btnGreen, { flex: 1 }]}
                onPress={() => {
                  Alert.alert('Confirm Booking', 'Are you sure you want to confirm this booking?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Confirm', onPress: () => handleStatusUpdate('confirmed') }
                  ]);
                }}>
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.btnTxt}>  Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnRed, { flex: 1 }]}
                onPress={() => {
                  Alert.alert('Reject Booking', 'Are you sure you want to reject this booking?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Reject', onPress: () => handleStatusUpdate('rejected') }
                  ]);
                }}>
                <Icon name="close" size={18} color="#fff" />
                <Text style={styles.btnTxt}>  Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Driver: Mark Complete Button */}
          {isIAmDriver && booking_information?.booking_status?.toLowerCase() === 'confirmed' && (
            <TouchableOpacity
              style={[styles.btnGreen, { marginBottom: 12, backgroundColor: '#1fa000' }]}
              onPress={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let tripDate = null;
                if (trip_summary?.date) {
                  // Normalize standard string formats or split explicitly if DD-MM-YYYY
                  // Just rely on new Date() to handle YYYY-MM-DD
                  const parts = trip_summary.date.split('-');
                  if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
                    // Format DD-MM-YYYY
                    tripDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                  } else {
                    tripDate = new Date(trip_summary.date);
                  }
                  if (tripDate && !isNaN(tripDate.getTime())) {
                    tripDate.setHours(0, 0, 0, 0);
                    if (today < tripDate) {
                      Alert.alert('Action Not Allowed', 'You cannot mark the ride as completed before the scheduled date.');
                      return;
                    }
                  }
                }

                Alert.alert(
                  'Complete Ride',
                  'Are you sure you want to mark this ride as completed?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Mark Complete', onPress: markAsCompleted }
                  ]
                );
              }}>
              <Icon name="check-all" size={18} color="#fff" />
              <Text style={styles.btnTxt}>  Mark as Completed</Text>
            </TouchableOpacity>
          )}

          {/* Passenger: Rate Ride Button */}
          {isIAmPassenger && booking_information?.booking_status?.toLowerCase() === 'completed' && !booking_information.has_reviewed && (
            <TouchableOpacity
              style={[styles.btnGreen, { marginBottom: 12, backgroundColor: '#f39c12' }]}
              onPress={() => navigation.navigate('AddReviewScreen', {
                bookingId: booking_information.id,
                targetRole: 'driver',
                driverId: driver_info?.id
              })}>
              <Icon name="star-outline" size={18} color="#fff" />
              <Text style={styles.btnTxt}>  Rate Your Experience</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnGreen} onPress={() => navigation.navigate('Home')}>
            <Icon name="home-outline" size={18} color="#fff" />
            <Text style={styles.btnTxt}>  Go to Home</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// ── Reusable row component ──────────────────────────────────────
const InfoRow = ({ icon, label, value, valueColor, bold }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Icon name={icon} size={16} color="#248907" />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueColor && { color: valueColor }, bold && { fontWeight: '700' }]}>
      {value}
    </Text>
  </View>
);

export default DriverIntarnal;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(80)
  },
  errorText: {
    color: '#aaa',
    fontSize: responsiveFontSize(15),
    marginTop: verticalScale(10)
  },

  /* ── Header ── */
  header: {
    backgroundColor: '#248907',
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(22),
    borderBottomLeftRadius: moderateScale(24),
    borderBottomRightRadius: moderateScale(24),

  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8)
  },
  backBtn: {
    padding: scale(4),
    marginRight: scale(10)
  },
  headerTitle: {
    color: '#fff',
    fontSize: responsiveFontSize(18),
    fontWeight: '700'
  },
  dateText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: responsiveFontSize(13),
    marginBottom: verticalScale(14),
    fontWeight: '500'
  },

  /* ── Timeline card ── */
  timelineCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tlDotCol: {
    width: scale(20),
    alignItems: 'center',
    marginRight: scale(10),
    paddingTop: verticalScale(3),
  },
  dotGreen: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#fff',
    borderWidth: 2.5,
    borderColor: '#a5d6a7'
  },
  dotRed: {
    width: scale(12),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#ff6b6b',
    borderWidth: 2.5,
    borderColor: 'rgba(255,107,107,0.4)'
  },
  tlLine: {
    width: 2,
    height: verticalScale(10),
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 1
  },
  tlTextCol: {
    flex: 1,
    marginRight: scale(10),
  },
  tlTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: responsiveFontSize(11),
    marginBottom: verticalScale(2),
    fontWeight: '500'
  },
  tlPlace: {
    color: '#fff',
    fontWeight: '700',
    fontSize: responsiveFontSize(13.5),
    lineHeight: verticalScale(19),
  },
  tlIcon: {
    width: scale(32),
    height: scale(32),
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(2),
  },

  /* Duration chip */
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: verticalScale(14),
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(20),
  },
  durationText: {
    color: '#248907',
    fontSize: responsiveFontSize(13),
    fontWeight: '700'
  },

  /* ── Section ── */
  section: {
    backgroundColor: '#fff',
    marginTop: verticalScale(10),
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(16)
  },
  sectionTitle: {
    fontSize: responsiveFontSize(15),
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: verticalScale(14)
  },

  /* ── Info card ── */
  infoCard: {
    backgroundColor: '#f8f9fb',
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(14),
    borderWidth: 1,
    borderColor: '#eee',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(13)
  },
  infoIconWrap: {
    width: scale(30),
    height: scale(30),
    borderRadius: moderateScale(8),
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  infoLabel: {
    flex: 1,
    color: '#666',
    fontSize: responsiveFontSize(13),
    fontWeight: '500'
  },
  infoValue: {
    color: '#1a1a1a',
    fontSize: responsiveFontSize(13),
    fontWeight: '600'
  },
  divider: { height: 1, backgroundColor: '#f0f0f0' },

  /* ── Person card ── */
  personCardOuter: {
    backgroundColor: '#f8f9fb',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: '#eee',
  },
  personCard: { flexDirection: 'row', alignItems: 'center' },
  personImg: {
    width: scale(54),
    height: scale(54),
    borderRadius: scale(27),
    marginRight: scale(14),
    backgroundColor: '#e0e0e0',
    borderWidth: 2,
    borderColor: '#e8f5e9'
  },
  personName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#1a1a1a'
  },
  personTag: {
    color: '#248907',
    fontSize: responsiveFontSize(12),
    marginTop: verticalScale(2),
    fontWeight: '500'
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(4) },
  ratingText: {
    fontSize: responsiveFontSize(12),
    color: '#555',
    fontWeight: '600'
  },
  noteText: {
    color: '#777',
    fontSize: responsiveFontSize(12),
    fontStyle: 'italic',
    lineHeight: verticalScale(18),
    marginTop: verticalScale(10),
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },

  /* ── Preferences ── */
  prefCard: {
    backgroundColor: '#f8f9fb',
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(4),
    borderWidth: 1,
    borderColor: '#eee',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12)
  },
  prefIconWrap: {
    width: scale(34),
    height: scale(34),
    borderRadius: moderateScale(10),
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  prefTitle: {
    fontWeight: '600',
    color: '#1a1a1a',
    fontSize: responsiveFontSize(13)
  },
  prefSub: {
    fontSize: responsiveFontSize(11),
    color: '#aaa',
    marginTop: verticalScale(2)
  },
  prefDivider: { height: 1, backgroundColor: '#f0f0f0' },

  /* ── Policy ── */
  policyCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fb',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: '#eee',
  },
  policyText: {
    flex: 1,
    color: '#666',
    lineHeight: verticalScale(20),
    fontSize: responsiveFontSize(13)
  },

  /* ── Buttons ── */
  btnRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: verticalScale(10)
  },
  btnRed: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c62828',
    paddingVertical: verticalScale(13),
    borderRadius: moderateScale(12),
    elevation: 2,
    shadowColor: '#c62828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  btnBlue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565c0',
    paddingVertical: verticalScale(13),
    borderRadius: moderateScale(12),
    elevation: 2,
    shadowColor: '#1565c0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  btnShare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#248907',
    paddingVertical: verticalScale(11),
    borderRadius: moderateScale(12),
    backgroundColor: '#f1f8e9',
  },
  btnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#248907',
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
    elevation: 3,
    shadowColor: '#248907',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  btnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: responsiveFontSize(14)
  },
  /* ── Review Style ── */
  reviewShowCard: {
    backgroundColor: '#fff9ef',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  starRow: { flexDirection: 'row' },
  reviewDateText: { fontSize: responsiveFontSize(11), color: '#999' },
  reviewCommentText: {
    fontSize: responsiveFontSize(13),
    color: '#555',
    fontStyle: 'italic',
    lineHeight: verticalScale(18)
  },
});

