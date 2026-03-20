import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    Platform,
    ScrollView,
    Image,
    Alert,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView
} from 'react-native';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
    const insets = useSafeAreaInsets();
    const { carId } = route.params;

    const [loading, setLoading] = useState(true);
    const [carData, setCarData] = useState(null);
    const [licenseFront, setLicenseFront] = useState(null);
    const [licenseBack, setLicenseBack] = useState(null);
    const [rcFront, setRcFront] = useState(null);
    const [rcBack, setRcBack] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [validatingImage, setValidatingImage] = useState(false);

    // Edit Form State
    const [carMake, setCarMake] = useState('');
    const [carModel, setCarModel] = useState('');
    const [carYear, setCarYear] = useState('');
    const [carColor, setCarColor] = useState('');
    const [licensePlate, setLicensePlate] = useState('');
    const [rcNumber, setRcNumber] = useState('');
    const [carPhoto, setCarPhoto] = useState(null);

    useEffect(() => {
        fetchCarDetails();
    }, [carId]);

    const fetchCarDetails = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${BASE_URL}cars/${carId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.status === true || response.status === 200) {
                const data = response.data.data;
                setCarData(data);
                // Initialize form state
                setCarMake(data.car_make);
                setCarModel(data.car_model);
                setCarYear(data.car_year.toString());
                setCarColor(data.car_color);
                setLicensePlate(data.licence_plate);
                setRcNumber(data.rc_number || '');
                // Reset photo states
                setCarPhoto(null);
                setLicenseFront(null);
                setLicenseBack(null);
                setRcFront(null);
                setRcBack(null);
            } else {
                Alert.alert('Error', 'Failed to fetch car details.');
                navigation.goBack();
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('user_data');
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }

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
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.delete(`${BASE_URL}cars/${carId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.status === true || response.status === 200) {
                Alert.alert('Success', 'Car deleted successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', response.data.message || 'Failed to delete car.');
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('user_data');
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }

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

        const rcClean = rcNumber.replace(/\s+/g, '').toUpperCase();
        if (rcClean.length < 9 || rcClean.length > 11) {
            Alert.alert('Invalid RC Number', 'RC number must be 9 to 11 characters long.');
            return false;
        }
        if (!alphaNumericRegex.test(rcClean)) {
            Alert.alert('Invalid RC Number', 'RC number must only contain letters and numbers.');
            return false;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append('car_make', carMake);
        formData.append('car_model', carModel);
        formData.append('car_year', carYear);
        formData.append('car_color', carColor);
        formData.append('licence_plate', licensePlate);
        formData.append('rc_number', rcNumber);

        if (carPhoto) {
            formData.append('car_photo', { uri: carPhoto.path, type: carPhoto.mime, name: carPhoto.path.split('/').pop() });
        }
        if (licenseFront) {
            formData.append('driver_license_front', { uri: licenseFront.path, type: licenseFront.mime, name: licenseFront.path.split('/').pop() });
        }
        if (licenseBack) {
            formData.append('driver_license_back', { uri: licenseBack.path, type: licenseBack.mime, name: licenseBack.path.split('/').pop() });
        }
        if (rcFront) {
            formData.append('rc_front_image', { uri: rcFront.path, type: rcFront.mime, name: rcFront.path.split('/').pop() });
        }
        if (rcBack) {
            formData.append('rc_back_image', { uri: rcBack.path, type: rcBack.mime, name: rcBack.path.split('/').pop() });
        }

        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.post(`${BASE_URL}cars/${carId}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (response.data.status === true || response.status === 200) {
                Alert.alert('Success', 'Car updated successfully');
                setIsEditing(false);
                fetchCarDetails();
            } else {
                Alert.alert('Error', response.data.message || 'Failed to update car.');
            }

        } catch (error) {
            if (error.response && error.response.status === 401) {
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('user_data');
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }

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
                let msg = type === 'car'
                    ? "Invalid photo selected. Please upload a clear photo of your car."
                    : type === 'rc'
                        ? "Invalid photo selected. Please upload a clear photo of your Registration Certificate (RC)."
                        : "Invalid photo selected. Please upload a clear photo of your Driving License/ID.";
                Alert.alert("Invalid Photo", msg);
            }
        } catch (err) {
            console.warn('Handling Error: ', err);
            setImageCallback(image);
        } finally {
            setValidatingImage(false);
        }
    };

    const checkImageContent = async (base64String, type) => {
        try {
            const response = await axios.post(
                `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_MAPS_API_KEY}`,
                {
                    requests: [{ image: { content: base64String }, features: [{ type: 'LABEL_DETECTION' }] }]
                }
            );

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

            return true;
        }
    };


    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#248907" />
            </View>
        );
    }

    if (!carData) return null;

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#248907" translucent={false} />

            {/* Header */}
            <View style={[styles.headerView, { paddingTop: insets.top + 18 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconCircle}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerText}>{isEditing ? 'Edit Vehicle Info' : 'Car Dashboard'}</Text>
                {!isEditing && (
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconCircleEdit}>
                        <Icon name="pencil" size={22} color="#fff" />
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
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 100, justifyContent: 'center', alignItems: 'center' }]}>
                        <ActivityIndicator size="large" color="#248907" />
                        <Text style={{ marginTop: 15, fontWeight: '700', fontSize: 16, color: '#248907' }}>Validating Document...</Text>
                    </View>
                )}

                <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>

                    {/* Car Image Cover - Edge to Edge */}
                    <View style={styles.imageContainer}>
                        {isEditing ? (
                            <TouchableOpacity onPress={() => requestImageSelection(setCarPhoto, 'car')} style={{ width: '100%' }}>
                                {carPhoto ? (
                                    <Image source={{ uri: carPhoto.path }} style={styles.carImageCover} />
                                ) : (
                                    <Image
                                        source={{ uri: (carData.car_photo && carData.car_photo.startsWith('http')) ? carData.car_photo : (carData.car_photo ? `${IMG_URL}${carData.car_photo}` : 'https://argosmob.site/storage/car_photos/default_car.png') }}
                                        style={[styles.carImageCover, { opacity: 0.8 }]}
                                    />
                                )}
                                <View style={styles.editBadgeCentral}>
                                    <Icon name="camera-plus" size={30} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Change Photo</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <Image
                                source={{ uri: (carData.car_photo && carData.car_photo.startsWith('http')) ? carData.car_photo : (carData.car_photo ? `${IMG_URL}${carData.car_photo}` : 'https://argosmob.site/storage/car_photos/default_car.png') }}
                                style={styles.carImageCover}
                            />
                        )}
                        <View style={styles.imageGradientOverlay} />
                    </View>

                    {/* Content Section Moved Up Laterally */}
                    <View style={styles.mainContentWrapper}>

                        {/* Verification Status Card */}
                        {!isEditing && (
                            <View style={[styles.statusBannerModern, { backgroundColor: carData.license_verified === 'verified' ? '#E8F5E9' : carData.license_verified === 'rejected' ? '#FFEBEE' : '#FFF3E0' }]}>
                                <View style={[styles.statusIconBox, { backgroundColor: carData.license_verified === 'verified' ? '#4CAF50' : carData.license_verified === 'rejected' ? '#F44336' : '#FF9800' }]}>
                                    <Icon name={carData.license_verified === 'verified' ? "shield-check" : carData.license_verified === 'rejected' ? "shield-remove" : "shield-alert"} size={24} color="#fff" />
                                </View>
                                <View style={{ flex: 1, paddingLeft: 12 }}>
                                    <Text style={{ fontSize: 13, color: '#555', fontWeight: '500' }}>Verification Status</Text>
                                    <Text style={[styles.statusTextModern, { color: carData.license_verified === 'verified' ? "#2e7d32" : carData.license_verified === 'rejected' ? "#c62828" : "#ef6c00" }]}>
                                        {carData.license_verified ? carData.license_verified.toUpperCase() : 'PENDING'}
                                    </Text>
                                </View>
                            </View>
                        )}


                        {/* Vehicle Identity Card */}
                        <View style={styles.infoCard}>
                            <View style={styles.cardHeaderArea}>
                                <Icon name="car-info" size={24} color="#248907" />
                                <Text style={styles.cardHeaderText}>Vehicle Identity</Text>
                            </View>

                            <View style={styles.detailsGrid}>
                                <View style={styles.fieldBlock}>
                                    <Text style={styles.labelModern}>Make</Text>
                                    {isEditing ? <TextInput style={styles.inputModern} value={carMake} onChangeText={setCarMake} /> : <Text style={styles.valueModern}>{carData.car_make}</Text>}
                                </View>
                                <View style={styles.fieldBlock}>
                                    <Text style={styles.labelModern}>Model</Text>
                                    {isEditing ? <TextInput style={styles.inputModern} value={carModel} onChangeText={setCarModel} /> : <Text style={styles.valueModern}>{carData.car_model}</Text>}
                                </View>
                                <View style={styles.fieldBlock}>
                                    <Text style={styles.labelModern}>Year</Text>
                                    {isEditing ? <TextInput style={styles.inputModern} value={carYear} onChangeText={setCarYear} keyboardType="numeric" /> : <Text style={styles.valueModern}>{carData.car_year}</Text>}
                                </View>
                                <View style={styles.fieldBlock}>
                                    <Text style={styles.labelModern}>Color</Text>
                                    {isEditing ? <TextInput style={styles.inputModern} value={carColor} onChangeText={setCarColor} /> : <Text style={styles.valueModern}>{carData.car_color}</Text>}
                                </View>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.fieldBlockFull}>
                                <Text style={styles.labelModern}>License Plate / Reg Number</Text>
                                {isEditing ? <TextInput style={styles.inputModernFull} value={licensePlate} onChangeText={setLicensePlate} autoCapitalize="characters" maxLength={12} /> : <View style={styles.plateTag}><Text style={styles.plateTagText}>{carData.licence_plate}</Text></View>}
                            </View>
                            <View style={[styles.fieldBlockFull, { marginTop: 15 }]}>
                                <Text style={styles.labelModern}>RC Number</Text>
                                {isEditing ? <TextInput style={styles.inputModernFull} value={rcNumber} onChangeText={setRcNumber} autoCapitalize="characters" maxLength={15} /> : <Text style={[styles.valueModern, { fontWeight: '700', fontSize: 17 }]}>{carData.rc_number || 'N/A'}</Text>}
                            </View>
                        </View>


                        {/* Document Gallery */}
                        <View style={styles.infoCard}>
                            <View style={styles.cardHeaderArea}>
                                <Icon name="file-document-multiple" size={24} color="#248907" />
                                <Text style={styles.cardHeaderText}>Legal Documents</Text>
                            </View>

                            {/* Drivers License */}
                            <Text style={styles.subTitleText}>Driving License</Text>
                            <View style={styles.docRow}>
                                <View style={styles.docItem}>
                                    <Text style={styles.labelSmall}>Front Side</Text>
                                    {isEditing ? (
                                        <TouchableOpacity onPress={() => requestImageSelection(setLicenseFront, 'license')} style={styles.docTouch}>
                                            {licenseFront ? <Image source={{ uri: licenseFront.path }} style={styles.docImage} /> : carData.driver_license_front ? <Image source={{ uri: (carData.driver_license_front.startsWith('http')) ? carData.driver_license_front : `${IMG_URL}${carData.driver_license_front}` }} style={[styles.docImage, { opacity: 0.8 }]} /> : <View style={styles.placeholderDoc}><Icon name="camera-plus" size={24} color="#999" /></View>}
                                            <View style={styles.overlayIcon}><Icon name="pencil" size={14} color="#fff" /></View>
                                        </TouchableOpacity>
                                    ) : (
                                        carData.driver_license_front ? <Image source={{ uri: (carData.driver_license_front.startsWith('http')) ? carData.driver_license_front : `${IMG_URL}${carData.driver_license_front}` }} style={styles.docImageView} /> : <View style={styles.compactNoDoc}><Icon name="file-hidden" size={20} color="#999" /><Text style={styles.compactNoDocText}>N/A</Text></View>
                                    )}
                                </View>

                                <View style={styles.docItem}>
                                    <Text style={styles.labelSmall}>Back Side</Text>
                                    {isEditing ? (
                                        <TouchableOpacity onPress={() => requestImageSelection(setLicenseBack, 'license')} style={styles.docTouch}>
                                            {licenseBack ? <Image source={{ uri: licenseBack.path }} style={styles.docImage} /> : carData.driver_license_back ? <Image source={{ uri: (carData.driver_license_back.startsWith('http')) ? carData.driver_license_back : `${IMG_URL}${carData.driver_license_back}` }} style={[styles.docImage, { opacity: 0.8 }]} /> : <View style={styles.placeholderDoc}><Icon name="camera-plus" size={24} color="#999" /></View>}
                                            <View style={styles.overlayIcon}><Icon name="pencil" size={14} color="#fff" /></View>
                                        </TouchableOpacity>
                                    ) : (
                                        carData.driver_license_back ? <Image source={{ uri: (carData.driver_license_back.startsWith('http')) ? carData.driver_license_back : `${IMG_URL}${carData.driver_license_back}` }} style={styles.docImageView} /> : <View style={styles.compactNoDoc}><Icon name="file-hidden" size={20} color="#999" /><Text style={styles.compactNoDocText}>N/A</Text></View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.dividerLight} />

                            {/* RC Images */}
                            <Text style={styles.subTitleText}>RC Certificate</Text>
                            <View style={styles.docRow}>
                                <View style={styles.docItem}>
                                    <Text style={styles.labelSmall}>Front Side</Text>
                                    {isEditing ? (
                                        <TouchableOpacity onPress={() => requestImageSelection(setRcFront, 'rc')} style={styles.docTouch}>
                                            {rcFront ? <Image source={{ uri: rcFront.path }} style={styles.docImage} /> : carData.rc_front_image ? <Image source={{ uri: (carData.rc_front_image.startsWith('http')) ? carData.rc_front_image : `${IMG_URL}${carData.rc_front_image}` }} style={[styles.docImage, { opacity: 0.8 }]} /> : <View style={styles.placeholderDoc}><Icon name="camera-plus" size={24} color="#999" /></View>}
                                            <View style={styles.overlayIcon}><Icon name="pencil" size={14} color="#fff" /></View>
                                        </TouchableOpacity>
                                    ) : (
                                        carData.rc_front_image ? <Image source={{ uri: (carData.rc_front_image.startsWith('http')) ? carData.rc_front_image : `${IMG_URL}${carData.rc_front_image}` }} style={styles.docImageView} /> : <View style={styles.compactNoDoc}><Icon name="file-hidden" size={20} color="#999" /><Text style={styles.compactNoDocText}>N/A</Text></View>
                                    )}
                                </View>

                                <View style={styles.docItem}>
                                    <Text style={styles.labelSmall}>Back Side</Text>
                                    {isEditing ? (
                                        <TouchableOpacity onPress={() => requestImageSelection(setRcBack, 'rc')} style={styles.docTouch}>
                                            {rcBack ? <Image source={{ uri: rcBack.path }} style={styles.docImage} /> : carData.rc_back_image ? <Image source={{ uri: (carData.rc_back_image.startsWith('http')) ? carData.rc_back_image : `${IMG_URL}${carData.rc_back_image}` }} style={[styles.docImage, { opacity: 0.8 }]} /> : <View style={styles.placeholderDoc}><Icon name="camera-plus" size={24} color="#999" /></View>}
                                            <View style={styles.overlayIcon}><Icon name="pencil" size={14} color="#fff" /></View>
                                        </TouchableOpacity>
                                    ) : (
                                        carData.rc_back_image ? <Image source={{ uri: (carData.rc_back_image.startsWith('http')) ? carData.rc_back_image : `${IMG_URL}${carData.rc_back_image}` }} style={styles.docImageView} /> : <View style={styles.compactNoDoc}><Icon name="file-hidden" size={20} color="#999" /><Text style={styles.compactNoDocText}>N/A</Text></View>
                                    )}
                                </View>
                            </View>

                        </View>


                        {/* Action Controls */}
                        {isEditing ? (
                            <View style={styles.actionButtons}>
                                <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelModernButton}>
                                    <Text style={styles.cancelModernText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleUpdate} style={styles.saveModernButton} disabled={submitting}>
                                    <Text style={styles.saveModernText}>{submitting ? 'Saving...' : 'Save Changes'}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={handleDelete} style={styles.deleteModernButton}>
                                <Icon name="delete-outline" size={22} color="#D32F2F" />
                                <Text style={styles.deleteModernText}>Remove Vehicle</Text>
                            </TouchableOpacity>
                        )}

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ShowCarDetails;

