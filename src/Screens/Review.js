import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL, IMG_URL } from '../config/config';

const Review = () => {
  const navigation = useNavigation();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const userDataStr = await AsyncStorage.getItem('user_data');
      let userType = 'passenger'; // Default

      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        userType = userData.user_type || 'passenger';
      }

      console.log("Fetching reviews for role:", userType);

      // Endpoint based on user role
      // If I am a driver, I want to see reviews ABOUT me (as a driver) -> my-driver-reviews
      // If I am a passenger, I want to see reviews ABOUT me (as a passenger) -> my-passenger-reviews
      const endpoint = userType === 'driver' ? 'my-driver-reviews' : 'my-passenger-reviews';

      const response = await axios.get(`${BASE_URL}reviews/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log(`Reviews Response:`, response.data);

      if (response.data.success) {
        setReviews(response.data.reviews.data || []);
        setStats(response.data.stats);
      } else {
        // Handle error or empty
        setReviews([]);
        setStats(null);
      }
    } catch (error) {
      console.error("Fetch Reviews Error:", error);
      // Alert.alert("Error", "Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  const getRatingSummary = () => {
    // If stats are available, use them. Otherwise default.
    if (!stats || !stats.rating_breakdown) return [
      { star: 5, percent: 0 },
      { star: 4, percent: 0 },
      { star: 3, percent: 0 },
      { star: 2, percent: 0 },
      { star: 1, percent: 0 },
    ];

    // Calculate percentages
    const breakdown = stats.rating_breakdown; // { "5_star": 10, ... }
    const total = stats.total_reviews || 1; // avoid divide by zero

    return [
      { star: 5, percent: Math.round(((breakdown['5_star'] || 0) / total) * 100) },
      { star: 4, percent: Math.round(((breakdown['4_star'] || 0) / total) * 100) },
      { star: 3, percent: Math.round(((breakdown['3_star'] || 0) / total) * 100) },
      { star: 2, percent: Math.round(((breakdown['2_star'] || 0) / total) * 100) },
      { star: 1, percent: Math.round(((breakdown['1_star'] || 0) / total) * 100) },
    ];
  };

  const ratingSummary = getRatingSummary();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1fa000" />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerText}>My Reviews</Text>

          <View style={{ width: 24 }} />
        </View>

        {/* Removed Segment Buttons */}

        {loading ? (
          <View style={{ padding: 50 }}>
            <ActivityIndicator size="large" color="#1fa000" />
          </View>
        ) : (
          <>
            {/* Rating Section */}
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingValue}>{stats?.average_rating || '0.0'}</Text>

              <View style={styles.starRow}>
                {/* Render stars based on average? Just static for now or calculate */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <Icon key={i} name={i < Math.round(stats?.average_rating || 0) ? "star" : "star-outline"} size={20} color="#1fa000" />
                ))}
              </View>

              <Text style={styles.reviewCount}>{stats?.total_reviews || 0} reviews</Text>

              {ratingSummary.map((item, i) => (
                <View key={i} style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>{item.star}</Text>

                  <View style={styles.ratingBarBackground}>
                    <View style={[styles.ratingBarFill, { width: `${item.percent}%` }]} />
                  </View>

                  <Text style={styles.ratingPercent}>{item.percent}%</Text>
                </View>
              ))}
            </View>

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: '#777' }}>No reviews yet.</Text>
              </View>
            ) : (
              reviews.map((item) => {
                // Determine who reviewed
                let reviewerObj = item.reviewer;

                if (item.type === 'driver') {
                  // If I was reviewed as a driver, the reviewer is the passenger
                  reviewerObj = item.passenger || item.reviewer;
                } else if (item.type === 'passenger') {
                  // If I was reviewed as a passenger, the reviewer is the driver
                  reviewerObj = item.driver || item.reviewer;
                }

                const reviewerName = reviewerObj?.name || 'Unknown User';
                let reviewerImage = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

                if (reviewerObj?.profile_picture) {
                  reviewerImage = reviewerObj.profile_picture.startsWith('http')
                    ? reviewerObj.profile_picture
                    : `${IMG_URL}${reviewerObj.profile_picture}`;
                }

                return (
                  <View style={styles.reviewCard} key={item.id}>
                    <View style={styles.reviewHeader}>
                      <Image source={{ uri: reviewerImage }} style={styles.avatar} />

                      <View>
                        <Text style={styles.reviewerName}>{reviewerName}</Text>
                        <Text style={styles.reviewTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
                      </View>
                    </View>

                    <View style={styles.starRow}>
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Icon key={i} name="star" size={18} color="#1fa000" />
                      ))}
                    </View>

                    <Text style={styles.reviewText}>{item.comment}</Text>

                    {/* Likes/Dislikes - Backend doesn't support yet, keeping UI hidden or static */}
                    {/* 
                            <View style={styles.actionRow}>
                            <View style={styles.actionBtn}>
                                <Icon name="thumb-up-outline" size={18} color="#333" />
                                <Text style={styles.actionCount}>{item.likes || 0}</Text>
                            </View>
                            </View>
                            */}
                  </View>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 40 }} />

      </ScrollView>
    </SafeAreaView>
  );
};
// ... rest of styles (keep them same)
// I will keep the styles block below but ensure it matches
// Just replacing lines 1-152 is safer if I keep styles


export default Review;

const styles = StyleSheet.create({
  /* -------- SAFE AREA FIX -------- */
  safe: {
    flex: 1,
    backgroundColor: '#fff', // Changed to white for a cleaner look behind the header curve
  },

  container: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Light gray background for content
  },

  /* Header - Premium Curved Look */
  header: {
    backgroundColor: '#1fa000',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    zIndex: 1,
  },

  headerText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* Rating Summary Card - Floating Effect */
  ratingContainer: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },

  ratingValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#333',
    includeFontPadding: false,
  },

  starRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },

  reviewCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontWeight: '500',
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },

  ratingLabel: {
    width: 30,
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },

  ratingBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },

  ratingBarFill: {
    height: '100%',
    backgroundColor: '#1fa000',
    borderRadius: 4,
  },

  ratingPercent: {
    width: 35,
    textAlign: 'right',
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },

  /* Review List */
  reviewCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },

  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 15,
    backgroundColor: '#eee', // Placeholder bg
  },

  reviewerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },

  reviewTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  reviewText: {
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
    color: '#444',
  },

  actionRow: {
    flexDirection: 'row',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    paddingTop: 10,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },

  actionCount: {
    marginLeft: 6,
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});
