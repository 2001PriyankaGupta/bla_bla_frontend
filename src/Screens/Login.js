import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Login = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="light-content" translucent />

      <View style={styles.container}>

        <Image
          source={require('../asset/Image/Ellipse.png')}
          style={styles.Imagelogo}
        />

        <Text style={styles.title}>Only EV...</Text>
        <Text style={styles.subtitle}>
          Arrive in Silence. Leave a Lighter {'\n'}Footprint.
        </Text>

        <Image
          source={require('../asset/Image/Car.png')}
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

          {/* GUEST LOGIN */}
          {/* <TouchableOpacity
            onPress={async () => {
              await AsyncStorage.setItem("isLoggedIn", "false");
              navigation.replace("RideBookingPage");
            }}
            style={styles.SignUp}>
            <Text style={styles.text}> Guest</Text>
          </TouchableOpacity> */}

        </View>

      </View>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', }, Imagelogo: { width: '100%', height: 450, }, title: { fontSize: 48, color: '#fff', position: 'absolute', left: 30, top: 100, fontWeight: '600', }, subtitle: { fontSize: 20, color: '#fff', position: 'absolute', left: 30, top: 180, lineHeight: 26, }, car: { width: 300, height: 160, marginTop: -150, }, title3: { fontSize: 22, textAlign: 'center', marginTop: 20, color: '#000', }, btnWrapper: { width: '100%', alignItems: 'center', marginTop: 30, gap: 12, }, SignUp: { width: '80%', height: 50, backgroundColor: '#248907', borderRadius: 10, justifyContent: 'center', alignItems: 'center', }, text: { color: '#fff', fontSize: 18, fontWeight: '600', }, Login: { width: '80%', height: 50, backgroundColor: '#fff', borderWidth: 2, borderColor: '#248907', borderRadius: 10, justifyContent: 'center', alignItems: 'center', }, text2: { color: '#248907', fontSize: 18, fontWeight: '700', }, });
