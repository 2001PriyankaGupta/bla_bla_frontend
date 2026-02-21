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
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ImagePicker from 'react-native-image-crop-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, IMG_URL } from '../config/config';

const AddYourCar = () => {
  const navigation = useNavigation();

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

  // State for photos
  const [carPhoto, setCarPhoto] = useState(null);
  const [licenseFront, setLicenseFront] = useState(null);
  const [licenseBack, setLicenseBack] = useState(null);

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

  // --- Photo Handling (Camera/Gallery) ---
  const requestImageSelection = (setImage) => {
    Alert.alert(
      "Select Photo",
      "Choose an option",
      [
        { text: "Camera", onPress: () => openCamera(setImage) },
        { text: "Gallery", onPress: () => openGallery(setImage) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const openCamera = (setImage) => {
    ImagePicker.openCamera({
      width: 400, height: 300, cropping: true, mediaType: 'photo',
    }).then(image => setImage(image)).catch(err => console.log('Camera Error: ', err));
  };

  const openGallery = (setImage) => {
    ImagePicker.openPicker({
      width: 400, height: 300, cropping: true, mediaType: 'photo',
    }).then(image => setImage(image)).catch(err => console.log('Gallery Error: ', err));
  };

  // --- Form Logic ---
  const validateStep1 = () => {
    if (!carMake || !carModel || !carYear || !carColor || !licensePlate || !carPhoto) {
      Alert.alert('Error', 'Please fill all car details and add a car photo.');
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
    if (!licenseFront || !licenseBack) {
      Alert.alert('Error', 'Please upload both front and back photos of your driving license.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('car_make', carMake);
    formData.append('car_model', carModel);
    formData.append('car_year', carYear);
    formData.append('car_color', carColor);
    formData.append('licence_plate', licensePlate);

    if (carPhoto) formData.append('car_photo', { uri: carPhoto.path, type: carPhoto.mime, name: carPhoto.path.split('/').pop() });
    if (licenseFront) formData.append('driver_license_front', { uri: licenseFront.path, type: licenseFront.mime, name: licenseFront.path.split('/').pop() });
    if (licenseBack) formData.append('driver_license_back', { uri: licenseBack.path, type: licenseBack.mime, name: licenseBack.path.split('/').pop() });

    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.post(`${BASE_URL}cars`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` },
      });

      console.log('Add Car Response:', response.data);
      if (response.data.status === "true" || response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Car details added successfully!');
        // Reset Form
        setCarMake(''); setCarModel(''); setCarYear(''); setCarColor(''); setLicensePlate('');
        setCarPhoto(null); setLicenseFront(null); setLicenseBack(null);
        setStep(1);
        // Switch back to list tab
        setActiveTab('list');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to add car details.');
      }
    } catch (error) {
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
        source={{ uri: item.car_photo.startsWith('http') ? item.car_photo : `${IMG_URL}${item.car_photo}` }}
        style={styles.carListImage}
      />
      <View style={styles.carInfo}>
        <Text style={styles.carTitle}>{item.car_make} {item.car_model}</Text>
        <Text style={styles.carDetail}>{item.car_color} • {item.car_year}</Text>
        <Text style={styles.plateText}>{item.licence_plate}</Text>

        <View style={[styles.statusBadge, { backgroundColor: item.license_verified === 'verified' ? '#4caf50' : '#ff9800' }]}>
          <Text style={styles.statusText}>{item.license_verified ? item.license_verified.toUpperCase() : 'PENDING'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >

        {/* Header */}
        <View style={styles.headerView}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#000" />
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
            {/* Reuse the ScrollView Form structure */}
            <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
              {step === 1 ? (
                <>
                  <Text style={styles.formTitle}>Car Details</Text>
                  <View style={{ alignItems: 'center', marginTop: 10 }}>
                    <TextInput placeholder="Car Make" placeholderTextColor="#777" style={styles.input} value={carMake} onChangeText={setCarMake} />
                    <TextInput placeholder="Car Model" placeholderTextColor="#777" style={styles.input} value={carModel} onChangeText={setCarModel} />
                    <TextInput placeholder="Car Year" placeholderTextColor="#777" keyboardType="numeric" style={styles.input} value={carYear} onChangeText={setCarYear} />
                    <TextInput placeholder="Car Color" placeholderTextColor="#777" style={styles.input} value={carColor} onChangeText={setCarColor} />
                    <TextInput placeholder="License Plate" placeholderTextColor="#777" style={styles.input} value={licensePlate} onChangeText={setLicensePlate} />
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
                    <TouchableOpacity style={styles.uploadButton} onPress={() => requestImageSelection(setCarPhoto)}>
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
                    <TouchableOpacity style={styles.uploadButton} onPress={() => requestImageSelection(setLicenseFront)}>
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
                    <TouchableOpacity style={styles.uploadButton} onPress={() => requestImageSelection(setLicenseBack)}>
                      <Text style={styles.uploadButtonText}>{licenseBack ? 'Change Photo' : 'Upload Back'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Bottom Fixed Buttons for Form */}
            <View style={styles.bottomSection}>
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
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 20, fontWeight: '600', color: '#000', flex: 1, textAlign: 'center', marginRight: 24,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 20,
  },
  tabButton: {
    flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#248907',
  },
  tabText: {
    fontSize: 16, color: '#777', fontWeight: '600',
  },
  activeTabText: {
    color: '#248907',
  },

  // List Item Styles
  carCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 15,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 3,
  },
  carListImage: {
    width: 80, height: 80, borderRadius: 8, marginRight: 15, backgroundColor: '#f0f0f0',
  },
  carInfo: {
    flex: 1, justifyContent: 'center',
  },
  carTitle: {
    fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 4,
  },
  carDetail: {
    fontSize: 14, color: '#555', marginBottom: 4,
  },
  plateText: {
    fontSize: 14, fontWeight: '600', color: '#333',
  },
  statusBadge: {
    position: 'absolute', top: 0, right: 0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4,
  },
  statusText: {
    color: '#fff', fontSize: 10, fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center', justifyContent: 'center', marginTop: 50,
  },
  emptyText: {
    marginTop: 10, fontSize: 16, color: '#777', marginBottom: 20,
  },
  addFirstBtn: {
    backgroundColor: '#248907', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8,
  },
  addFirstBtnText: {
    color: '#fff', fontWeight: '600',
  },

  // Form Styles
  formTitle: {
    fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#333', textAlign: 'center'
  },
  input: {
    width: '100%', height: 55, borderWidth: 1.2, borderColor: '#6EC16E', borderRadius: 10, fontSize: 16, paddingHorizontal: 12, color: '#000', marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: '700', color: '#000', marginTop: 15, marginBottom: 10,
  },
  msgText: {
    fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 20,
  },
  uploadBox: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#4CAF50', borderRadius: 12, paddingVertical: 20, alignItems: 'center', marginBottom: 20, minHeight: 150, justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 18, fontWeight: '700', color: '#000',
  },
  uploadSubtitle: {
    marginTop: 5, fontSize: 14, color: '#555', textAlign: 'center',
  },
  uploadButton: {
    marginTop: 15, backgroundColor: '#248907', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 14, fontWeight: '600', color: '#fff',
  },
  previewImage: {
    width: 200, height: 120, borderRadius: 10, resizeMode: 'cover',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottomSection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  continueButton: {
    width: '100%', height: 55, backgroundColor: '#248907', borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  continueText: {
    fontSize: 18, fontWeight: '600', color: '#fff',
  },
});
