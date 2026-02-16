
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import React, { useState } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const ProfileSetup = () => {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [showGenderOptions, setShowGenderOptions] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile Setup</Text>
      </View>

      {/* Name */}
      <Text style={styles.label}>Name</Text>
      <TextInput
        placeholder="Enter your name"
        placeholderTextColor="#777"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      {/* Gender */}
      <Text style={styles.label}>Gender</Text>

      <TouchableOpacity
        style={styles.genderBox}
        onPress={() => setShowGenderOptions(!showGenderOptions)}
      >
        <Text style={styles.genderText}>
          {gender ? gender : 'Select your gender'}
        </Text>

        <View>
          <Icon name="menu-up" size={20} color="#000" />
          <Icon name="menu-down" size={20} color="#000" style={{ marginTop: -8 }} />
        </View>
      </TouchableOpacity>

      {/* Dropdown Options */}
      {showGenderOptions && (
        <View style={styles.dropdown}>
          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              setGender('Male');
              setShowGenderOptions(false);
            }}
          >
            <Text style={styles.optionText}>Male</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              setGender('Female');
              setShowGenderOptions(false);
            }}
          >
            <Text style={styles.optionText}>Female</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              setGender('Other');
              setShowGenderOptions(false);
            }}
          >
            <Text style={styles.optionText}>Other</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Profile Picture Section */}
      <Text style={styles.sectionTitle}>Profile Picture</Text>

      <View style={styles.uploadBox}>
        <Text style={styles.uploadTitle}>Upload a profile picture</Text>
        <Text style={styles.uploadSubtitle}>
          This helps other users recognize you.
        </Text>

        <TouchableOpacity style={styles.uploadButton}>
          <Text style={styles.uploadButtonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('AddYourCar')}
        style={styles.continueButton}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>

      {/* Next Text */}
      <TouchableOpacity>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default ProfileSetup;

const styles = StyleSheet.create({
  /* FIXED SAFE AREA */
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 0,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 10,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },

  label: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },

  input: {
    height: 55,
    borderWidth: 1.2,
    borderColor: '#4CAF50',
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#000',
  },

  genderBox: {
    height: 55,
    borderWidth: 1.2,
    borderColor: '#4CAF50',
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  genderText: {
    fontSize: 16,
    color: '#000',
  },

  dropdown: {
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginTop: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },

  option: {
    padding: 15,
    backgroundColor: '#fff',
  },

  optionText: {
    fontSize: 16,
    color: '#000',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 25,
    color: '#000',
  },

  uploadBox: {
    marginTop: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
  },

  uploadTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },

  uploadSubtitle: {
    marginTop: 5,
    fontSize: 14,
    color: '#555',
  },

  uploadButton: {
    marginTop: 20,
    backgroundColor: '#248907',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },

  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  continueButton: {
    width: '100%',
    height: 55,
    backgroundColor: '#248907',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },

  continueText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },

  nextText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#000',
  },
});
