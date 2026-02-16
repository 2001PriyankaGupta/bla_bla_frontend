import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { BASE_URL } from '../config/config';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginDetails = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const navigation = useNavigation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      console.log('Sending login request to:', `${BASE_URL}auth/login`);
      const response = await axios.post(`${BASE_URL}auth/login`, {
        email: email,
        password: password,
      });

      console.log('Login Response:', response.data);

      if (response.data.status === "true" || response.status === 200 || response.status === 201) {
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

        Alert.alert('Success', 'Login Successful!', [
          { text: 'OK', onPress: () => navigation.navigate('RideBookingPage') }
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login Error:', error);
      if (error.response) {
        console.error('Error Data:', error.response.data);
        Alert.alert('Error', error.response.data.message || 'Login failed.');
      } else if (error.request) {
        Alert.alert('Error', 'No response from server. Check your internet connection.');
      } else {
        Alert.alert('Error', 'An error occurred. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
      <TouchableOpacity style={styles.nextButton} onPress={handleLogin}>
        <Text style={styles.nextText}>Login</Text>
      </TouchableOpacity>

      {/* Cancel */}
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default LoginDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingTop: 50,
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'center',
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
    width: '100%',
    height: 55,
    backgroundColor: '#248907',
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
    marginTop: 20,
    fontSize: 17,
    color: '#000',
    textAlign: 'center',
  },
});
