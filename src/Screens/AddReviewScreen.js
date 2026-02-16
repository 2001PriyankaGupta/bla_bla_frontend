import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BASE_URL } from '../config/config';

const AddReviewScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();

    const { bookingId, targetRole, driverId, userId } = route.params || {};

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert("Error", "Please select a rating");
            return;
        }

        setSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('access_token');

            const payload = {
                booking_id: bookingId,
                type: targetRole,
                rating: rating,
                comment: comment
            };

            console.log("Submitting Review Payload:", payload);

            const response = await axios.post(`${BASE_URL}reviews/submit`, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log("Submit Response:", response.data);

            if (response.data.success) {
                Alert.alert("Success", "Review submitted successfully!", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert("Error", response.data.message || "Failed to submit review");
            }

        } catch (error) {
            console.error("Submit Review Error:", error.response?.data || error.message);
            const msg = error.response?.data?.message || "An error occurred";
            Alert.alert("Error", msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#1fa000" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rate Your Ride</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>How was your experience?</Text>
                <Text style={styles.subtitle}>Your feedback helps us improve.</Text>

                {/* Star Rating */}
                <View style={styles.starContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Icon
                                name={star <= rating ? "star" : "star-outline"}
                                size={40}
                                color="#FFD700"
                                style={{ marginHorizontal: 5 }}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Comment Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Write a comment (optional)..."
                        placeholderTextColor="#999"
                        multiline
                        maxLength={500}
                        value={comment}
                        onChangeText={setComment}
                    />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, { opacity: submitting ? 0.7 : 1 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>Submit Review</Text>
                    )}
                </TouchableOpacity>

            </View>
        </SafeAreaView>
    );
};

export default AddReviewScreen;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: 25
    },
    header: {
        backgroundColor: '#1fa000',
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    headerTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18
    },
    content: {
        padding: 20,
        alignItems: 'center',
        marginTop: 20
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        marginBottom: 5
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 30
    },
    starContainer: {
        flexDirection: 'row',
        marginBottom: 40
    },
    inputContainer: {
        width: '100%',
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        height: 120,
        padding: 15,
        marginBottom: 30
    },
    input: {
        fontSize: 16,
        color: '#333',
        height: '100%',
        textAlignVertical: 'top'
    },
    submitBtn: {
        backgroundColor: '#1fa000',
        width: '100%',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center'
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700'
    }
});
