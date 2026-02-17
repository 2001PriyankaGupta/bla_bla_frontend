import { View, Text } from 'react-native'
import React from 'react'
import Rootnavigation from './src/Navigation/Rootnavigation';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '1030097030757-n2489ab83ig009n6kvfrts2m8p2grj96.apps.googleusercontent.com',
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

const App = () => {
  return (
    <Rootnavigation />



  )
}

export default App