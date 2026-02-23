import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

import Login from '../Screens/Login';
import SignUp from '../Screens/SignUp';
import SignUpDetails from '../Screens/SingUpDetails';
import LoginDetails from '../Screens/LoginDetails';
import ProfileSetUp from '../Screens/ProfileSetUp';
import AddYourCar from '../Screens/AddYourCar';
import VerifyLogin from '../Screens/VerifyLogin';
import RideBookingPage from '../Screens/RideBookingPage';
import TabNavigation from './TabNavigation';
import Inbox from '../Screens/inbox';
import Temp from '../Screens/Temp';
import Prefrance from '../Screens/Prefrance';
import HelpSupport from '../Screens/HelpSupport';
import OfferRide from '../Screens/OfferRide';
import Review from '../Screens/Review';
import MyRidedetails from '../Screens/MyRidedetails';
import DriverIntarnal from '../Screens/DriverIntarnal';
import Payments from '../Screens/Payments';
import Publish from '../Screens/Publish';
import Home from '../Screens/Home';
import Profile from '../Screens/Profile';
import YourRides from '../Screens/YourRides';
import ShowCarDetails from '../Screens/ShowCarDetails';
import RideDetails from '../Screens/RideDetails';
import ChatScreen from '../Screens/ChatScreen';
import AddReviewScreen from '../Screens/AddReviewScreen';
import ForgotPassword from '../Screens/ForgotPassword';
import SupportTickets from '../Screens/SupportTickets';
import TicketChat from '../Screens/TicketChat';

const Stack = createNativeStackNavigator();

const RootNavigation = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userData = await AsyncStorage.getItem('user_data');
        const token = await AsyncStorage.getItem('access_token');

        if (userData && token) {
          setInitialRoute('RideBookingPage');
        } else {
          setInitialRoute('Login');
        }
      } catch (error) {
        console.error("Navigation check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1fa000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="SignUp"
          component={SignUp}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignUpDetails"
          component={SignUpDetails}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LoginDetails"
          component={LoginDetails}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProfileSetUp"
          component={ProfileSetUp}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddYourCar"
          component={AddYourCar}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VerifyLogin"
          component={VerifyLogin}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RideBookingPage"
          component={RideBookingPage}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Temp"
          component={Temp}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TabNavigation"
          component={TabNavigation}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Inbox"
          component={Inbox}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Prefrance"
          component={Prefrance}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HelpSupport"
          component={HelpSupport}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="OfferRide"
          component={OfferRide}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Review"
          component={Review}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MyRidedetails"
          component={MyRidedetails}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DriverIntarnal"
          component={DriverIntarnal}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Payments"
          component={Payments}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={Home}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Publish"
          component={Publish}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Profile"
          component={Profile}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="YourRides"
          component={YourRides}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ShowCarDetails"
          component={ShowCarDetails}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RideDetails"
          component={RideDetails}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChatScreen"
          component={ChatScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddReviewScreen"
          component={AddReviewScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPassword}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SupportTickets"
          component={SupportTickets}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TicketChat"
          component={TicketChat}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigation;


