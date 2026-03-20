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
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
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
  const [modalState, setModalState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // Added isSubmitting state
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const showModal = (title, message, type = 'error', onConfirm = null) => {
    setModalState({ visible: true, title, message, type, onConfirm });
  };

  const handleModalConfirm = () => {
    setModalState(prev => ({ ...prev, visible: false }));
    if (modalState.onConfirm) {
      modalState.onConfirm();
    }
  };

  // Custom alert display
  const showError = (title, message) => {
    showModal(title, message, 'error');
  };

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
      showError('Action Required', 'Please fill in all fields before continuing.');
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      showError('Invalid Phone Number', 'Please enter exactly 10 digits for your phone number.');
      return;
    }

    // Strong password validation
    const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      showError(
        'Weak Password',
        'Your password is too weak. Please create a strong password of at least 8 characters with a mix of letters, numbers, and special symbols (like #, $, %, etc.).'
      );
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

    setIsSubmitting(true); // Disable button immediately when API call starts

    try {
      console.log('Sending request to:', `${BASE_URL}auth/register`);
      const response = await axios.post(`${BASE_URL}auth/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Response:', response.data);

      if (response.data.status === "pending_verification") {
        showModal('Verify Email', response.data.message || 'OTP sent to your email.', 'info', () => navigation.navigate('OtpScreen', { email: response.data.email || email }));
      } else if (response.data.status === "true" || response.status === 200 || response.status === 201) {
        const { access_token, user } = response.data;
        if (access_token) {
          await AsyncStorage.setItem('access_token', access_token);
        }
        if (user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(user));
        }

        showModal('Success', 'User registered successfully', 'success', () => navigation.navigate('RideBookingPage'));
      } else {
        showError('Registration Failed', response.data.error || response.data.message || 'We could not register your account. Please try again.');
      }

    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Registration Error:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error Data:', error.response.data);
        showError('Registration Failed', error.response.data.error || error.response.data.message || 'Something went wrong during registration.');
      } else if (error.request) {
        // The request was made but no response was received
        showError('Network Error', 'No response from server. Check your internet connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        showError('Unexpected Error', 'An error occurred. Please try again later.');
      }
    } finally {
      setIsSubmitting(false); // Enable the button again after everything completes
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" translucent={false} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }} bounces={false} showsVerticalScrollIndicator={false}>

          {/* GREEN HEADER */}
          <View style={[styles.header, { paddingTop: insets.top + verticalScale(20) }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10, marginLeft: -15 }}>
              <Icon name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Account</Text>
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
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
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
                maxLength={10}
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* NEXT BUTTON */}
            <TouchableOpacity
              onPress={handleRegister}
              style={[styles.nextButton, isSubmitting && { opacity: 0.7 }]}
              disabled={isSubmitting}
            >
              <Text style={styles.nextText}>{isSubmitting ? 'Submitting...' : 'Create Account'}</Text>
            </TouchableOpacity>

            {/* CANCEL */}
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* CUSTOM MODAL FOR ALERTS */}
      <Modal
        visible={modalState.visible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon
                name={modalState.type === 'error' ? 'alert-circle-outline' : modalState.type === 'success' ? 'check-circle-outline' : 'email-fast-outline'}
                size={50}
                color={modalState.type === 'error' ? '#e53935' : '#248907'}
              />
              <Text style={styles.modalTitle}>{modalState.title}</Text>
            </View>
            <Text style={styles.modalText}>{modalState.message}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: modalState.type === 'error' ? '#e53935' : '#248907' }]}
              onPress={handleModalConfirm}
            >
              <Text style={styles.modalBtnText}>{modalState.type === 'error' ? 'Got it!' : 'Continue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default CreateAccount;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  /* HEADER */
  header: {
    backgroundColor: '#248907',
    paddingHorizontal: scale(25),
    paddingBottom: verticalScale(100), // More padding to avoid being cut off
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    marginLeft: scale(10),
    fontSize: responsiveFontSize(32),
    fontWeight: '800',
    color: '#fff',
  },

  headerBell: {
    padding: moderateScale(8),
    position: 'relative',
  },

  notificationDot: {
    width: scale(9),
    height: scale(9),
    backgroundColor: 'red',
    position: 'absolute',
    top: verticalScale(5),
    right: scale(5),
    borderRadius: scale(5),
  },

  /* WHITE FLOATING CONTENT BOX */
  contentBox: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: verticalScale(-60),
    borderTopLeftRadius: moderateScale(25),
    borderTopRightRadius: moderateScale(25),
    paddingHorizontal: scale(30),
    paddingTop: verticalScale(30),
  },

  photoCircle: {
    width: scale(90),
    height: scale(90),
    borderRadius: scale(90),
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: verticalScale(35),
  },

  inputBox: {
    width: '100%',
    height: verticalScale(55),
    borderWidth: 1,
    borderColor: '#6EC16E',
    borderRadius: moderateScale(10),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(18),
    backgroundColor: '#fff',
  },

  input: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    color: '#000',
    marginLeft: scale(10),
  },

  nextButton: {
    backgroundColor: '#248907',
    height: verticalScale(55),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(10),
  },

  nextText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#fff',
  },

  cancelText: {
    textAlign: 'center',
    marginTop: verticalScale(18),
    fontSize: responsiveFontSize(17),
    color: '#000',
  },

  /* MODAL STYLES */
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: responsiveFontSize(22),
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: responsiveFontSize(15),
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  modalBtn: {
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(40),
    borderRadius: moderateScale(15),
    width: '100%',
  },
  modalBtnText: {
    color: '#fff',
    fontSize: responsiveFontSize(18),
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
