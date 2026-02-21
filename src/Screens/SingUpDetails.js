import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import ImagePicker from 'react-native-image-crop-picker';
import { BASE_URL } from '../config/config';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CreateAccount = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(''); // Added state for email
  const [password, setPassword] = useState(''); // Added state for password
  const [phone, setPhone] = useState(''); // Added state for phone
  const [profileImage, setProfileImage] = useState(null); // Added state for profile image
  const navigation = useNavigation();

  // Function to handle image selection
  const handleImagePick = () => {
    ImagePicker.openPicker({
      width: 300,
      height: 300,
      cropping: true,
      mediaType: 'photo',
    })
      .then(image => {
        setProfileImage(image);
      })
      .catch(err => {
        console.log('ImagePicker Error: ', err);
      });
  };

  // Function to handle registration
  const handleRegister = async () => {
    if (!email || !password || !phone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('phone', phone); // Assuming API expects 'phone'

    if (profileImage) {
      formData.append('profile_image', {
        uri: profileImage.path,
        type: profileImage.mime,
        name: profileImage.path.split('/').pop(),
      });
    }

    try {
      console.log('Sending request to:', `${BASE_URL}auth/register`);
      const response = await axios.post(`${BASE_URL}auth/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Response:', response.data);

      if (response.data.status === "true" || response.status === 200 || response.status === 201) {
        const { access_token, user } = response.data;
        if (access_token) {
          await AsyncStorage.setItem('access_token', access_token);
          console.log('Access Token stored:', access_token);
        }
        if (user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(user));
          console.log('User Data stored:', user);
        }

        Alert.alert('Success', 'User registered successfully', [
          { text: 'OK', onPress: () => navigation.navigate('RideBookingPage') }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Registration failed. Please try again.');
      }

    } catch (error) {
      console.error('Registration Error:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error Data:', error.response.data);
        Alert.alert('Error', error.response.data.message || 'Registration failed.');
      } else if (error.request) {
        // The request was made but no response was received
        Alert.alert('Error', 'No response from server. Check your internet connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        Alert.alert('Error', 'An error occurred. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>

          {/* GREEN HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Account</Text>

            <TouchableOpacity style={styles.headerBell}>
              <Icon name="bell-outline" size={26} color="#fff" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>

          {/* WHITE CONTAINER FLOATING UP */}
          <View style={styles.contentBox}>

            {/* Photo Circle */}
            <TouchableOpacity style={styles.photoCircle} onPress={handleImagePick}>
              {profileImage ? (
                <Image source={{ uri: profileImage.path }} style={{ width: 90, height: 90, borderRadius: 90 }} />
              ) : (
                <Icon name="camera" size={35} color="#000" />
              )}
            </TouchableOpacity>

            {/* Email */}
            <View style={styles.inputBox}>
              <Icon name="email-outline" size={22} color="#000" />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#777"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password */}
            <View style={styles.inputBox}>
              <Icon name="lock-outline" size={22} color="#000" />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#777"
                secureTextEntry={!showPassword}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#000"
                />
              </TouchableOpacity>
            </View>

            {/* Phone Number */}
            <View style={styles.inputBox}>
              <Image
                source={require('../asset/Image/india.png')}
                style={{ width: 25, height: 25, marginRight: 8 }}
              />
              <TouchableOpacity>
                <Icon name="chevron-down" size={22} color="#000" style={{ marginRight: 5 }} />
              </TouchableOpacity>
              <TextInput
                placeholder="Phone Number"
                placeholderTextColor="#777"
                keyboardType="numeric"
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
              />
            </View>




            {/* NEXT BUTTON */}
            <TouchableOpacity onPress={handleRegister} style={styles.nextButton}>
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>

            {/* CANCEL */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateAccount;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#248907',
  },

  /* HEADER */
  header: {
    paddingTop: 40,
    backgroundColor: '#248907',
    justifyContent: 'flex-end',
    paddingHorizontal: 25,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },

  headerBell: {
    padding: 8,
    position: 'relative',
  },

  notificationDot: {
    width: 9,
    height: 9,
    backgroundColor: 'red',
    position: 'absolute',
    top: 5,
    right: 5,
    borderRadius: 5,
  },

  /* WHITE FLOATING CONTENT BOX */
  contentBox: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: -60,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 30,
    paddingTop: 30,
  },

  photoCircle: {
    width: 90,
    height: 90,
    borderRadius: 90,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 35,
  },

  inputBox: {
    width: '100%',
    height: 55,
    borderWidth: 1,
    borderColor: '#6EC16E',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 18,
    backgroundColor: '#fff',
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 10,
  },

  nextButton: {
    backgroundColor: '#248907',
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  nextText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  cancelText: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 17,
    color: '#000',
  },
});