const styles = StyleSheet.create({
    safe: {
        flex: 1, backgroundColor: '#fcfcfc',
    },
    headerView: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#248907',
        paddingHorizontal: 20,
        paddingBottom: 18,
    },
    headerText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },
    iconCircle: {
        padding: 5,
    },
    iconCircleEdit: {
        padding: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center'
    },
    imageContainer: {
        width: '100%', height: 260, position: 'relative',
    },
    carImageCover: {
        width: '100%', height: '100%', resizeMode: 'cover', backgroundColor: '#e0e0e0',
    },
    imageGradientOverlay: {
        position: 'absolute', bottom: 0, width: '100%', height: 80, backgroundColor: 'rgba(0,0,0,0)', // Can use gradient library if present
    },
    editBadgeCentral: {
        position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -45 }, { translateY: -30 }], alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 12
    },
    mainContentWrapper: {
        paddingHorizontal: 16, marginTop: -25, zIndex: 10
    },
    statusBannerModern: {
        flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 15,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
    },
    statusIconBox: {
        width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center'
    },
    statusTextModern: {
        fontWeight: 'bold', fontSize: 17, marginTop: 2
    },
    infoCard: {
        backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 15,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#f0f0f0'
    },
    cardHeaderArea: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
    },
    cardHeaderText: {
        fontSize: 18, fontWeight: '700', color: '#111', marginLeft: 10
    },
    detailsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'
    },
    fieldBlock: {
        width: '48%', marginBottom: 18,
    },
    fieldBlockFull: {
        width: '100%',
    },
    labelModern: {
        fontSize: 13, color: '#888', fontWeight: '500', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5
    },
    valueModern: {
        fontSize: 16, color: '#222', fontWeight: '600',
    },
    inputModern: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, color: '#000', backgroundColor: '#fafafa', height: 48
    },
    inputModernFull: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, color: '#000', backgroundColor: '#fafafa', fontWeight: '600', textTransform: 'uppercase'
    },
    plateTag: {
        backgroundColor: '#FFCC00', alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#000'
    },
    plateTagText: {
        fontSize: 18, fontWeight: 'bold', color: '#000', letterSpacing: 1
    },
    divider: {
        height: 1, backgroundColor: '#f0f0f0', marginVertical: 18
    },
    dividerLight: {
        height: 1, backgroundColor: '#f5f5f5', marginVertical: 20
    },
    subTitleText: {
        fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 15
    },
    docRow: {
        flexDirection: 'row', justifyContent: 'space-between'
    },
    docItem: {
        width: '48%',
    },
    labelSmall: {
        fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '500'
    },
    docTouch: {
        width: '100%', height: 75, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#eee'
    },
    docImage: {
        width: '100%', height: '100%', resizeMode: 'cover', borderRadius: 10
    },
    docImageView: {
        width: '100%', height: 65, resizeMode: 'cover', borderRadius: 8, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#eaeaea'
    },
    placeholderDoc: {
        width: '100%', height: 75, backgroundColor: '#f8f8f8', borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center'
    },
    compactNoDoc: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#eee'
    },
    compactNoDocText: {
        color: '#888', fontWeight: '600', fontSize: 13, marginLeft: 6
    },
    overlayIcon: {
        position: 'absolute', bottom: 5, right: 5, backgroundColor: '#248907', padding: 5, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, elevation: 4
    },
    actionButtons: {
        flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 20
    },
    cancelModernButton: {
        flex: 1, backgroundColor: '#f5f5f5', padding: 16, borderRadius: 12, marginRight: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd'
    },
    cancelModernText: {
        color: '#444', fontSize: 16, fontWeight: '700',
    },
    saveModernButton: {
        flex: 1, backgroundColor: '#248907', padding: 16, borderRadius: 12, marginLeft: 10, alignItems: 'center', shadowColor: '#248907', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5
    },
    saveModernText: {
        color: '#fff', fontSize: 16, fontWeight: '700',
    },
    deleteModernButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5F5', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FFCDD2', marginTop: 10, marginBottom: 20
    },
    deleteModernText: {
        color: '#D32F2F', fontSize: 16, fontWeight: '700', marginLeft: 10,
    }
});
