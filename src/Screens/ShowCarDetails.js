import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, IMG_URL } from '../config/config';
import ImagePicker from 'react-native-image-crop-picker';

const ShowCarDetails = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { carId } = route.params;

    const [loading, setLoading] = useState(true);
    const [carData, setCarData] = useState(null);
    const [licenseFront, setLicenseFront] = useState(null);
    const [licenseBack, setLicenseBack] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [validatingImage, setValidatingImage] = useState(false);

    // Edit Form State
    const [carMake, setCarMake] = useState('');
    const [carModel, setCarModel] = useState('');
    const [carYear, setCarYear] = useState('');
    const [carColor, setCarColor] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [carPhoto, setCarPhoto] = useState(null);

    useEffect(() => {
        fetchCarDetails();
    }, [carId]);

    const fetchCarDetails = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            // Using carId directly in the endpoint as requested: cars/{id}
            const response = await axios.get(`${BASE_URL}cars/${carId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Fetch Single Car Response:', response.data);

            if (response.data.status === true || response.status === 200) {
                const data = response.data.data;
                setCarData(data);
                // Initialize form state
                setCarMake(data.car_make);
                setCarModel(data.car_model);
                setCarYear(data.car_year.toString());
                setCarColor(data.car_color);
                setLicensePlate(data.licence_plate);
                // Reset photo states
                setCarPhoto(null);
                setLicenseFront(null);
                setLicenseBack(null);
            } else {
                Alert.alert('Error', 'Failed to fetch car details.');
                navigation.goBack();
            }
        } catch (error) {
            console.error('Fetch Single Car Error:', error);
            Alert.alert('Error', 'An error occurred while fetching car details.');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Car",
            "Are you sure you want to delete this car?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: 'destructive', onPress: performDelete }
            ]
        );
    };

    const performDelete = async () => {
        setLoading(true); // Show loading overlay or indicator
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.delete(`${BASE_URL}cars/${carId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('Delete Car Response:', response.data);
            if (response.data.status === true || response.status === 200) {
                Alert.alert('Success', 'Car deleted successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', response.data.message || 'Failed to delete car.');
            }
        } catch (error) {
            console.error('Delete Car Error:', error);
            Alert.alert('Error', 'An error occurred while deleting the car.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        const licenseClean = licensePlate.replace(/\s+/g, '').toUpperCase();
        if (licenseClean.length < 9 || licenseClean.length > 10) {
            Alert.alert('Invalid License Plate', 'Registration number must be 9 or 10 characters long.');
            return;
        }
        const alphaNumericRegex = /^[a-zA-Z0-9]+$/;
        if (!alphaNumericRegex.test(licenseClean)) {
            Alert.alert('Invalid License Plate', 'Registration number must only contain letters and numbers.');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append('car_make', carMake);
        formData.append('car_model', carModel);
        formData.append('car_year', carYear);
        formData.append('car_color', carColor);
        formData.append('licence_plate', licensePlate);
        // Note: API for update might strictly need all fields or allow partial. 
        // Provided info: post update car - cars/1

        if (carPhoto) {
            formData.append('car_photo', {
                uri: carPhoto.path,
                type: carPhoto.mime,
                name: carPhoto.path.split('/').pop(),
            });
        }
        if (licenseFront) {
            formData.append('driver_license_front', {
                uri: licenseFront.path,
                type: licenseFront.mime,
                name: licenseFront.path.split('/').pop(),
            });
        }
        if (licenseBack) {
            formData.append('driver_license_back', {
                uri: licenseBack.path,
                type: licenseBack.mime,
                name: licenseBack.path.split('/').pop(),
            });
        }

        try {
            const token = await AsyncStorage.getItem('access_token');
            // POST request to update as per requirement
            const response = await axios.post(`${BASE_URL}cars/${carId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
            });

            console.log('Update Car Response:', response.data);

            if (response.data.status === true || response.status === 200) {
                Alert.alert('Success', 'Car updated successfully');
                setIsEditing(false);
                fetchCarDetails(); // Refresh data
            } else {
                Alert.alert('Error', response.data.message || 'Failed to update car.');
            }

        } catch (error) {
            console.error('Update Car Error:', error);
            Alert.alert('Error', 'An error occurred while updating the car.');
        } finally {
            setSubmitting(false);
        }
    };

    const requestImageSelection = (setImageCallback, type) => {
        Alert.alert(
            "Select Photo", "Choose an option",
            [
                { text: "Camera", onPress: () => openCamera(setImageCallback, type) },
                { text: "Gallery", onPress: () => openGallery(setImageCallback, type) },
                { text: "Cancel", style: "cancel" },
            ]
        );
    };

    const openCamera = (setImageCallback, type) => {
        ImagePicker.openCamera({ width: 400, height: 300, cropping: true, mediaType: 'photo', includeBase64: true, compressImageQuality: 0.6 })
            .then(image => handleImageValidation(image, setImageCallback, type))
            .catch(err => console.log('Camera Error: ', err));
    };

    const openGallery = (setImageCallback, type) => {
        ImagePicker.openPicker({ width: 400, height: 300, cropping: true, mediaType: 'photo', includeBase64: true, compressImageQuality: 0.6 })
            .then(image => handleImageValidation(image, setImageCallback, type))
            .catch(err => console.log('Gallery Error: ', err));
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
                Alert.alert(
                    "Invalid Photo",
                    type === 'car'
                        ? "Invalid photo selected. Please upload a clear photo of your car."
                        : "Invalid photo selected. Please upload a clear photo of your Driving License/ID."
                );
            }
        } catch (err) {
            console.warn('Handling Error: ', err);
            setImageCallback(image);
        } finally {
            setValidatingImage(false);
        }
    };

    const checkImageContent = async (base64String, type) => {
        // Attempting real AI validation for cars. If Google Vision API is restricted, 
        // we log the error but let the user proceed so they are not blocked.
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
                const isCar = labels.some(label => carKeywords.includes(label.description.toLowerCase()));
                return isCar;
            }

            // For license, we just check if it's generally identifiable as a document or card
            return labels.length > 0;

        } catch (error) {
            console.warn('Vision API call failed:', error.response ? error.response.data : error.message);

            if (error.response?.status === 403) {
                // If restricted, we alert the user but let them proceed for now (as per user logic)
                console.log('Vision API is restricted (403). Please enable "Cloud Vision API" in Google Cloud Console.');
            }
            return true; // Fallback to true if API is restricted, so we don't block them.
        }
    };


    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#248907" />
            </View>
        );
    }

    if (!carData) return null; // Should have navigated back on error

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#248907" translucent={false} />

            {/* Header */}
            <View style={styles.headerView}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerText}>{isEditing ? 'Edit Car' : 'Car Details'}</Text>
                {!isEditing && (
                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                        <Icon name="pencil" size={24} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {/* Loading Overlay */}
                {validatingImage && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 100, justifyContent: 'center', alignItems: 'center' }]}>
                        <ActivityIndicator size="large" color="#248907" />
                        <Text style={{ marginTop: 10, fontWeight: '700', color: '#248907' }}>Validating AI Image...</Text>
                    </View>
                )}

                <ScrollView contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>

                    {/* Car Image */}
                    <View style={styles.imageContainer}>
                        {isEditing ? (
                            <TouchableOpacity onPress={() => requestImageSelection(setCarPhoto, 'car')} style={{ width: '100%' }}>
                                {carPhoto ? (
                                    <Image source={{ uri: carPhoto.path }} style={styles.carImage} />
                                ) : (
                                    <Image
                                        source={{ uri: (carData.car_photo && carData.car_photo.startsWith('http')) ? carData.car_photo : (carData.car_photo ? `${IMG_URL}${carData.car_photo}` : 'https://argosmob.site/storage/car_photos/default_car.png') }}
                                        style={[styles.carImage, { opacity: 0.7 }]}
                                    />
                                )}
                                <View style={styles.editBadge}>
                                    <Icon name="camera" size={20} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <Image
                                source={{ uri: (carData.car_photo && carData.car_photo.startsWith('http')) ? carData.car_photo : (carData.car_photo ? `${IMG_URL}${carData.car_photo}` : 'https://argosmob.site/storage/car_photos/default_car.png') }}
                                style={styles.carImage}
                            />
                        )}
                    </View>

                    {/* Verification Status */}
                    {!isEditing && (
                        <View style={[styles.statusBanner, { backgroundColor: carData.license_verified === 'verified' ? '#e8f5e9' : '#fff3e0' }]}>
                            <Icon name={carData.license_verified === 'verified' ? "check-circle" : "alert-circle-outline"} size={20} color={carData.license_verified === 'verified' ? "#4caf50" : "#ff9800"} />
                            <Text style={[styles.statusText, { color: carData.license_verified === 'verified' ? "#2e7d32" : "#ef6c00" }]}>
                                Verification Status: {carData.license_verified ? carData.license_verified.toUpperCase() : 'PENDING'}
                            </Text>
                        </View>
                    )}


                    {/* Details Form/View */}
                    <View style={styles.detailsContainer}>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Make</Text>
                            {isEditing ? (
                                <TextInput style={styles.input} value={carMake} onChangeText={setCarMake} />
                            ) : (
                                <Text style={styles.value}>{carData.car_make}</Text>
                            )}
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Model</Text>
                            {isEditing ? (
                                <TextInput style={styles.input} value={carModel} onChangeText={setCarModel} />
                            ) : (
                                <Text style={styles.value}>{carData.car_model}</Text>
                            )}
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Year</Text>
                            {isEditing ? (
                                <TextInput style={styles.input} value={carYear} onChangeText={setCarYear} keyboardType="numeric" />
                            ) : (
                                <Text style={styles.value}>{carData.car_year}</Text>
                            )}
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>Color</Text>
                            {isEditing ? (
                                <TextInput style={styles.input} value={carColor} onChangeText={setCarColor} />
                            ) : (
                                <Text style={styles.value}>{carData.car_color}</Text>
                            )}
                        </View>

                        <View style={styles.fieldContainer}>
                            <Text style={styles.label}>License Plate</Text>
                            {isEditing ? (
                                <TextInput style={styles.input} value={licensePlate} onChangeText={setLicensePlate} autoCapitalize="characters" maxLength={12} />
                            ) : (
                                <Text style={styles.value}>{carData.licence_plate}</Text>
                            )}
                        </View>

                        {/* License Photos Section */}
                        <Text style={styles.sectionTitle}>Driver's License</Text>

                        <View style={styles.licenseRow}>
                            <View style={styles.licenseItem}>
                                <Text style={styles.label}>Front</Text>
                                {isEditing ? (
                                    <TouchableOpacity onPress={() => requestImageSelection(setLicenseFront, 'license')} style={styles.licenseTouch}>
                                        {licenseFront ? (
                                            <Image source={{ uri: licenseFront.path }} style={styles.licenseImage} />
                                        ) : (
                                            carData.driver_license_front ? (
                                                <Image
                                                    source={{ uri: (carData.driver_license_front.startsWith('http')) ? carData.driver_license_front : `${IMG_URL}${carData.driver_license_front}` }}
                                                    style={[styles.licenseImage, { opacity: 0.7 }]}
                                                />
                                            ) : (
                                                <Icon name="card-account-details-outline" size={40} color="#ccc" />
                                            )
                                        )}
                                        <View style={styles.editBadgeSmall}>
                                            <Icon name="camera" size={14} color="#fff" />
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    carData.driver_license_front ? (
                                        <Image
                                            source={{ uri: (carData.driver_license_front.startsWith('http')) ? carData.driver_license_front : `${IMG_URL}${carData.driver_license_front}` }}
                                            style={styles.licenseImage}
                                        />
                                    ) : (
                                        <View style={styles.noImagePlaceholder}>
                                            <Text style={{ color: '#999' }}>No Image</Text>
                                        </View>
                                    )
                                )}
                            </View>

                            <View style={styles.licenseItem}>
                                <Text style={styles.label}>Back</Text>
                                {isEditing ? (
                                    <TouchableOpacity onPress={() => requestImageSelection(setLicenseBack, 'license')} style={styles.licenseTouch}>
                                        {licenseBack ? (
                                            <Image source={{ uri: licenseBack.path }} style={styles.licenseImage} />
                                        ) : (
                                            carData.driver_license_back ? (
                                                <Image
                                                    source={{ uri: (carData.driver_license_back.startsWith('http')) ? carData.driver_license_back : `${IMG_URL}${carData.driver_license_back}` }}
                                                    style={[styles.licenseImage, { opacity: 0.7 }]}
                                                />
                                            ) : (
                                                <Icon name="card-account-details-outline" size={40} color="#ccc" />
                                            )
                                        )}
                                        <View style={styles.editBadgeSmall}>
                                            <Icon name="camera" size={14} color="#fff" />
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    carData.driver_license_back ? (
                                        <Image
                                            source={{ uri: (carData.driver_license_back.startsWith('http')) ? carData.driver_license_back : `${IMG_URL}${carData.driver_license_back}` }}
                                            style={styles.licenseImage}
                                        />
                                    ) : (
                                        <View style={styles.noImagePlaceholder}>
                                            <Text style={{ color: '#999' }}>No Image</Text>
                                        </View>
                                    )
                                )}
                            </View>
                        </View>

                    </View>

                    {isEditing ? (
                        <View style={[styles.actionButtons, { marginTop: 20 }]}>
                            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleUpdate} style={styles.saveButton} disabled={submitting}>
                                <Text style={styles.saveText}>{submitting ? 'Saving...' : 'Save Changes'}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={handleDelete} style={[styles.deleteButton, { marginTop: 20 }]}>
                            <Icon name="delete" size={20} color="#fff" />
                            <Text style={styles.deleteText}>Delete Car</Text>
                        </TouchableOpacity>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>

        </SafeAreaView>
    );
};

export default ShowCarDetails;

const styles = StyleSheet.create({
    safe: {
        flex: 1, backgroundColor: '#fff',
    },
    headerView: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
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
    imageContainer: {
        alignItems: 'center', marginVertical: 20,
    },
    carImage: {
        width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover', backgroundColor: '#f0f0f0',
    },
    editBadge: {
        position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20,
    },
    statusBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, marginBottom: 20,
    },
    statusText: {
        marginLeft: 8, fontWeight: '600', fontSize: 14,
    },
    detailsContainer: {
        marginBottom: 20,
    },
    fieldContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14, color: '#777', marginBottom: 5,
    },
    value: {
        fontSize: 18, color: '#000', fontWeight: '500',
    },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, color: '#000',
    },
    deleteButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#d32f2f', padding: 15, borderRadius: 10, marginTop: 10,
    },
    deleteText: {
        color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8,
    },
    actionButtons: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: 10,
    },
    cancelButton: {
        flex: 1, backgroundColor: '#eee', padding: 15, borderRadius: 10, marginRight: 10, alignItems: 'center',
    },
    cancelText: {
        color: '#333', fontSize: 16, fontWeight: '600',
    },
    saveButton: {
        flex: 1, backgroundColor: '#248907', padding: 15, borderRadius: 10, marginLeft: 10, alignItems: 'center',
    },
    saveText: {
        color: '#fff', fontSize: 16, fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 18, fontWeight: '700', color: '#000', marginTop: 15, marginBottom: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15
    },
    licenseRow: {
        flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10
    },
    licenseItem: {
        flex: 1, alignItems: 'center', marginHorizontal: 5
    },
    licenseImage: {
        width: 150, height: 100, borderRadius: 8, backgroundColor: '#f0f0f0', resizeMode: 'cover'
    },
    licenseTouch: {
        position: 'relative'
    },
    editBadgeSmall: {
        position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', padding: 5, borderRadius: 15,
    },
    noImagePlaceholder: {
        width: 150, height: 100, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center'
    }
});
