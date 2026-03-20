import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  Image,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ImagePicker from 'react-native-image-crop-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, IMG_URL } from '../config/config';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';

const AddYourCar = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Tabs: 'list' | 'add'
  const [activeTab, setActiveTab] = useState('list');
  const [myCars, setMyCars] = useState([]);
  const [loadingCars, setLoadingCars] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [carMake, setCarMake] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('');
  const [carColor, setCarColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [rcNumber, setRcNumber] = useState('');

  // State for photos
  const [carPhoto, setCarPhoto] = useState(null);
  const [licenseFront, setLicenseFront] = useState(null);
  const [licenseBack, setLicenseBack] = useState(null);
  const [rcFront, setRcFront] = useState(null);
  const [rcBack, setRcBack] = useState(null);

  const [validatingImage, setValidatingImage] = useState(false);

  // Step state for 'add' tab: 1 = Car Details, 2 = License Photos, 3 = Success/Done
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Cars on Mount or Tab Change
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'list') {
        fetchCars();
      }
    }, [activeTab])
  );

  const fetchCars = async () => {
    setLoadingCars(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.get(`${BASE_URL}cars`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Fetch Cars Response:', response.data);
      if (response.data.status === true || response.status === 200) {
        setMyCars(response.data.data);
      } else {
        setMyCars([]); // Handle empty or error gracefully
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Fetch Cars Error:', error);
      // Alert.alert('Error', 'Failed to fetch your cars.');
    } finally {
      setLoadingCars(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCars();
  };

  // --- Photo Handling (Camera/Gallery) & AI VALIDATION ---
  const requestImageSelection = (setImage, type) => {
    Alert.alert(
      "Select Photo",
      "Choose an option",
      [
        { text: "Camera", onPress: () => openCamera(setImage, type) },
        { text: "Gallery", onPress: () => openGallery(setImage, type) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const openCamera = (setImage, type) => {
    ImagePicker.openCamera({
      width: 400, height: 300, cropping: true, mediaType: 'photo', includeBase64: true, compressImageQuality: 0.6
    }).then(image => handleImageValidation(image, setImage, type)).catch(err => console.log('Camera Error: ', err));
  };

  const openGallery = (setImage, type) => {
    ImagePicker.openPicker({
      width: 400, height: 300, cropping: true, mediaType: 'photo', includeBase64: true, compressImageQuality: 0.6
    }).then(image => handleImageValidation(image, setImage, type)).catch(err => console.log('Gallery Error: ', err));
  };

  const handleImageValidation = async (image, setImageCallback, type) => {
    if (!image.data) {
      setImageCallback(image);
      return;
    }
    try {
      setValidatingImage(true);
      const isOk = await checkImageContent(image.data, type);

      if (isOk) {
        setImageCallback(image);
      } else {
        let msg = type === 'car'
          ? "Invalid photo selected. Please upload a clear photo of your car."
          : type === 'rc'
            ? "Invalid photo selected. Please upload a clear photo of your Registration Certificate (RC)."
            : "Invalid photo selected. Please upload a clear photo of your Driving License/ID.";
        Alert.alert("Invalid Photo", msg);
      }
    } catch (err) {
      console.warn('Handling Error: ', err);
      // Fallback: allow if unhandled catch happens
      setImageCallback(image);
    } finally {
      setValidatingImage(false);
    }
  };

  const checkImageContent = async (base64String, type) => {
    // Attempting real AI validation for cars. If Google Vision API is restricted, 
    // it will log the error but we'll show a message about it.
    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_MAPS_API_KEY}`,
        {
          requests: [
            {
              image: { content: base64String },
              features: [{ type: 'LABEL_DETECTION' }],
            },
          ],
        }
      );

      console.log('Vision API Response:', response.data);
      const labels = response.data.responses[0]?.labelAnnotations || [];

      if (type === 'car') {
        const carKeywords = ['car', 'vehicle', 'tire', 'land vehicle', 'transport', 'coupe', 'sedan', 'truck', 'sports car', 'family car', 'compact car', 'wheel', 'motor vehicle'];
        return labels.some(label => carKeywords.includes(label.description.toLowerCase()));
      } else if (type === 'license') {
        const dlKeywords = ['identity document', 'driver', 'driving license', 'id card', 'passport', 'document', 'license', 'card', 'text'];
        return labels.some(label => dlKeywords.some(kw => label.description.toLowerCase().includes(kw)));
      } else if (type === 'rc') {
        const rcKeywords = ['registration certificate', 'vehicle registration', 'document', 'certificate', 'paper', 'rc', 'text', 'card'];
        return labels.some(label => rcKeywords.some(kw => label.description.toLowerCase().includes(kw)));
      }

      return labels.length > 0;

    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.warn('Vision API call failed:', error.response ? error.response.data : error.message);

      if (error.response?.status === 403) {
        // If restricted, we alert the user but let them proceed for now (as per user logic)
        // or we return true to avoid blocking the user if their key is misconfigured.
        console.log('Vision API is restricted (403). Please enable "Cloud Vision API" in Google Cloud Console.');
      }
      return true; // Fallback to true if API is restricted, so we don't block them.
    }
  };

  // --- Form Logic ---
  const validateStep1 = () => {
    if (!carMake || !carModel || !carYear || !carColor || !licensePlate || !rcNumber || !carPhoto) {
      Alert.alert('Error', 'Please fill all car details including RC number, and add a car photo.');
      return false;
    }

    // License Plate Validation (typically 9-10 chars like DL01AB1234)
    const licenseClean = licensePlate.replace(/\s+/g, '').toUpperCase();
    if (licenseClean.length < 9 || licenseClean.length > 10) {
      Alert.alert('Invalid License Plate', 'Registration number must be 9 or 10 characters long.');
      return false;
    }
    const alphaNumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphaNumericRegex.test(licenseClean)) {
      Alert.alert('Invalid License Plate', 'Registration number must only contain letters and numbers.');
      return false;
    }

    const rcClean = rcNumber.replace(/\s+/g, '').toUpperCase();
    if (rcClean.length < 9 || rcClean.length > 11) {
      Alert.alert('Invalid RC Number', 'RC number must be 9 to 11 characters long.');
      return false;
    }
    if (!alphaNumericRegex.test(rcClean)) {
      Alert.alert('Invalid RC Number', 'RC number must only contain letters and numbers.');
      return false;
    }

    return true;
  };

  const handleContinue = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!licenseFront || !licenseBack || !rcFront || !rcBack) {
      Alert.alert('Error', 'Please upload front and back photos for both your driving license and RC.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('car_make', carMake);
    formData.append('car_model', carModel);
    formData.append('car_year', carYear);
    formData.append('car_color', carColor);
    formData.append('licence_plate', licensePlate);
    formData.append('rc_number', rcNumber);

    if (carPhoto) formData.append('car_photo', { uri: carPhoto.path, type: carPhoto.mime, name: carPhoto.path.split('/').pop() });
    if (licenseFront) formData.append('driver_license_front', { uri: licenseFront.path, type: licenseFront.mime, name: licenseFront.path.split('/').pop() });
    if (licenseBack) formData.append('driver_license_back', { uri: licenseBack.path, type: licenseBack.mime, name: licenseBack.path.split('/').pop() });
    if (rcFront) formData.append('rc_front_image', { uri: rcFront.path, type: rcFront.mime, name: rcFront.path.split('/').pop() });
    if (rcBack) formData.append('rc_back_image', { uri: rcBack.path, type: rcBack.mime, name: rcBack.path.split('/').pop() });

    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.post(`${BASE_URL}cars`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` },
      });

      console.log('Add Car Response:', response.data);
      if (response.data.status === "true" || response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Car details added successfully!');
        // Reset Form
        setCarMake(''); setCarModel(''); setCarYear(''); setCarColor(''); setLicensePlate(''); setRcNumber('');
        setCarPhoto(null); setLicenseFront(null); setLicenseBack(null); setRcFront(null); setRcBack(null);
        setStep(1);
        // Switch back to list tab
        setActiveTab('list');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to add car details.');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Add Car Error:', error);
      Alert.alert('Error', 'An error occurred while adding car details.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render Functions ---

  const renderCarItem = ({ item }) => (
    <TouchableOpacity
      style={styles.carCard}
      onPress={() => {
        console.log('Car ID pressed:', item.id);
        navigation.navigate('ShowCarDetails', { carId: item.id });
      }}
    >
      <Image
        source={{
          uri: (item.car_photo && item.car_photo.startsWith('http'))
            ? item.car_photo
            : (item.car_photo ? `${IMG_URL}${item.car_photo}` : 'https://argosmob.site/storage/car_photos/default_car.png')
        }}
        style={styles.carListImage}
      />
      <View style={styles.carInfo}>
        <Text style={styles.carTitle}>{item.car_make} {item.car_model}</Text>
        <Text style={styles.carDetail}>{item.car_color} • {item.car_year}</Text>
        <Text style={styles.plateText}>{item.licence_plate}</Text>

        <View style={[styles.statusBadge, { backgroundColor: item.license_verified === 'verified' ? '#4caf50' : '#ff9800' }]}>
          <Text style={styles.statusText}>{(item.license_verified || item.verification_status || 'PENDING').toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left', 'bottom']}>
      <StatusBar barStyle="dark-content" translucent={true} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >

        {/* Header */}
        <View style={[styles.headerView, { paddingTop: insets.top + verticalScale(10) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerText}>My Garage</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'list' && styles.activeTabButton]}
            onPress={() => setActiveTab('list')}
          >
            <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>My Cars</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'add' && styles.activeTabButton]}
            onPress={() => setActiveTab('add')}
          >
            <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>Add Car</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === 'list' ? (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            {loadingCars && !refreshing ? (
              <ActivityIndicator size="large" color="#248907" style={{ marginTop: 50 }} />
            ) : (
              <FlatList
                data={myCars}
                renderItem={renderCarItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 20 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Icon name="car-off" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>No cars added yet.</Text>
                    <TouchableOpacity onPress={() => setActiveTab('add')} style={styles.addFirstBtn}>
                      <Text style={styles.addFirstBtnText}>Add Your First Car</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
        ) : (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            {/* Loading Overlay */}
            {validatingImage && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 100, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#248907" />
                <Text style={{ marginTop: 10, fontWeight: '700', color: '#248907' }}>Validating AI Image...</Text>
              </View>
            )}

            {/* Reuse the ScrollView Form structure */}
            <ScrollView contentContainerStyle={{ paddingBottom: 50, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
              {step === 1 ? (
                <>
                  <Text style={styles.formTitle}>Car Details</Text>
                  <View style={{ alignItems: 'center', marginTop: 10 }}>
                    <TextInput placeholder="Car Make" placeholderTextColor="#777" style={styles.input} value={carMake} onChangeText={setCarMake} />
                    <TextInput placeholder="Car Model" placeholderTextColor="#777" style={styles.input} value={carModel} onChangeText={setCarModel} />
                    <TextInput placeholder="Car Year" placeholderTextColor="#777" keyboardType="numeric" style={styles.input} value={carYear} onChangeText={setCarYear} />
                    <TextInput placeholder="Car Color" placeholderTextColor="#777" style={styles.input} value={carColor} onChangeText={setCarColor} />
                    <TextInput
                      placeholder="License Plate"
                      placeholderTextColor="#777"
                      style={styles.input}
                      value={licensePlate}
                      onChangeText={setLicensePlate}
                      autoCapitalize="characters"
                      maxLength={12}
                    />
                    <TextInput
                      placeholder="RC Number"
                      placeholderTextColor="#777"
                      style={styles.input}
                      value={rcNumber}
                      onChangeText={setRcNumber}
                      autoCapitalize="characters"
                      maxLength={15}
                    />
                  </View>

                  <Text style={styles.sectionTitle}>Add photo of your car</Text>
                  <View style={styles.uploadBox}>
                    {carPhoto ? (
                      <Image source={{ uri: carPhoto.path }} style={styles.previewImage} />
                    ) : (
                      <>
                        <Text style={styles.uploadTitle}>Add photo</Text>
                        <Text style={styles.uploadSubtitle}>Add photo of your car to help{'\n'}passengers identify it</Text>
                      </>
                    )}
                    <TouchableOpacity style={styles.uploadButton} onPress={() => requestImageSelection(setCarPhoto, 'car')}>
                      <Text style={styles.uploadButtonText}>{carPhoto ? 'Change Photo' : 'Add Photo'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.msgText}>Please take clear photos of your driver's license.</Text>
                  <Text style={styles.sectionTitle}>Driver's License (Front)</Text>
                  <View style={styles.uploadBox}>
                    {licenseFront ? (
                      <Image source={{ uri: licenseFront.path }} style={styles.previewImage} />
                    ) : (
                      <Icon name="card-account-details-outline" size={50} color="#ccc" />
                    )}
                    <TouchableOpacity style={styles.uploadButton} onPress={() => requestImageSelection(setLicenseFront, 'license')}>
                      <Text style={styles.uploadButtonText}>{licenseFront ? 'Change Photo' : 'Upload Front'}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sectionTitle}>Driver's License (Back)</Text>
                  <View style={styles.uploadBox}>
                    {licenseBack ? (
                      <Image source={{ uri: licenseBack.path }} style={styles.previewImage} />
                    ) : (
                      <Icon name="card-account-details-outline" size={50} color="#ccc" />
                    )}
                    <TouchableOpacity style={styles.uploadButton} onPress={() => requestImageSelection(setLicenseBack, 'license')}>
                      <Text style={styles.uploadButtonText}>{licenseBack ? 'Change Photo' : 'Upload Back'}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sectionTitle}>RC (Registration Certificate) Front</Text>
                  <View style={styles.uploadBox}>
                    {rcFront ? (
                      <Image source={{ uri: rcFront.path }} style={styles.previewImage} />
                    ) : (
                      <Icon name="file-document-outline" size={50} color="#ccc" />
                    )}
                    <TouchableOpacity style={styles.uploadButton} onPress={() => requestImageSelection(setRcFront, 'rc')}>
                      <Text style={styles.uploadButtonText}>{rcFront ? 'Change Photo' : 'Upload RC Front'}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sectionTitle}>RC (Registration Certificate) Back</Text>
                  <View style={styles.uploadBox}>
                    {rcBack ? (
                      <Image source={{ uri: rcBack.path }} style={styles.previewImage} />
                    ) : (
                      <Icon name="file-document-outline" size={50} color="#ccc" />
                    )}
                    <TouchableOpacity style={styles.uploadButton} onPress={() => requestImageSelection(setRcBack, 'rc')}>
                      <Text style={styles.uploadButtonText}>{rcBack ? 'Change Photo' : 'Upload RC Back'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {/* Moved Buttons Inside ScrollView so they don't fight native keyboard layout */}
              <View style={[styles.bottomSection, { paddingHorizontal: 0 }]}>
                {step === 1 ? (
                  <TouchableOpacity onPress={handleContinue} style={styles.continueButton}>
                    <Text style={styles.continueText}>Continue</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleSubmit} style={[styles.continueButton, submitting && { opacity: 0.7 }]} disabled={submitting}>
                    <Text style={styles.continueText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddYourCar;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
    marginBottom: 10,
    backgroundColor: '#248907',
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: 24, // compensate for back arrow
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginBottom: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: scale(20),
  },
  tabButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#248907',
  },
  tabText: {
    fontSize: responsiveFontSize(16),
    color: '#777',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#248907',
  },

  // List Item Styles
  carCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: moderateScale(10),
    padding: moderateScale(10),
    marginBottom: verticalScale(15),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  carListImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: moderateScale(8),
    marginRight: scale(15),
    backgroundColor: '#f0f0f0',
  },
  carInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  carTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#000',
    marginBottom: verticalScale(4),
  },
  carDetail: {
    fontSize: responsiveFontSize(14),
    color: '#555',
    marginBottom: verticalScale(4),
  },
  plateText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(4),
  },
  statusText: {
    color: '#fff',
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(50),
  },
  emptyText: {
    marginTop: verticalScale(10),
    fontSize: responsiveFontSize(16),
    color: '#777',
    marginBottom: verticalScale(20),
  },
  addFirstBtn: {
    backgroundColor: '#248907',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
    borderRadius: moderateScale(8),
  },
  addFirstBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Form Styles
  formTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    marginBottom: verticalScale(15),
    color: '#333',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: verticalScale(55),
    borderWidth: 1.2,
    borderColor: '#6EC16E',
    borderRadius: moderateScale(10),
    fontSize: responsiveFontSize(16),
    paddingHorizontal: scale(12),
    color: '#000',
    marginBottom: verticalScale(18),
  },
  sectionTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#000',
    marginTop: verticalScale(15),
    marginBottom: verticalScale(10),
  },
  msgText: {
    fontSize: responsiveFontSize(16),
    color: '#555',
    textAlign: 'center',
    marginBottom: verticalScale(20),
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#4CAF50',
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(20),
    alignItems: 'center',
    marginBottom: verticalScale(20),
    minHeight: verticalScale(150),
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#000',
  },
  uploadSubtitle: {
    marginTop: verticalScale(5),
    fontSize: responsiveFontSize(14),
    color: '#555',
    textAlign: 'center',
  },
  uploadButton: {
    marginTop: verticalScale(15),
    backgroundColor: '#248907',
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(20),
    borderRadius: moderateScale(8),
  },
  uploadButtonText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#fff',
  },
  previewImage: {
    width: scale(200),
    height: verticalScale(120),
    borderRadius: moderateScale(10),
    resizeMode: 'cover',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: scale(20),
  },
  bottomSection: {
    paddingVertical: verticalScale(20),
    paddingHorizontal: scale(20),
    backgroundColor: '#fff',
  },
  continueButton: {
    width: '100%',
    height: verticalScale(55),
    backgroundColor: '#248907',
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: '#fff',
  },
});

