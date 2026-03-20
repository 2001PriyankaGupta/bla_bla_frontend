import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  StatusBar,
  Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

const LoginDetails = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [modalState, setModalState] = React.useState({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: null,
  });
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

  const signInWithGoogle = async () => {
    try {
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        if (e.response && e.response.status === 401) {
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('user_data');
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }
      }

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) {
        showModal('Error', 'Could not retrieve ID Token');
        return;
      }

      const response = await axios.post(`${BASE_URL}auth/google-login`, {
        id_token: idToken
      });

      if (response.data.status === "true" || response.data.access_token) {
        const { access_token, user } = response.data;
        if (access_token) await AsyncStorage.setItem('access_token', access_token);
        if (user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(user));
          if (user.id) await AsyncStorage.setItem('user_id', user.id.toString());
        }

        showModal('Success', 'Login Successful!', 'success', () => navigation.navigate('RideBookingPage'));
      } else {
        showModal('Error', response.data.message || 'Login failed');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        console.error('Google Sign-In Error:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Something went wrong';
        showModal('Error', errorMsg);
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showModal('Error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('Sending login request to:', `${BASE_URL}auth/login`);
      const response = await axios.post(`${BASE_URL}auth/login`, {
        email: email,
        password: password,
      });

      console.log('Login Response:', response.data);

      if (response.data.status === "pending_verification") {
        showModal('Verify Email', response.data.message || 'OTP sent to your email.', 'info', () => navigation.navigate('OtpScreen', { email: response.data.email || email }));
      } else if (response.data.status === "true" || response.status === 200 || response.status === 201) {
        const { access_token, user } = response.data;
        if (access_token) {
          await AsyncStorage.setItem('access_token', access_token);
          console.log('Access Token stored:', access_token);
        }
        if (response.data.data && response.data.data.user) {
          const userData = response.data.data.user;
          await AsyncStorage.setItem('user_data', JSON.stringify(userData));
          if (userData.id) {
            await AsyncStorage.setItem('user_id', userData.id.toString());
          }
          console.log('User Data stored:', userData);
        } else if (response.data.user) {
          // Fallback if structure is flat
          await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
          if (response.data.user.id) {
            await AsyncStorage.setItem('user_id', response.data.user.id.toString());
          }
        }

        showModal('Success', 'Login Successful!', 'success', () => navigation.navigate('RideBookingPage'));
      } else {
        showModal('Error', response.data.error || response.data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Login Error:', error);
      if (error.response) {
        console.error('Error Data:', error.response.data);
        showModal('Error', error.response.data.error || error.response.data.message || 'Login failed.');
      } else if (error.request) {
        showModal('Error', 'No response from server. Check your internet connection.');
      } else {
        showModal('Error', 'An error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: scale(30), paddingTop: insets.top }} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', width: '100%' }}>
            {/* Email Input */}
            <View style={styles.inputBox}>
              <Icon name="email-outline" size={22} color="#000" />
              <TextInput
                placeholder="Email/ Mobile No"
                placeholderTextColor="#777"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Input */}
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

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ paddingHorizontal: 5 }}
              >
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#000"
                />
              </TouchableOpacity>
            </View>

            <View style={{ width: '100%', alignItems: 'flex-end', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={{ color: '#248907', fontWeight: 'bold' }}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Next Button */}
            <TouchableOpacity
              style={[styles.nextButton, isSubmitting && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              <Text style={styles.nextText}>{isSubmitting ? 'Submitting...' : 'Login'}</Text>
            </TouchableOpacity>

            <View style={styles.orRow}>
              <View style={styles.line} />
              <Text style={styles.orText}>Or</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} onPress={signInWithGoogle}>
                <Image source={require('../asset/Image/google.png')} style={styles.socialIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Image source={require('../asset/Image/apple.png')} style={styles.socialIcon} />
              </TouchableOpacity>
            </View>

            {/* Cancel */}
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

export default LoginDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '100%',
    height: verticalScale(55),
    backgroundColor: '#248907',
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
    marginTop: verticalScale(20),
    fontSize: responsiveFontSize(17),
    color: '#000',
    textAlign: 'center',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(20),
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#dcdcdc',
  },
  orText: {
    marginHorizontal: scale(10),
    color: '#777',
    fontSize: responsiveFontSize(16),
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(20),
    marginBottom: verticalScale(20),
  },
  socialBtn: {
    padding: moderateScale(12),
    borderWidth: 1,
    borderColor: '#dcdcdc',
    borderRadius: moderateScale(10),
    backgroundColor: '#fff',
  },
  socialIcon: {
    width: scale(30),
    height: scale(30),
    resizeMode: 'contain',
  },
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
