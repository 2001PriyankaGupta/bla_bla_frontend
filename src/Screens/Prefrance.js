import React, { useState } from 'react';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
  Modal,
  TextInput,
  Alert,
  ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import RazorpayCheckout from 'react-native-razorpay';
import { BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------------- SEAT ITEM ---------------- */
const renderSeat = (item, selectedSeats, handleSelectSeat, currentPrice) => {
  const isSelected = selectedSeats.includes(item.id);
  const isBooked = item.booked;

  return (
    <TouchableOpacity
      key={item.id}
      style={styles.seatContainer}
      onPress={() => handleSelectSeat(item)}
      disabled={isBooked}
    >
      <Image
        source={item.img}
        style={[
          styles.seatImage,
          isBooked && { tintColor: '#777' },
          isSelected && { tintColor: '#248907' }
        ]}
      />
      <Text style={styles.seatPrice}>Rs {currentPrice}</Text>
    </TouchableOpacity>
  );
};

const SeatSelection = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { rideData, searchPickup, searchDrop } = route.params || {};

  /* ---------------- SEAT ARRAY ---------------- */
  // Use rideData seats if available, else default to 5
  const totalCount = rideData?.seats || rideData?.total_seats || 5;
  const pricePerSeat = rideData?.price || rideData?.price_per_seat || 0;

  // We'll calculate seats dynamically based on current selected drop
  const getSeats = (avail) => {
    const bookedCount = totalCount - avail;
    return Array.from({ length: totalCount }, (_, i) => ({
      id: i + 1,
      price: parseFloat(pricePerSeat),
      img: require('../asset/Image/seat.png'),
      booked: i < bookedCount
    }));
  };

  /* ---------------- SEARCH SEGMENT LOGIC ---------------- */
  // Find which stops are AFTER our current pickup to show only valid drop points
  const currentPickup = searchPickup || rideData?.pickup_point;
  const stopPoints = rideData?.stop_points || [];

  // We need to know the sequence of stops to filter them
  const normalizeCity = (name) => name?.toLowerCase()?.split(',')[0]?.trim() || '';
  const normalizedPickup = normalizeCity(currentPickup);

  const pickupIdxInStops = stopPoints.findIndex(s => normalizeCity(s.city_name) === normalizedPickup);

  // Valid drops are after the current pickup
  const validStops = stopPoints.filter((s, idx) => {
    const normalizedMainPickup = normalizeCity(rideData?.pickup_point);
    // If our pickup is the main pickup, all stops are valid
    if (normalizedPickup === normalizedMainPickup) return true;
    // Else only stops with index > current pickup's index in stopPoints are valid
    return idx > pickupIdxInStops;
  });

  /* ---------------- STATES ---------------- */
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [dropType, setDropType] = useState('main'); // 'main' or 'stop'
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [currentAvail, setCurrentAvail] = useState(rideData?.available_seats || totalCount);

  const seats = getSeats(currentAvail);

  React.useEffect(() => {
    AsyncStorage.getItem('user_data').then(data => {
      if (data) {
        setLoggedInUserId(JSON.parse(data).id);
      }
    });
  }, []);

  /* ---------------- BOOKING FUNCTION ---------------- */
  const processBooking = async (paymentMode) => {
    if (!rideData?.id) {
      Alert.alert("Error", "Ride details missing.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');

      // Determine final drop point
      let finalDrop = searchDrop || rideData.drop_point;
      let finalStopId = null;

      if (dropType === 'stop' && selectedStopId !== null && rideData.stop_availabilities) {
        const stop = rideData.stop_availabilities[selectedStopId];
        if (stop) {
          finalDrop = stop.city_name;
          // Final Stop ID might not be available in simple search results, 
          // but the backend uses the string names to match the segment.
        }
      }

      const payload = {
        seats: selectedSeats.length,
        special_requests: "",
        payment_method: paymentMode,
        pickup_point: searchPickup || rideData.pickup_point,
        drop_point: finalDrop
      };

      console.log('Original Payload:', payload);

      // 1. Create Booking
      const response = await axios.post(`${BASE_URL}trip/${rideData.id}/book`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Booking Response:', response.data);

      if (response.data.status === true || response.status === 200 || response.status === 201) {
        const responseData = response.data;
        const bookingId = responseData.data?.booking_id || responseData.data?.id || responseData.booking?.id;
        console.log("Extracted Booking ID:", bookingId);

        if (paymentMode === 'cash') {
          // CASH FLOW: Finish here
          Alert.alert("Success", "Ride booked successfully (Cash)!", [
            { text: "OK", onPress: () => navigation.navigate("YourRides") }
          ]);
        } else {
          // ONLINE FLOW: Initiate Razorpay
          handleRazorpayPayment(bookingId, totalPrice, token);
        }

      } else {
        Alert.alert("Booking Failed", response.data.message || "Could not book ride.");
      }

    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error("Booking Error:", error);
      if (error.response) {
        Alert.alert("Error", error.response.data.message || "Booking failed.");
      } else {
        Alert.alert("Error", "Network error or server not reachable.");
      }
    } finally {
      if (paymentMode === 'cash') setLoading(false);
      // For online, keep loading until payment finishes or fails
    }
  };

  const handleRazorpayPayment = (bookingId, amount, token) => {
    // Amount is in rupees, Razorpay expects paise
    const options = {
      description: 'Ride Booking Payment',
      image: 'https://i.imgur.com/3g7nmJC.png', // Optional: Add app logo
      currency: 'INR',
      key: 'rzp_test_oZWpPCp1BkgtEg', // Provided Test Key
      amount: amount * 100,
      name: 'Travel App',
      prefill: {
        email: 'user@example.com', // Retrieve actual user email if available
        contact: '9999999999', // Retrieve actual user phone if available
        name: 'User Name'
      },
      theme: { color: '#248907' }
    };

    RazorpayCheckout.open(options).then(async (data) => {
      // handle success
      console.log(`Success: ${data.razorpay_payment_id}`);

      // Verify payment on backend
      try {
        const verifyPayload = {
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: data.razorpay_order_id,
          razorpay_signature: data.razorpay_signature,
          booking_id: bookingId
        };

        await axios.post(`${BASE_URL}payment/verify`, verifyPayload, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        Alert.alert("Payment Successful", "Your ride has been confirmed!", [
          { text: "OK", onPress: () => navigation.navigate("YourRides") }
        ]);

      } catch (err) {
        console.error("Verification Error", err);
        Alert.alert("Payment Verified Failed", "Payment went through but verification failed. Please contact support.");
      } finally {
        setLoading(false);
      }

    }).catch(async (error) => {
      // handle failure
      console.log("Razorpay Error", error);

      // DELETE the failed booking so it doesn't stay in "My Rides"
      try {
        await axios.delete(`${BASE_URL}booking/${bookingId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Failed booking deleted successfully");
      } catch (delErr) {
        console.log("Error deleting failed booking:", delErr);
      }

      Alert.alert("Payment Failed", "Your payment failed, so the booking was not created. Please try again.");
      setLoading(false);
    });
  };

  const confirmBooking = () => {
    if (loggedInUserId && rideData && (rideData.driver_id == loggedInUserId || (rideData.car && rideData.car.user_id == loggedInUserId))) {
      Alert.alert('Action Denied', 'You are the driver of this ride; you cannot book your own ride.');
      return;
    }

    Alert.alert(
      "Payment Method",
      `Total Amount: Rs ${totalPrice}\nSelect how you want to pay:`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Cash", onPress: () => processBooking('cash') },
        { text: "Online", onPress: () => processBooking('online') }
      ]
    );
  };

  /* ---------------- SELECT SEAT ---------------- */
  const handleSelectSeat = (seat) => {
    if (seat.booked) return;

    if (selectedSeats.includes(seat.id)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seat.id));
    } else {
      setSelectedSeats([...selectedSeats, seat.id]);
    }
  };

  /* ---------------- PRICE CALCULATION ---------------- */
  let currentPricePerSeat = pricePerSeat;
  if (dropType === 'stop' && selectedStopId !== null && rideData?.stop_availabilities) {
    const stop = rideData.stop_availabilities[selectedStopId];
    if (stop) currentPricePerSeat = parseFloat(stop.price);
  } else if (dropType === 'main' && rideData?.stop_availabilities) {
    // Find main drop in stop_availabilities for safety
    const mainStop = rideData.stop_availabilities.find(s => normalizeCity(s.city_name) === normalizeCity(searchDrop || rideData.drop_point));
    if (mainStop) currentPricePerSeat = parseFloat(mainStop.price);
  }

  const totalPrice = selectedSeats.length * currentPricePerSeat;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.locationBox}>
          <Text style={styles.locationText}>
            {rideData ? `${(searchPickup || rideData.pickup_point || '').split(',')[0]} → ${(searchDrop || rideData.drop_point || '').split(',')[0]}` : 'Ride Selection'}
          </Text>
          <Icon name="bell-outline" size={24} color="#248907" />
        </View>

        <View style={styles.filterBox}>
          <Text style={styles.filterText}>Today, {selectedSeats.length} Passenger</Text>

          <TouchableOpacity style={styles.filterButton}>
            <Icon name="filter-variant" size={20} color="#fff" />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Book Your Preferred Seat</Text>
        </View>

        {/* ── Drop Point Selection ── */}
        <View style={styles.destinationCard}>
          <Text style={styles.destLabel}>Select Drop Point:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
            {/* We'll use stop_availabilities if provided by backend, it's more accurate */}
            {(rideData?.stop_availabilities || []).length > 0 ? (
              (rideData.stop_availabilities).map((stop, idx) => {
                const isMain = normalizeCity(stop.city_name) === normalizeCity(searchDrop || rideData.drop_point);
                const isActive = isMain ? dropType === 'main' : (selectedStopId === idx);

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.destPill, isActive && styles.destPillActive]}
                    onPress={() => {
                      if (isMain) {
                        setDropType('main');
                        setSelectedStopId(null);
                      } else {
                        setDropType('stop');
                        setSelectedStopId(idx); // uses index as ID for stop_availabilities
                      }
                      setCurrentAvail(stop.available_seats);
                      setSelectedSeats([]); // Clear selected seats when switching segment
                    }}
                  >
                    <Icon name="map-marker" size={16} color={isActive ? '#fff' : '#248907'} />
                    <Text style={[styles.destText, isActive && { color: '#fff' }]}>
                      {stop.city_name?.split(',')[0]} (₹{stop.price})
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <>
                {/* Fallback to old UI if stop_availabilities not present */}
                <TouchableOpacity
                  style={[styles.destPill, dropType === 'main' && styles.destPillActive]}
                  onPress={() => { setDropType('main'); setSelectedStopId(null); }}
                >
                  <Icon name="map-marker" size={16} color={dropType === 'main' ? '#fff' : '#248907'} />
                  <Text style={[styles.destText, dropType === 'main' && { color: '#fff' }]}>
                    {(searchDrop || rideData?.drop_point)?.split(',')[0]} (₹{pricePerSeat})
                  </Text>
                </TouchableOpacity>

                {(validStops || []).map((stop) => (
                  <TouchableOpacity
                    key={stop.id}
                    style={[styles.destPill, dropType === 'stop' && selectedStopId === stop.id && styles.destPillActive]}
                    onPress={() => { setDropType('stop'); setSelectedStopId(stop.id); }}
                  >
                    <Icon name="map-marker-outline" size={16} color={selectedStopId === stop.id ? '#fff' : '#555'} />
                    <Text style={[styles.destText, selectedStopId === stop.id && { color: '#fff' }]}>
                      {stop.city_name?.split(',')[0]} (₹{stop.price_from_pickup})
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </View>

        {/* SEAT AREA - Dynamic Grid */}
        <View style={styles.seatArea}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {seats.map((s) => (
              <View key={s.id} style={{ margin: 10 }}>
                {renderSeat(s, selectedSeats, handleSelectSeat, currentPricePerSeat)}
              </View>
            ))}
          </View>
        </View>

        {/* CONFIRM BUTTON */}
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: selectedSeats.length > 0 && !loading ? '#248907' : '#a0a0a0' }
          ]}
          disabled={selectedSeats.length === 0 || loading}
          onPress={confirmBooking}
        >
          <Text style={styles.nextText}>{loading ? "Booking..." : `Confirm Booking - Rs ${totalPrice}`}</Text>
        </TouchableOpacity>
      </View>



    </SafeAreaView>
  );
};

export default SeatSelection;

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    backgroundColor: '#248907',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    marginTop: 20,
  },

  locationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },

  filterBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  filterText: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },

  filterButton: {
    backgroundColor: '#248907',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
  },

  filterButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
  },

  body: {
    flex: 1,
    padding: 20,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },

  seatArea: {
    alignItems: 'center',
    marginTop: 20,
  },

  singleSeatRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 30,
  },

  seatContainer: {
    alignItems: 'center',
  },

  seatImage: {
    width: 55,
    height: 55,
    resizeMode: 'contain',
  },

  seatPrice: {
    fontSize: 13,
    marginTop: 5,
    color: '#333',
  },

  nextButton: {
    marginTop: 20,
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },

  nextText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalBox: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    elevation: 10,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },

  seatCountText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: "#000",
  },

  confirmBtn: {
    backgroundColor: '#248907',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },

  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Stop Point UI Styles
  destinationCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  destLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  destPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  destPillActive: {
    backgroundColor: '#248907',
    borderColor: '#248907',
  },
  destText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 5,
    fontWeight: '600',
  },
  closeModal: {
    marginTop: 10,
    alignItems: 'center',
  },

  closeText: {
    fontSize: 15,
    color: '#248907',
    fontWeight: '600',
  },
});
