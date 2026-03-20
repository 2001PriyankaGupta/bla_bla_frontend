import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import React, { useEffect } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../config/config';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignUp = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const signInWithGoogle = async () => {
    try {
      // Force account selection by signing out first
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        if (e.response && e.response.status === 401) {
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('user_data');
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          return;
        }

        // Ignore if not signed in
      }

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      console.log('Google User Info:', userInfo);

      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) {
        Alert.alert('Error', 'Could not retrieve ID Token from Google');
        return;
      }

      const response = await axios.post(`${BASE_URL}auth/google-register`, {
        id_token: idToken
      });

      if (response.data.status === "true" || response.data.access_token) {
        const { access_token, user } = response.data;

        if (access_token) {
          await AsyncStorage.setItem('access_token', access_token);
        }

        if (user) {
          await AsyncStorage.setItem('user_data', JSON.stringify(user));
          if (user.id) {
            await AsyncStorage.setItem('user_id', user.id.toString());
          }
        }

        Alert.alert('Success', response.data.message || 'Registration Successful!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('RideBookingPage')
          }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Login failed');
      }

    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('User cancelled the login flow');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in is in progress already');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Play services not available or outdated');
      } else {
        console.error('Google Sign-In Error:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Something went wrong';
        Alert.alert('Error', errorMsg);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right', 'top']}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Title */}
      <Text style={[styles.title, { marginTop: insets.top + verticalScale(20) }]}>Create Account</Text>

      {/* Sign Up Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('SignUpDetails')}
        style={styles.SignUp}
      >
        <Text style={styles.text}>Create Account</Text>
      </TouchableOpacity>

      <View style={styles.orRow}>
        <View style={styles.line} />
        <Text style={styles.orText}>Or</Text>
        <View style={styles.line} />
      </View>

      {/* Social Buttons */}
      <View style={styles.socialRow}>
        <TouchableOpacity style={styles.socialBtn} onPress={signInWithGoogle}>
          <Image
            source={require('../asset/Image/google.png')}
            style={styles.socialIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialBtn}>
          <Image
            source={require('../asset/Image/apple.png')}
            style={styles.socialIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Already have account */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>I already have an account</Text>
        <TouchableOpacity onPress={() => navigation.navigate('LoginDetails')}>
          <View style={styles.arrowCircle}>
            <Icon name="arrow-right" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  title: {
    fontSize: responsiveFontSize(38),
    fontWeight: '800',
    textAlign: 'center',
    width: '80%',
  },

  SignUp: {
    width: '80%',
    height: verticalScale(55),
    backgroundColor: '#248907',
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(60),
  },

  text: {
    color: '#fff',
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(35),
    width: '80%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#dcdcdc',
  },
  orText: {
    marginHorizontal: scale(15),
    color: '#000',
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
  },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(30),
    marginBottom: verticalScale(40),
  },
  socialBtn: {
    padding: moderateScale(15),
    borderWidth: 1,
    borderColor: '#dcdcdc',
    borderRadius: moderateScale(15),
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  socialIcon: {
    width: scale(32),
    height: scale(32),
    resizeMode: 'contain',
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(20),
  },

  footerText: {
    fontSize: responsiveFontSize(17),
    color: '#000',
    marginRight: scale(10),
    fontWeight: '500',
  },

  arrowCircle: {
    backgroundColor: '#248907',
    width: scale(35),
    height: scale(35),
    borderRadius: scale(35),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
});
