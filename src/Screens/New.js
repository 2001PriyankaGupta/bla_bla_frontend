import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const appointments = [
  {
    id: 1,
    name: 'Dr. Evelyn Reed',
    role: 'Cardiologist',
    date: '28 Jul 2024 at 10:30 AM',
    image:
      'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    id: 2,
    name: 'Dr. Marcus Chen',
    role: 'Dermatologist',
    date: '30 Jul 2024 at 02:00 PM',
    image:
      'https://randomuser.me/api/portraits/men/33.jpg',
  },
];

const reports = [
  { id: 1, title: 'Blood Test Report', date: '12 Jul 2024', icon: 'file-document-outline' },
  { id: 2, title: 'AI Heart Risk Scan', date: '10 Jul 2024', icon: 'heart-pulse' },
  { id: 3, title: 'Chest X-ray', date: '05 Jul 2024', icon: 'x-ray' },
];

const New = () => {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>Health Connect</Text>

          <View style={styles.headerIcons}>
            <Icon name="bell-outline" size={26} color="#000" style={{ marginRight: 15 }} />
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/12.jpg' }}
              style={styles.profileImage}
            />
          </View>
        </View>

        {/* Greeting */}
        <Text style={styles.hello}>Hello, Alex!</Text>
        <Text style={styles.subtitle}>How are you feeling today?</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={22} color="#8e8e8e" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors, labs, or clinics..."
            placeholderTextColor="#8e8e8e"
          />
        </View>

        {/* Feature Buttons */}
        <View style={styles.featureRow}>
          {[
            { label: 'Book Consult', icon: 'calendar-month', color: '#d9e9ff' },
            { label: 'AI Diagnostics', icon: 'robot-outline', color: '#e6ffef' },
            { label: 'Face Login', icon: 'face-recognition', color: '#eaeaff' },
          ].map((item, index) => (
            <TouchableOpacity key={index} style={[styles.featureBox, { backgroundColor: item.color }]}>
              <Icon name={item.icon} size={30} color="#213468" />
              <Text style={styles.featureText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Appointments */}
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>

        {appointments.map((item) => (
          <View key={item.id} style={styles.appointmentCard}>
            <Image source={{ uri: item.image }} style={styles.doctorImage} />

            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>{item.name}</Text>
              <Text style={styles.doctorRole}>{item.role}</Text>
              <Text style={styles.doctorDate}>{item.date}</Text>
            </View>

            <TouchableOpacity style={styles.joinButton}>
              <Text style={styles.joinText}>Join</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Reports */}
        <Text style={styles.sectionTitle}>Latest Reports</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 15 }}>
          {reports.map((item) => (
            <View key={item.id} style={styles.reportCard}>
              <Icon name={item.icon} size={32} color="#1fa000" />
              <Text style={styles.reportTitle}>{item.title}</Text>
              <Text style={styles.reportDate}>{item.date}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ height: 70 }} />
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomTabs}>
        {[
          { label: 'Home', icon: 'home' },
          { label: 'Consultations', icon: 'calendar' },
          { label: 'Reports', icon: 'file-document' },
          { label: 'Pharmacy', icon: 'pill' },
          { label: 'Profile', icon: 'account' },
        ].map((item, index) => (
          <TouchableOpacity key={index} style={styles.tabItem}>
            <Icon name={item.icon} size={24} color="#1a73e8" />
            <Text style={styles.tabText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </SafeAreaView>
  );
};

export default New;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  appName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a73e8',
  },

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 20,
  },

  hello: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 20,
    marginTop: 10,
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    marginLeft: 20,
    marginTop: 3,
  },

  searchContainer: {
    marginTop: 15,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },

  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 15,
  },

  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginTop: 25,
  },

  featureBox: {
    width: '30%',
    paddingVertical: 20,
    borderRadius: 14,
    alignItems: 'center',
  },

  featureText: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 20,
    marginTop: 25,
  },

  appointmentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 15,
    padding: 15,
    flexDirection: 'row',
    borderRadius: 14,
    elevation: 3,
  },

  doctorImage: {
    width: 55,
    height: 55,
    borderRadius: 30,
    marginRight: 15,
  },

  doctorName: {
    fontSize: 16,
    fontWeight: '700',
  },

  doctorRole: {
    fontSize: 14,
    color: '#777',
    marginTop: 2,
  },

  doctorDate: {
    fontSize: 13,
    color: '#1a73e8',
    marginTop: 4,
  },

  joinButton: {
    backgroundColor: '#e3efff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
  },

  joinText: {
    color: '#1a73e8',
    fontWeight: '700',
  },

  reportCard: {
    width: 130,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 14,
    marginRight: 15,
    alignItems: 'center',
  },

  reportTitle: {
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },

  reportDate: {
    marginTop: 4,
    color: '#777',
    fontSize: 12,
  },

  bottomTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },

  tabItem: {
    alignItems: 'center',
  },

  tabText: {
    fontSize: 12,
    marginTop: 3,
    color: '#1a73e8',
  },
});
