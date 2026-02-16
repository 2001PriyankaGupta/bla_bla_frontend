import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import ImagePicker from 'react-native-image-crop-picker';

const VerifyIdentity = () => {
  const navigation = useNavigation();

  /* ✅ Permission Request */
  const requestPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const cameraGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to take photos.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        return { camera: cameraGranted === PermissionsAndroid.RESULTS.GRANTED };
      } catch (err) {
        console.warn(err);
        return { camera: false };
      }
    }
    return { camera: true }; // iOS auto-handles
  };

  /* ✅ Open Camera */
  const OpenCamera = async () => {
    const permission = await requestPermission();

    if (!permission.camera) {
      Alert.alert(
        'Permission Denied',
        'Camera permission is required to take photos.'
      );
      return;
    }

    ImagePicker.openCamera({
      cropping: true,
      width: 300,
      height: 400,
      includeBase64: false,
      compressImageQuality: 0.7,
    })
      .then(image => {
        console.log('Captured Image:', image.path);
        Alert.alert('Success', 'Photo captured successfully!');
      })
      .catch(err => {
        console.log('Camera Error:', err);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Verify your identity</Text>
      </View>

      <Text style={styles.heading}>
        Take a photo of your{'\n'}driver's license
      </Text>

      <Text style={styles.subtitle}>
        Make sure all details are visible and the{'\n'}
        photo is clear. Ensure the document is not{'\n'}
        expired.
      </Text>

      <View style={styles.imageBox}>
        <Image
          source={require('../asset/Image/Frame.png')}
          style={styles.licenseImage}
          resizeMode="contain"
        />
      </View>

      <TouchableOpacity onPress={OpenCamera} style={styles.takePhotoBtn}>
        <Text style={styles.takePhotoText}>Take Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('RideBookingPage')}
        style={styles.submitBtn}
      >
        <Text style={styles.submitText}>Submit</Text>
      </TouchableOpacity>

      <TouchableOpacity>
        <Text style={styles.nextText}>Next</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default VerifyIdentity;

/* ✅ Styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginLeft: 70,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 20,
  },
  imageBox: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  licenseImage: {
    width: '100%',
    height: 160,
  },
  takePhotoBtn: {
    backgroundColor: '#248907',
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignSelf: 'flex-end',
    borderRadius: 10,
    marginTop: 15,
  },
  takePhotoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#248907',
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  nextText: {
    textAlign: 'center',
    marginTop: 15,
    fontSize: 16,
    color: '#000',
  },
});

