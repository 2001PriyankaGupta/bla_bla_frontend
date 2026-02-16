import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const RideList = () => {
  const rides = [
    { id: 1, time: '14:15 - 10:50', route: 'Dehradun → Noida', seats: 3, price: 1250 },
    { id: 2, time: '14:15 - 10:50', route: 'Dehradun → Noida', seats: 2, price: 1250 },
    { id: 3, time: '14:15 - 10:50', route: 'Dehradun → Noida', seats: 3, price: 1250 },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" />

      {/* Header with search and filter */}
      <View style={styles.header}>
        <View style={styles.locationBox}>
          <Text style={styles.locationText}>Dehradun, Uttarakhand → Noida, UP</Text>
          <Icon name="bell-outline" size={22} color="#000" style={{ marginLeft: 10 }} />
        </View>

        <View style={styles.filterBox}>
          <Text style={styles.filterText}>Today, 1 Passenger</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Icon name="filter-variant" size={20} color="#fff" />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ride list */}
      <ScrollView style={styles.scroll}>
        <Text style={styles.sectionTitle}>Today</Text>
        {rides.map((ride) => (
          <View key={ride.id} style={styles.rideCard}>
            <View style={styles.rideTopRow}>
              <Text style={styles.time}>{ride.time}</Text>
              <Text style={styles.price}>₹{ride.price.toFixed(2)}</Text>
            </View>

            <Text style={styles.route}>{ride.route}</Text>
            <Text style={styles.seats}>{ride.seats} Seats Available</Text>

            <TouchableOpacity style={styles.detailsButton}>
              <Text style={styles.detailsText}>More Details</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default RideList;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#248907',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
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
    color: '#333',
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  filterButton: {
    backgroundColor: '#248907',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
  },
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
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
