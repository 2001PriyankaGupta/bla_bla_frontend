import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config/config';

const Publish = () => {
  const navigation = useNavigation();
  const [activeRides, setActiveRides] = useState([]);
  const [earnings, setEarnings] = useState({ today: 0, week: 0 });
  const [loading, setLoading] = useState(true);

  const fetchMyRides = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.get(`${BASE_URL}active-rides`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.status === true || response.status === 200) {
        const rides = response.data.data || [];
        setActiveRides(rides);
        if (response.data.earnings) {
          setEarnings(response.data.earnings);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard rides:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyRides();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" />

      {/* Green Header Area */}
      <View style={styles.headerWrapper}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>

      {/* Offer Ride Button */}
      <View style={styles.offerContainer}>
        <TouchableOpacity
          onPress={() => navigation.navigate('OfferRide')}
          style={styles.offerButton}>
          <Text style={styles.offerText}>Offer Ride</Text>
        </TouchableOpacity>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Active Rides Title */}
        <Text style={styles.sectionTitle}>Active Rides</Text>

        {/* Ride List */}
        {loading ? (
          <ActivityIndicator size="large" color="#248907" style={{ marginTop: 20 }} />
        ) : (
          activeRides.length > 0 ? (
            activeRides.map(ride => (
              <TouchableOpacity
                key={ride.id}
                style={styles.rideItem}
                onPress={() => navigation.navigate('RideDetails', { rideId: ride.id })}
              >
                <View style={styles.iconBox}>
                  <Icon name="car" size={26} color="#fff" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.rideTitle}>Ride #{ride.id}</Text>
                  <Text style={styles.rideDetails}>
                    {ride.from} {'->'} {ride.to}
                  </Text>
                  <Text style={[styles.rideDetails, { color: '#248907', fontWeight: '600' }]}>
                    {new Date(ride.date_time).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: '#777', fontStyle: 'italic', marginTop: 10 }}>No active rides found.</Text>
          )
        )}

        {/* Earnings Summary */}
        <Text style={styles.sectionTitle}>Earnings Summary</Text>

        <View style={styles.card}>
          <Text style={styles.cardSubtitle}>Today</Text>
          <Text style={styles.cardAmount}> ₹ {earnings.today || 0}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardSubtitle}>This Week</Text>
          <Text style={styles.cardAmount}> ₹ {earnings.week || 0}</Text>
        </View>

      </ScrollView>

    </SafeAreaView>
  );
};

export default Publish;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  headerWrapper: {
    width: '100%',
    height: 140,
    backgroundColor: '#248907',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backBtn: {
    position: 'absolute',
    left: 15,
    top: 40,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: -30,
  },

  offerContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: -50,
    marginBottom: 10,
  },

  offerButton: {
    backgroundColor: '#fff',
    width: '90%',
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 4,
  },

  offerText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#248907',
  },

  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 50,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 10,
    color: '#000',
  },

  rideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f7f7f7',
    padding: 12,
    borderRadius: 10,
  },

  iconBox: {
    width: 45,
    height: 45,
    backgroundColor: '#248907',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 12,
  },

  rideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },

  rideDetails: {
    fontSize: 13,
    marginTop: 2,
    color: '#444',
  },

  card: {
    borderWidth: 1,
    borderColor: '#248907',
    borderRadius: 10,
    padding: 15,
    marginTop: 12,
  },

  cardSubtitle: {
    fontSize: 14,
    color: '#555',
  },

  cardAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 5,
    color: '#000',
  },
});
