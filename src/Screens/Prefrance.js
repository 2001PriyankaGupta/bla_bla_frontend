import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import RazorpayCheckout from 'react-native-razorpay';
import { BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------------- SEAT ITEM ---------------- */
const renderSeat = (item, selectedSeats, handleSelectSeat) => {
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
      <Text style={styles.seatPrice}>Rs {item.price}</Text>
    </TouchableOpacity>
  );
};

const SeatSelection = ({ route }) => {
  const navigation = useNavigation();
  const { rideData } = route.params || {};

  /* ---------------- SEAT ARRAY ---------------- */
  // Use rideData seats if available, else default to 5
  // Check both 'seats' and 'total_seats' keys
  const totalCount = rideData?.seats || rideData?.total_seats || 5;
  const pricePerSeat = rideData?.price || rideData?.price_per_seat || 0;
  const bookedCount = Number(rideData?.booked_seats || 0);

  // Generate seats
  const seats = Array.from({ length: totalCount }, (_, i) => ({
    id: i + 1,
    price: parseFloat(pricePerSeat),
    img: require('../asset/Image/seat.png'),
    booked: i < bookedCount
  }));

  const availableSeatsCount = totalCount - bookedCount;

  /* ---------------- STATES ---------------- */
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- BOOKING FUNCTION ---------------- */
  const processBooking = async (paymentMode) => {
    if (!rideData?.id) {
      Alert.alert("Error", "Ride details missing.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const payload = {
        seats: selectedSeats.length,
        special_requests: "" // Default empty
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

    }).catch((error) => {
      // handle failure
      console.error("Razorpay Error", error);
      Alert.alert("Payment Failed", `Error: ${error.code} | ${error.description}`);
      setLoading(false);
    });
  };

  const confirmBooking = () => {
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
  const selectedSeatObjects = seats.filter(s => selectedSeats.includes(s.id));
  const totalPrice = selectedSeatObjects.reduce((sum, s) => sum + s.price, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.locationBox}>
          <Text style={styles.locationText}>
            {rideData ? `${rideData.from || rideData.pickup_point || ''} → ${rideData.to || rideData.drop_point || ''}` : 'Bus Booking'}
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

        {/* SEAT AREA - Dynamic Grid */}
        <View style={styles.seatArea}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {seats.map((s) => (
              <View key={s.id} style={{ margin: 10 }}>
                {renderSeat(s, selectedSeats, handleSelectSeat)}
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
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
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
