import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL, IMG_URL } from '../config/config';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const Review = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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

      // NEW independent endpoint — no more user_type check
      const response = await axios.get(`${BASE_URL}reviews/my-reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('My Reviews Response:', response.data);

      if (response.data.success) {
        setReviews(response.data.reviews?.data || []);
        setStats(response.data.stats);
      } else {
        setReviews([]);
        setStats(null);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Fetch Reviews Error:', error?.response?.data || error.message);
      setReviews([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getRatingSummary = () => {
    if (!stats || !stats.rating_breakdown) {
      return [5, 4, 3, 2, 1].map(s => ({ star: s, count: 0, percent: 0 }));
    }
    const breakdown = stats.rating_breakdown;
    const total = stats.total_reviews || 1;
    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: breakdown[`${star}_star`] || 0,
      percent: Math.round(((breakdown[`${star}_star`] || 0) / total) * 100),
    }));
  };

  const ratingSummary = getRatingSummary();
  const avgRating = parseFloat(stats?.average_rating || 0).toFixed(1);
  const totalReviews = stats?.total_reviews || 0;

  const getStarColor = (rating) => {
    if (rating >= 4) return '#27ae60';
    if (rating >= 3) return '#f39c12';
    return '#e74c3c';
  };

  const getReviewerImage = (imgPath) => {
    if (!imgPath) return 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    return imgPath.startsWith('http') ? imgPath : `${IMG_URL}${imgPath}`;
  };

  const getBadgeLabel = (type) => {
    return type === 'driver' ? 'As Ride Creator' : 'As Ride Booker';
  };

  const getBadgeStyle = (type) => {
    return type === 'driver' ? styles.badgeCreator : styles.badgeBooker;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left', 'bottom']}>
      <StatusBar barStyle="dark-content" translucent={false} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: verticalScale(30) }}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + verticalScale(15) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerText}>My Reviews</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1fa000" />
            <Text style={styles.loadingText}>Loading reviews...</Text>
          </View>
        ) : (
          <>
            {/* ── Rating Summary Card ── */}
            <View style={styles.ratingCard}>
              {/* Left: big number */}
              <View style={styles.ratingLeft}>
                <Text style={[styles.bigRating, { color: getStarColor(parseFloat(avgRating)) }]}>
                  {avgRating}
                </Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Icon
                      key={i}
                      name={i <= Math.round(parseFloat(avgRating)) ? 'star' : 'star-outline'}
                      size={18}
                      color="#f39c12"
                    />
                  ))}
                </View>
                <Text style={styles.totalText}>{totalReviews} reviews</Text>
              </View>

              {/* Right: breakdown bars */}
              <View style={styles.ratingRight}>
                {ratingSummary.map(item => (
                  <View key={item.star} style={styles.barRow}>
                    <Text style={styles.barLabel}>{item.star}</Text>
                    <Icon name="star" size={12} color="#f39c12" style={{ marginRight: 5 }} />
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${item.percent}%` }]} />
                    </View>
                    <Text style={styles.barCount}>{item.count}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Info Banner ── */}
            <View style={styles.infoBanner}>
              <Icon name="information-outline" size={16} color="#1fa000" />
              <Text style={styles.infoText}>
                These are reviews received from others — for rides you created or booked.
              </Text>
            </View>

            {/* ── Reviews List ── */}
            {reviews.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="comment-search-outline" size={64} color="#ddd" />
                <Text style={styles.emptyTitle}>No Reviews Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Complete rides to receive reviews from others.
                </Text>
              </View>
            ) : (
              reviews.map((item) => (
                <View style={styles.reviewCard} key={item.id}>

                  {/* Card Top: Reviewer Info + Badge */}
                  <View style={styles.reviewTop}>
                    <Image
                      source={{ uri: getReviewerImage(item.reviewer_image) }}
                      style={styles.avatar}
                    />
                    <View style={styles.reviewerInfo}>
                      <Text style={styles.reviewerName}>{item.reviewer_name}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(item.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </Text>
                    </View>
                    {/* Role Badge */}
                    <View style={[styles.badge, getBadgeStyle(item.type)]}>
                      <Icon
                        name={item.type === 'driver' ? 'steering' : 'seat-passenger'}
                        size={11}
                        color="#fff"
                        style={{ marginRight: 3 }}
                      />
                      <Text style={styles.badgeText}>{getBadgeLabel(item.type)}</Text>
                    </View>
                  </View>

                  {/* Stars */}
                  <View style={[styles.starRow, { marginVertical: 8 }]}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Icon
                        key={i}
                        name={i <= item.rating ? 'star' : 'star-outline'}
                        size={20}
                        color="#f39c12"
                        style={{ marginRight: 2 }}
                      />
                    ))}
                    <Text style={styles.ratingNum}>{item.rating}.0</Text>
                  </View>

                  {/* Comment */}
                  {item.comment ? (
                    <Text style={styles.commentText}>"{item.comment}"</Text>
                  ) : (
                    <Text style={styles.noComment}>No comment left.</Text>
                  )}

                  {/* Ride Route */}
                  {item.ride_route && item.ride_route.trim() !== '→' && (
                    <View style={styles.routeRow}>
                      <Icon name="map-marker-path" size={14} color="#1fa000" />
                      <Text style={styles.routeText} numberOfLines={1}>
                        {item.ride_route}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Review;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingBox: {
    alignItems: 'center',
    marginTop: verticalScale(80),
  },
  loadingText: {
    marginTop: verticalScale(12),
    color: '#999',
    fontSize: responsiveFontSize(14),
  },

  /* Header */
  header: {
    backgroundColor: '#1fa000',
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(15),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6,

  },
  headerText: {
    fontSize: responsiveFontSize(20),
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Rating Summary Card */
  ratingCard: {
    backgroundColor: '#fff',
    margin: moderateScale(16),
    borderRadius: moderateScale(18),
    padding: moderateScale(20),
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  ratingLeft: {
    alignItems: 'center',
    marginRight: scale(20),
    minWidth: scale(80),
  },
  bigRating: {
    fontSize: responsiveFontSize(50),
    fontWeight: '900',
    lineHeight: verticalScale(55),
  },
  starRow: {
    flexDirection: 'row',
    marginTop: verticalScale(4),
  },
  totalText: {
    fontSize: responsiveFontSize(12),
    color: '#888',
    marginTop: verticalScale(4),
    fontWeight: '500',
  },
  ratingRight: {
    flex: 1,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(5),
  },
  barLabel: {
    width: scale(14),
    fontSize: responsiveFontSize(12),
    color: '#555',
    fontWeight: '700',
    textAlign: 'right',
    marginRight: scale(3),
  },
  barBg: {
    flex: 1,
    height: verticalScale(7),
    backgroundColor: '#f0f0f0',
    borderRadius: moderateScale(4),
    marginHorizontal: scale(6),
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#1fa000',
    borderRadius: moderateScale(4),
  },
  barCount: {
    width: scale(20),
    fontSize: responsiveFontSize(11),
    color: '#999',
    textAlign: 'right',
  },

  /* Info Banner */
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f5e9',
    marginHorizontal: scale(16),
    marginBottom: verticalScale(12),
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    borderLeftWidth: 3,
    borderLeftColor: '#1fa000',
  },
  infoText: {
    flex: 1,
    fontSize: responsiveFontSize(12),
    color: '#2d6a2f',
    marginLeft: scale(8),
    lineHeight: verticalScale(18),
    fontWeight: '500',
  },

  /* Empty State */
  emptyBox: {
    alignItems: 'center',
    marginTop: verticalScale(60),
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '700',
    color: '#444',
    marginTop: verticalScale(16),
  },
  emptySubtitle: {
    fontSize: responsiveFontSize(14),
    color: '#999',
    marginTop: verticalScale(8),
    textAlign: 'center',
    lineHeight: verticalScale(20),
  },

  /* Review Card */
  reviewCard: {
    backgroundColor: '#fff',
    marginHorizontal: scale(16),
    marginBottom: verticalScale(14),
    borderRadius: moderateScale(16),
    padding: moderateScale(18),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    backgroundColor: '#eee',
    marginRight: scale(12),
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: responsiveFontSize(15),
    fontWeight: '700',
    color: '#1a1a1a',
  },
  reviewDate: {
    fontSize: responsiveFontSize(11),
    color: '#aaa',
    marginTop: verticalScale(2),
  },

  /* Role Badge */
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(20),
  },
  badgeCreator: {
    backgroundColor: '#1fa000',
  },
  badgeBooker: {
    backgroundColor: '#2980b9',
  },
  badgeText: {
    fontSize: responsiveFontSize(10),
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* Stars & Rating */
  ratingNum: {
    fontSize: responsiveFontSize(13),
    color: '#888',
    marginLeft: scale(6),
    fontWeight: '600',
  },

  /* Comment */
  commentText: {
    fontSize: responsiveFontSize(14),
    color: '#444',
    lineHeight: verticalScale(22),
    fontStyle: 'italic',
    marginBottom: verticalScale(10),
  },
  noComment: {
    fontSize: responsiveFontSize(13),
    color: '#bbb',
    fontStyle: 'italic',
    marginBottom: verticalScale(10),
  },

  /* Route */
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: moderateScale(8),
    borderRadius: moderateScale(8),
    marginTop: verticalScale(4),
  },
  routeText: {
    fontSize: responsiveFontSize(12),
    color: '#555',
    marginLeft: scale(6),
    flex: 1,
    fontWeight: '500',
  },
});
