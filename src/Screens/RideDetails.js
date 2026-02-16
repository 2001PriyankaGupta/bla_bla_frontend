import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
    Switch
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config/config';
import DatePicker from 'react-native-date-picker';

const RideDetails = () => {
    const navigation = useNavigation();
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

    // Edit Form State
    const [pickup, setPickup] = useState('');
    const [drop, setDrop] = useState('');
    const [dateTime, setDateTime] = useState(''); // String format
    const [date, setDate] = useState(new Date()); // Date obj
    const [open, setOpen] = useState(false); // Picker visibility

    const [seats, setSeats] = useState('');
    const [price, setPrice] = useState('');
    const [status, setStatus] = useState('active');



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
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                headers: {
                    'User-Agent': 'TravelApp/1.0',
                    'Accept-Language': 'en'
                },
                params: {
                    q: query,
                    format: 'json',
                    limit: 5,
                    addressdetails: 1,
                    countrycodes: 'in'
                }
            });

            if (type === 'pickup') {
                setPickupSuggestions(response.data);
            } else {
                setDropSuggestions(response.data);
            }
        } catch (error) {
            console.warn("Autocomplete error:", error);
        }
    };

    const handleSelectSuggestion = (item, type) => {
        const address = item.display_name;
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
                    setDate(new Date(data.date_time));
                }

                setSeats(data.total_seats ? String(data.total_seats) : '');
                setPrice(data.price_per_seat ? String(data.price_per_seat) : '');

                // Handle car details safely
                if (data.car) {
                    setSelectedCarId(data.car.id);
                } else if (data.car_id) {
                    setSelectedCarId(data.car_id);
                }

                setLuggage(data.luggage_allowed === 1 || data.luggage_allowed === true);
            } else {
                Alert.alert('Error', 'Failed to fetch ride details.');
                navigation.goBack();
            }
        } catch (error) {
            console.error('Fetch Ride Error:', error);
            Alert.alert('Error', 'An error occurred while fetching ride details.');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: 'numeric', minute: 'numeric', hour12: true
        });
    };

    // Helper to format date for API (YYYY-MM-DD HH:MM:SS)
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
            car_id: selectedCarId,
            car_make: userCars.find(c => c.id === selectedCarId)?.car_make || '',
            luggage_allowed: luggage,
            status: status
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
                fetchRideDetails();
            } else {
                Alert.alert('Error', response.data.message || 'Failed to update ride.');
            }

        } catch (error) {
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
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.headerView}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerText}>{isEditing ? 'Edit Ride' : 'Ride Details'}</Text>
                {!isEditing && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            backgroundColor: rideData.status === 'active' ? '#e8f5e9' : '#ffebee',
                            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 10
                        }}>
                            <Text style={{
                                color: rideData.status === 'active' ? '#248907' : '#d32f2f',
                                fontWeight: '700', fontSize: 12
                            }}>
                                {rideData.status ? rideData.status.toUpperCase() : 'ACTIVE'}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setIsEditing(true)}>
                            <Icon name="pencil" size={24} color="#248907" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

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
                                                <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
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
                                                <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
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
                                    {date.toLocaleString()}
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
                            onConfirm={(date) => {
                                setOpen(false)
                                setDate(date)
                                setDateTime(formatDateForApi(date))
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

        </SafeAreaView>
    );
};

export default RideDetails;

const styles = StyleSheet.create({
    safe: {
        flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 5 : 0,
    },
    headerView: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 15, marginBottom: 10,
    },
    headerText: {
        fontSize: 20, fontWeight: '600', color: '#000', flex: 1, textAlign: 'center', marginRight: 24,
    },
    // New Styles
    routeCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 0,
        marginBottom: 15,
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
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginLeft: 10,
    },
    routeConnector: {
        marginLeft: 9,
        borderLeftWidth: 2,
        borderLeftColor: '#ddd',
        height: 30,
        marginVertical: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
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
        fontSize: 12,
        color: '#777',
        marginBottom: 2
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 15,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 15,
    },
    carInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    carName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    carDetailText: {
        fontSize: 14,
        color: '#555',
        marginTop: 2
    },
    plateBox: {
        backgroundColor: '#ffeb3b', // Yellow plate style
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 5,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#fbc02d'
    },
    plateText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#000'
    },
    luggageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        backgroundColor: '#f9f9f9',
        padding: 10,
        borderRadius: 8
    },
    editContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#eee'
    },
    editTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 15,
        color: '#248907'
    },
    detailsContainer: {
        marginBottom: 20,
    },
    fieldContainer: {
        marginBottom: 15,
    },
    row: {
        flexDirection: 'row',
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
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    dropdownButtonText: {
        fontSize: 16,
        color: '#333',
    },
    dropdownList: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        marginTop: -5,
        marginBottom: 15,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    // Suggestion Styles
    suggestionsContainer: {
        position: 'absolute',
        top: 75, // Below label + input
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 10,
        zIndex: 1000,
        maxHeight: 150,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    suggestionText: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    // Status Styles
    statusButton: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 10
    },
    activeStatus: {
        backgroundColor: '#248907',
        borderColor: '#248907'
    },
    inactiveStatus: {
        backgroundColor: '#d32f2f',
        borderColor: '#d32f2f'
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#555'
    }
});
