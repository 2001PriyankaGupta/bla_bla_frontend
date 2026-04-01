import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Login = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['bottom', 'left', 'right', 'top']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.container}>

        <Image
          source={require('../asset/Image/Ellipse.png')}
          style={styles.Imagelogo}
        />

        <Text style={[styles.title, { top: verticalScale(80) + insets.top }]}>ReNue EV</Text>
        <Text style={[styles.subtitle, { top: verticalScale(160) + insets.top }]}>
          Arrive in Silence. Leave a Lighter {'\n'}Footprint.
        </Text>

        <Image
          source={require('../asset/Image/Car_New.png')}
          style={styles.car}
          resizeMode="contain"
        />

        <Text style={styles.title3}>Pick your ride at lowest{'\n'}prices</Text>

        <View style={styles.btnWrapper}>

          {/* SIGNUP */}
          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            style={styles.SignUp}>
            <Text style={styles.text}>SignUp</Text>
          </TouchableOpacity>

          {/* LOGIN */}
          <TouchableOpacity
            onPress={() => navigation.navigate('LoginDetails')}
            style={styles.Login}>
            <Text style={styles.text2}>Login</Text>
          </TouchableOpacity>

        </View>

      </View>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  Imagelogo: {
    width: '100%',
    height: verticalScale(450),
    marginTop: verticalScale(-50), // Adjust for top edge
  },
  title: {
    fontSize: responsiveFontSize(48),
    color: '#fff',
    position: 'absolute',
    left: scale(30),
    fontWeight: '600',
  },
  subtitle: {
    fontSize: responsiveFontSize(20),
    color: '#fff',
    position: 'absolute',
    left: scale(30),
    lineHeight: verticalScale(26),
  },
  car: {
    width: scale(340),
    height: verticalScale(200),
    marginTop: verticalScale(-160),
    backgroundColor: 'transparent',
  },
  title3: {
    fontSize: responsiveFontSize(22),
    textAlign: 'center',
    marginTop: verticalScale(20),
    color: '#000',
  },
  btnWrapper: {
    width: '100%',
    alignItems: 'center',
    gap: verticalScale(12),
  },
  SignUp: {
    width: '80%',
    height: verticalScale(50),
    backgroundColor: '#248907',
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(20),
  },
  text: {
    color: '#fff',
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
  },
  Login: {
    width: '80%',
    height: verticalScale(50),
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#248907',
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  text2: {
    color: '#248907',
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
  },
});


