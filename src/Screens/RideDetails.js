import { formatDateTime } from '../utils/DateUtils';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
    Switch,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, GOOGLE_MAPS_API_KEY } from '../config/config';
import DatePicker from 'react-native-date-picker';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';

const RideDetails = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const route = useRoute();
    console.log('RideDetails Params:', route.params);
    const { rideId } = route.params || {};

    useEffect(() => {
        if (!rideId) {
            Alert.alert('Error', 'Invalid Ride ID');
            navigation.goBack();
        }
    }, [rideId]);

    const [loading, setLoading] = useState(true);
    const [rideData, setRideData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isAddingStop, setIsAddingStop] = useState(false);

    // Edit Form State
    const [pickup, setPickup] = useState('');
    const [drop, setDrop] = useState('');
    const [dateTime, setDateTime] = useState(''); // String format
    const [date, setDate] = useState(new Date()); // Date obj
    const [open, setOpen] = useState(false); // Picker visibility

    const [seats, setSeats] = useState('');
    const [price, setPrice] = useState('');
    const [status, setStatus] = useState('active');
    const [stopPoints, setStopPoints] = useState([]); // [{city_name: '', price_from_pickup: ''}]
    const [currentStopQuery, setCurrentStopQuery] = useState('');
    const [stopSuggestions, setStopSuggestions] = useState([]);



    // Autocomplete State
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [dropSuggestions, setDropSuggestions] = useState([]);

    const fetchSuggestions = async (query, type) => {
        if (query.length < 3) {
            if (type === 'pickup') setPickupSuggestions([]);
            if (type === 'drop') setDropSuggestions([]);
            return;
        }

        try {
            const response = await axios.get(`https://maps.googleapis.com/maps/api/place/autocomplete/json`, {
                params: {
                    input: query,
                    key: GOOGLE_MAPS_API_KEY,
                    components: 'country:in'
                }
            });

            if (type === 'pickup') {
                setPickupSuggestions(response.data.predictions || []);
            } else if (type === 'drop') {
                setDropSuggestions(response.data.predictions || []);
            } else if (type === 'stop') {
                setStopSuggestions(response.data.predictions || []);
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('user_data');
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }

            console.warn("Autocomplete error:", error);
        }
    };

    const handleSelectSuggestion = (item, type) => {
        const address = item.description;
        if (type === 'pickup') {
            setPickup(address);
            setPickupSuggestions([]);
        } else {
            setDrop(address);
            setDropSuggestions([]);
        }
    };

    // Car Selection
    const [selectedCarId, setSelectedCarId] = useState(null);
    const [userCars, setUserCars] = useState([]);
    const [showCarDropdown, setShowCarDropdown] = useState(false);

    // const [carMake, setCarMake] = useState(''); // Removed in favor of dropdown
    const [luggage, setLuggage] = useState(false);

    useEffect(() => {
        fetchRideDetails();
        fetchUserCars();
    }, [rideId]);

    const fetchUserCars = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${BASE_URL}cars`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.status === true || response.status === 200) {
                setUserCars(response.data.data || []);
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('user_data');
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }

            console.error('Fetch Cars Error:', error);
        }
    };

    const fetchRideDetails = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${BASE_URL}rides/${rideId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Fetch Ride Response:', response.data);

            if (response.data.status === true || response.status === 200) {
                const data = response.data.data;
                setRideData(data);
                // Initialize form
                setPickup(data.pickup_point);
                setDrop(data.drop_point);
                setDateTime(data.date_time);
                setStatus(data.status || 'active');

                // Initialize Date Object for Picker
                if (data.date_time) {
                    // Use the raw string and ensure no double offset by checking string format
                    const rawDate = new Date(data.date_time.replace(' ', 'T'));
                    setDate(rawDate);
                }

                setSeats(data.total_seats ? String(data.total_seats) : '');
                setPrice(data.price_per_seat ? String(data.price_per_seat) : '');

                // Handle car details safely
                if (data.car) {
                    setSelectedCarId(data.car.id);
                } else if (data.car_id) {
                    setSelectedCarId(data.car_id);
                }

                setStopPoints(data.stop_points || []);
                setLuggage(data.luggage_allowed === 1 || data.luggage_allowed === true);
            } else {
                Alert.alert('Error', 'Failed to fetch ride details.');
                navigation.goBack();
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('user_data');
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }

            console.error('Fetch Ride Error:', error);
            Alert.alert('Error', 'An error occurred while fetching ride details.');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        if (date) {
            setDateTime(formatDateTime(date));
        }
    }, [date]);

    // Helper to format date for API (YYYY-MM-DD HH:MM:SS) - Ensuring Local Time
    const formatDateForApi = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Ride",
            "Are you sure you want to cancel and delete this ride?",
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
            const response = await axios.delete(`${BASE_URL}rides/${rideId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('Delete Ride Response:', response.data);
            if (response.data.status === true || response.status === 200) {
                Alert.alert('Success', 'Ride deleted successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', response.data.message || 'Failed to delete ride.');
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('user_data');
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }

            console.error('Delete Ride Error:', error);
            Alert.alert('Error', 'An error occurred while deleting the ride.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!pickup || !drop || !seats || !price || !selectedCarId) {
            Alert.alert('Error', 'Please fill all required fields and select a car.');
            return;
        }

        setSubmitting(true);
        const payload = {
            pickup_point: pickup,
            drop_point: drop,
            date_time: formatDateForApi(date),
            total_seats: parseInt(seats),
            price_per_seat: parseFloat(price),
            car_make: userCars.find(c => c.id === selectedCarId)?.car_make || (rideData.car ? rideData.car.car_make : ''),
            luggage_allowed: luggage ? 1 : 0,
            status: status,
            stop_points: stopPoints.map(sp => ({
                city_name: sp.city_name,
                price: sp.price_from_pickup || sp.price
            }))
        };

        console.log('Update Payload (POST):', payload);

        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.post(`${BASE_URL}rides/${rideId}`, payload, {
                headers: {
                    'Content-Type': 'application/json', // Ensuring JSON content type
                    'Authorization': `Bearer ${token}`
                },
            });

            console.log('Update Ride Response:', response.data);

            if (response.data.status === true || response.status === 200) {
                Alert.alert('Success', 'Ride updated successfully');
                setIsEditing(false);
                setIsAddingStop(false); // Reset add stop state
                fetchRideDetails();
            } else {
                Alert.alert('Error', response.data.message || 'Failed to update ride.');
            }

        } catch (error) {
            if (error.response && error.response.status === 401) {
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('user_data');
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }

            console.error('Update Ride Error:', error);
            Alert.alert('Error', 'An error occurred while updating the ride.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#248907" />
            </View>
        );
    }

    if (!rideData) return null;

    return (
        <SafeAreaView style={styles.safe} edges={['right', 'left', 'bottom']}>
            <StatusBar barStyle="dark-content" translucent={false} />

            {/* Header */}
            <View style={[styles.headerView, { paddingTop: insets.top + verticalScale(10) }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerText}>{isEditing ? 'Edit Ride' : 'Ride Details'}</Text>
                {!isEditing && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            paddingHorizontal: 8, borderRadius: 4, marginRight: 10
                        }}>
                            <Text style={{
                                color: '#fff',
                                fontWeight: '700', fontSize: 12
                            }}>
                                {rideData.status ? rideData.status.toUpperCase() : 'ACTIVE'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setIsEditing(true)}>
                            <Icon name="pencil" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">

                    {/* Route Header Card */}
                    <View style={styles.routeCard}>
                        <View style={styles.routeRow}>
                            <Icon name="map-marker" size={20} color="#248907" />
                            <Text style={styles.routePoint}>{rideData.pickup_point}</Text>
                        </View>
                        <View style={styles.routeConnector}>
                            <View style={styles.dottedLine} />
                            <Icon name="arrow-down" size={16} color="#aaa" />
                        </View>
                        <View style={styles.routeRow}>
                            <Icon name="map-marker-check" size={20} color="#248907" />
                            <Text style={styles.routePoint}>{rideData.drop_point}</Text>
                        </View>
                    </View>

                    {/* ── Stop Points List (View Mode) ── */}
                    {!isEditing && rideData.stop_points && rideData.stop_points.length > 0 && (
                        <View style={styles.infoCard}>
                            <Text style={styles.cardTitle}>Intermediate Stops</Text>
                            {rideData.stop_points.map((stop, idx) => (
                                <View key={stop.id || idx} style={{ marginBottom: 10 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                                            <Icon name="record-circle-outline" size={18} color="#248907" />
                                            <Text style={{ marginLeft: 10, fontSize: 14, color: '#333', fontWeight: '500', flex: 1 }} numberOfLines={2}>
                                                {stop.city_name}
                                            </Text>
                                        </View>
                                        <Text style={{ fontWeight: '700', color: '#248907', fontSize: 15 }}>₹{stop.price_from_pickup}</Text>
                                    </View>
                                    {idx < rideData.stop_points.length - 1 && <View style={[styles.divider, { marginVertical: 8, height: 0.5 }]} />}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Date & Price Card */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Icon name="calendar-clock" size={22} color="#555" />
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.infoLabel}>Date & Time</Text>
                                    <Text style={styles.infoValue}>{formatDateTime(rideData.date_time)}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.infoItem}>
                                <Icon name="cash" size={22} color="#555" />
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.infoLabel}>Price per Seat</Text>
                                    <Text style={styles.infoValue}>₹{rideData.price_per_seat}</Text>
                                </View>
                            </View>
                            <View style={styles.infoItem}>
                                <Icon name="car-seat" size={22} color="#555" />
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.infoLabel}>Seats</Text>
                                    <Text style={styles.infoValue}>{rideData.total_seats}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Car Details Card */}
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Car Details</Text>
                        <View style={styles.carInfoRow}>
                            <Icon name="car" size={24} color="#248907" />
                            <View style={{ marginLeft: 15 }}>
                                {rideData.car ? (
                                    <>
                                        <Text style={styles.carName}>{rideData.car.car_make} {rideData.car.car_model}</Text>
                                        <Text style={styles.carDetailText}>{rideData.car.car_color} • {rideData.car.car_year}</Text>
                                        <View style={styles.plateBox}>
                                            <Text style={styles.plateText}>{rideData.car.licence_plate}</Text>
                                        </View>
                                    </>
                                ) : (
                                    <Text style={styles.carName}>{rideData.car_make || 'No Car Details'}</Text>
                                )}
                            </View>
                        </View>

                        {rideData.luggage_allowed && (
                            <View style={styles.luggageRow}>
                                <Icon name="bag-suitcase" size={20} color="#248907" />
                                <Text style={{ marginLeft: 10, fontSize: 14, color: '#333' }}>Luggage Allowed</Text>
                            </View>
                        )}
                    </View>

                    {/* Edit Form - Only shown when isEditing is true */}
                    {isEditing && (
                        <View style={styles.editContainer}>
                            <Text style={styles.editTitle}>Edit Details</Text>

                            <View style={[styles.fieldContainer, { zIndex: 20 }]}>
                                <Text style={styles.label}>Pickup Point</Text>
                                <TextInput
                                    style={styles.input}
                                    value={pickup}
                                    onChangeText={(text) => {
                                        setPickup(text);
                                        fetchSuggestions(text, 'pickup');
                                    }}
                                />
                                {pickupSuggestions.length > 0 && (
                                    <View style={styles.suggestionsContainer}>
                                        <ScrollView keyboardShouldPersistTaps="always">
                                            {pickupSuggestions.map((item, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.suggestionItem}
                                                    onPress={() => handleSelectSuggestion(item, 'pickup')}
                                                >
                                                    <Icon name="map-marker-outline" size={16} color="#555" style={{ marginRight: 8 }} />
                                                    <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            <View style={[styles.fieldContainer, { zIndex: 19 }]}>
                                <Text style={styles.label}>Drop Point</Text>
                                <TextInput
                                    style={styles.input}
                                    value={drop}
                                    onChangeText={(text) => {
                                        setDrop(text);
                                        fetchSuggestions(text, 'drop');
                                    }}
                                />
                                {dropSuggestions.length > 0 && (
                                    <View style={styles.suggestionsContainer}>
                                        <ScrollView keyboardShouldPersistTaps="always">
                                            {dropSuggestions.map((item, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.suggestionItem}
                                                    onPress={() => handleSelectSuggestion(item, 'drop')}
                                                >
                                                    <Icon name="map-marker-outline" size={16} color="#555" style={{ marginRight: 8 }} />
                                                    <Text style={styles.suggestionText} numberOfLines={2}>{item.description}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Edit Stop Points */}
                            <View style={styles.stopSectionContainer}>
                                <View style={styles.stopSectionHeader}>
                                    <Text style={styles.sectionLabel}>Route Stops</Text>
                                    {!isAddingStop && (
                                        <TouchableOpacity
                                            style={styles.addStopBtn}
                                            onPress={() => setIsAddingStop(true)}
                                        >
                                            <Icon name="plus-circle" size={18} color="#248907" />
                                            <Text style={styles.addStopBtnText}>Add City</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {stopPoints.map((stop, index) => (
                                    <View key={index} style={styles.stopCard}>
                                        <View style={styles.stopCardLeft}>
                                            <Icon name="record-circle-outline" size={20} color="#248907" />
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={styles.stopCityName} numberOfLines={1}>{stop.city_name}</Text>
                                                <TextInput
                                                    placeholder="Price from pickup (₹)"
                                                    placeholderTextColor="#999"
                                                    keyboardType="numeric"
                                                    style={styles.stopPriceInput}
                                                    value={String(stop.price_from_pickup || stop.price || '')}
                                                    onChangeText={(p) => {
                                                        const newStops = [...stopPoints];
                                                        newStops[index].price_from_pickup = p;
                                                        setStopPoints(newStops);
                                                    }}
                                                />
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => {
                                            const newStops = stopPoints.filter((_, i) => i !== index);
                                            setStopPoints(newStops);
                                        }}>
                                            <Icon name="close-circle" size={24} color="#ff4d4d" />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {isAddingStop && (
                                    <View style={styles.stopInputWrapper}>
                                        <View style={styles.stopInputHeader}>
                                            <Icon name="magnify" size={20} color="#555" />
                                            <TextInput
                                                autoFocus
                                                placeholder="Search city..."
                                                placeholderTextColor="#777"
                                                style={styles.stopInlineInput}
                                                value={currentStopQuery}
                                                onChangeText={(text) => {
                                                    setCurrentStopQuery(text);
                                                    fetchSuggestions(text, 'stop');
                                                }}
                                            />
                                            <TouchableOpacity onPress={() => {
                                                setIsAddingStop(false);
                                                setCurrentStopQuery('');
                                                setStopSuggestions([]);
                                            }}>
                                                <Icon name="close" size={20} color="#555" />
                                            </TouchableOpacity>
                                        </View>

                                        {stopSuggestions.length > 0 && (
                                            <View style={styles.stopSuggestionsBox}>
                                                <ScrollView keyboardShouldPersistTaps="always">
                                                    {stopSuggestions.map((item, index) => (
                                                        <TouchableOpacity
                                                            key={index}
                                                            style={styles.suggestionRow}
                                                            onPress={() => {
                                                                setStopPoints([...stopPoints, { city_name: item.description, price_from_pickup: '' }]);
                                                                setCurrentStopQuery('');
                                                                setStopSuggestions([]);
                                                                setIsAddingStop(false);
                                                            }}
                                                        >
                                                            <Icon name="map-marker-plus" size={18} color="#248907" />
                                                            <Text style={styles.suggestionText} numberOfLines={1}>{item.description}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Date & Time</Text>
                                <TouchableOpacity
                                    style={[styles.input, { justifyContent: 'center' }]}
                                    onPress={() => setOpen(true)}
                                >
                                    <Text style={{ color: '#000' }}>
                                        {formatDateTime(date)}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.fieldContainer, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.label}>Total Seats</Text>
                                    <TextInput style={styles.input} value={seats} onChangeText={setSeats} keyboardType="numeric" />
                                </View>
                                <View style={[styles.fieldContainer, { flex: 1, marginLeft: 10 }]}>
                                    <Text style={styles.label}>Price/Seat</Text>
                                    <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
                                </View>
                            </View>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Select Car</Text>
                                <TouchableOpacity
                                    style={styles.dropdownButton}
                                    onPress={() => setShowCarDropdown(!showCarDropdown)}
                                >
                                    <Text style={styles.dropdownButtonText}>
                                        {selectedCarId
                                            ? (() => {
                                                const car = userCars.find(c => c.id === selectedCarId);
                                                return car ? `${car.car_make} ${car.car_model}` : "Select Your Car";
                                            })()
                                            : "Select Your Car"}
                                    </Text>
                                    <Icon name={showCarDropdown ? "chevron-up" : "chevron-down"} size={24} color="#555" />
                                </TouchableOpacity>

                                {showCarDropdown && (
                                    <View style={styles.dropdownList}>
                                        {userCars.length > 0 ? (
                                            userCars.map((car) => (
                                                <TouchableOpacity
                                                    key={car.id}
                                                    style={styles.dropdownItem}
                                                    onPress={() => {
                                                        setSelectedCarId(car.id);
                                                        setShowCarDropdown(false);
                                                    }}
                                                >
                                                    <Icon name="car" size={20} color="#248907" style={{ marginRight: 10 }} />
                                                    <Text style={styles.dropdownItemText}>
                                                        {car.car_make} {car.car_model} ({car.licence_plate})
                                                    </Text>
                                                    {selectedCarId === car.id && (
                                                        <Icon name="check" size={20} color="#248907" style={{ marginLeft: 'auto' }} />
                                                    )}
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <TouchableOpacity onPress={() => navigation.navigate('AddYourCar')} style={styles.dropdownItem}>
                                                <Text style={[styles.dropdownItemText, { color: '#248907' }]}>+ Add a New Car</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>

                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Ride Status</Text>
                                <View style={{ flexDirection: 'row' }}>
                                    <TouchableOpacity
                                        style={[styles.statusButton, status === 'active' && styles.activeStatus]}
                                        onPress={() => setStatus('active')}
                                    >
                                        <Text style={[styles.statusText, status === 'active' && { color: '#fff' }]}>Active</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.statusButton, status === 'inactive' && styles.inactiveStatus]}
                                        onPress={() => setStatus('inactive')}
                                    >
                                        <Text style={[styles.statusText, status === 'inactive' && { color: '#fff' }]}>Inactive</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <DatePicker
                                modal
                                open={open}
                                date={date}
                                minimumDate={new Date()}
                                onConfirm={(selectedDate) => {
                                    if (selectedDate < new Date()) {
                                        Alert.alert('Invalid Date', 'You cannot select a past date or time.');
                                        setOpen(false);
                                        return;
                                    }
                                    setOpen(false)
                                    setDate(selectedDate)
                                    setDateTime(formatDateForApi(selectedDate))
                                }}
                                onCancel={() => {
                                    setOpen(false)
                                }}
                            />
                            <View style={styles.actionButtons}>
                                <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleUpdate} style={styles.saveButton} disabled={submitting}>
                                    <Text style={styles.saveText}>{submitting ? 'Saving...' : 'Save Changes'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {!isEditing && (
                        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                            <Icon name="delete" size={20} color="#fff" />
                            <Text style={styles.deleteText}>Cancel Ride</Text>
                        </TouchableOpacity>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default RideDetails;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerView: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: verticalScale(15),
        marginBottom: verticalScale(10),
        paddingHorizontal: scale(20),
        backgroundColor: '#248907',
        // Removed extra margin to fix white gap
    },
    headerText: {
        fontSize: responsiveFontSize(20),
        fontWeight: '600',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
        marginRight: scale(24),
    },
    // New Styles
    routeCard: {
        backgroundColor: '#fff',
        borderRadius: moderateScale(12),
        padding: moderateScale(20),
        marginHorizontal: 0,
        marginBottom: verticalScale(15),
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routePoint: {
        fontSize: responsiveFontSize(18),
        fontWeight: '700',
        color: '#333',
        marginLeft: scale(10),
    },
    routeConnector: {
        marginLeft: scale(9),
        borderLeftWidth: 2,
        borderLeftColor: '#ddd',
        height: verticalScale(30),
        marginVertical: verticalScale(4),
        alignItems: 'center',
        justifyContent: 'center'
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: moderateScale(12),
        padding: moderateScale(20),
        marginBottom: verticalScale(15),
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoLabel: {
        fontSize: responsiveFontSize(12),
        color: '#777',
        marginBottom: verticalScale(2)
    },
    infoValue: {
        fontSize: responsiveFontSize(16),
        fontWeight: '600',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: verticalScale(15),
    },
    cardTitle: {
        fontSize: responsiveFontSize(16),
        fontWeight: '700',
        color: '#000',
        marginBottom: verticalScale(15),
    },
    carInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    carName: {
        fontSize: responsiveFontSize(18),
        fontWeight: '700',
        color: '#333',
    },
    carDetailText: {
        fontSize: responsiveFontSize(14),
        color: '#555',
        marginTop: verticalScale(2)
    },
    plateBox: {
        backgroundColor: '#ffeb3b', // Yellow plate style
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(2),
        borderRadius: moderateScale(4),
        marginTop: verticalScale(5),
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#fbc02d'
    },
    plateText: {
        fontSize: responsiveFontSize(12),
        fontWeight: '700',
        color: '#000'
    },
    luggageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(15),
        backgroundColor: '#f9f9f9',
        padding: moderateScale(10),
        borderRadius: moderateScale(8)
    },
    editContainer: {
        backgroundColor: '#fff',
        padding: moderateScale(15),
        borderRadius: moderateScale(12),
        marginBottom: verticalScale(20),
        borderWidth: 1,
        borderColor: '#eee'
    },
    editTitle: {
        fontSize: responsiveFontSize(18),
        fontWeight: '700',
        marginBottom: verticalScale(15),
        color: '#248907'
    },
    detailsContainer: {
        marginBottom: verticalScale(20),
    },
    fieldContainer: {
        marginBottom: verticalScale(15),
    },
    row: {
        flexDirection: 'row',
    },
    label: {
        fontSize: responsiveFontSize(14),
        color: '#777',
        marginBottom: verticalScale(5),
    },
    value: {
        fontSize: responsiveFontSize(18),
        color: '#000',
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: moderateScale(8),
        padding: moderateScale(10),
        fontSize: responsiveFontSize(16),
        color: '#000',
    },
    // Stop Point Edit Styles (Legacy - Cleaned up in favor of stopCard)
    stopCityNameLegacy: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333'
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#d32f2f',
        padding: moderateScale(15),
        borderRadius: moderateScale(10),
        marginTop: verticalScale(10),
    },
    deleteText: {
        color: '#fff',
        fontSize: responsiveFontSize(16),
        fontWeight: '600',
        marginLeft: scale(8),
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: verticalScale(10),
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#eee',
        padding: moderateScale(15),
        borderRadius: moderateScale(10),
        marginRight: scale(10),
        alignItems: 'center',
    },
    cancelText: {
        color: '#333',
        fontSize: responsiveFontSize(16),
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#248907',
        padding: moderateScale(15),
        borderRadius: moderateScale(10),
        marginLeft: scale(10),
        alignItems: 'center',
    },
    saveText: {
        color: '#fff',
        fontSize: responsiveFontSize(16),
        fontWeight: '600',
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        padding: moderateScale(12),
        borderRadius: moderateScale(8),
        marginBottom: verticalScale(10),
    },
    dropdownButtonText: {
        fontSize: responsiveFontSize(16),
        color: '#333',
    },
    dropdownList: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: moderateScale(8),
        marginTop: verticalScale(-5),
        marginBottom: verticalScale(15),
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemText: {
        fontSize: responsiveFontSize(14),
        color: '#333',
        fontWeight: '500',
    },
    statusButton: {
        flex: 1,
        padding: moderateScale(12),
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: moderateScale(8),
        alignItems: 'center',
        marginHorizontal: scale(5),
    },
    activeStatus: {
        backgroundColor: '#248907',
        borderColor: '#248907',
    },
    inactiveStatus: {
        backgroundColor: '#d32f2f',
        borderColor: '#d32f2f',
    },
    statusText: {
        fontSize: responsiveFontSize(14),
        fontWeight: '600',
        color: '#333',
    },
    suggestionsContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: moderateScale(8),
        marginTop: verticalScale(-5),
        marginBottom: verticalScale(10),
        maxHeight: verticalScale(200),
        elevation: 5,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    suggestionText: {
        fontSize: responsiveFontSize(14),
        color: '#333',
    },
    // ── Better Stop Points Styles ──
    stopSectionContainer: {
        marginBottom: verticalScale(20),
        backgroundColor: '#fff',
    },
    stopSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionLabel: {
        fontSize: responsiveFontSize(14),
        color: '#333',
        fontWeight: '700',
    },
    addStopBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e9f5e6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#248907',
    },
    addStopBtnText: {
        fontSize: 13,
        color: '#248907',
        fontWeight: '700',
        marginLeft: 4,
    },
    stopCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fdf6',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#d4efcc',
        elevation: 1,
        shadowColor: '#248907',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    stopCardLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    stopCityName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
    },
    stopPriceInput: {
        fontSize: 13,
        color: '#248907',
        padding: 0,
        marginTop: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#248907',
        minWidth: 120,
        fontWeight: '600',
    },
    stopInputWrapper: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#248907',
        padding: 5,
        marginBottom: 10,
    },
    stopInputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    stopInlineInput: {
        flex: 1,
        height: 40,
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
    stopSuggestionsBox: {
        maxHeight: 200,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        marginTop: 5,
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
});

