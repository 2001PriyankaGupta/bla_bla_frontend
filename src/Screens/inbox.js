import { formatDateTime } from '../utils/DateUtils';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/config';

const Inbox = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Notifications');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.get(`${BASE_URL}notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        setNotifications(response.data.data);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      await axios.post(`${BASE_URL}notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Error marking as read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      await axios.post(`${BASE_URL}notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user_data');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      console.error('Error marking all as read:', error);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'booking_request': return 'calendar-clock';
      case 'booking_status_updated': return 'calendar-check';
      case 'booking_cancelled_by_passenger': return 'calendar-remove';
      case 'booking_placed': return 'calendar-plus';
      case 'booking_updated': return 'calendar-edit';
      case 'new_ride_booking': return 'car-plus';
      default: return 'bell-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#248907" translucent={false} />

      {/* Header */}
      <View style={[styles.header, { height: verticalScale(60) + insets.top, paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbox</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Notifications' && styles.activeTab]}
          onPress={() => setActiveTab('Notifications')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'Notifications' && styles.activeTabText]}>
              Notifications
            </Text>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {notifications.filter(n => !n.is_read).length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Messages' && styles.activeTab]}
          onPress={() => setActiveTab('Messages')}
        >
          <Text style={[styles.tabText, activeTab === 'Messages' && styles.activeTabText]}>
            Messages
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#248907" style={{ marginTop: 100 }} />
        ) : (
          activeTab === 'Notifications' ? (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Recent Updates {notifications.filter(n => !n.is_read).length > 0 ? `(${notifications.filter(n => !n.is_read).length} New)` : ''}
                </Text>
                {notifications.some(n => !n.is_read) && (
                  <TouchableOpacity onPress={markAllRead}>
                    <Text style={styles.markAllText}>Mark all as read</Text>
                  </TouchableOpacity>
                )}
              </View>

              {notifications.length > 0 ? (
                <>
                  {(showAllNotifications ? notifications : notifications.slice(0, 3)).map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
                      onPress={() => markAsRead(item.id)}
                    >
                      <View style={[styles.notifIconContainer, !item.is_read && styles.unreadIconContainer]}>
                        <Icon
                          name={getNotifIcon(item.type)}
                          size={24}
                          color={item.is_read ? "#777" : "#248907"}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.notifHeader}>
                          <Text style={[styles.notifTitle, !item.is_read && styles.unreadText]}>
                            {item.title}
                          </Text>
                          {!item.is_read && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.notifDesc}>{item.message}</Text>
                        <Text style={styles.notifTime}>
                          {formatDateTime(item.created_at)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {notifications.length > 3 && !showAllNotifications && (
                    <TouchableOpacity
                      style={styles.readMoreBtn}
                      onPress={() => setShowAllNotifications(true)}
                    >
                      <Text style={styles.readMoreText}>Read More ({notifications.length - 3} more)</Text>
                      <Icon name="chevron-down" size={20} color="#248907" />
                    </TouchableOpacity>
                  )}

                  {notifications.length > 3 && showAllNotifications && (
                    <TouchableOpacity
                      style={styles.readMoreBtn}
                      onPress={() => setShowAllNotifications(false)}
                    >
                      <Text style={styles.readMoreText}>View Less</Text>
                      <Icon name="chevron-up" size={20} color="#248907" />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon name="bell-off-outline" size={60} color="#eee" />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
              )}

              <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 10 }]}>Support</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SupportTickets')}>
                <View style={styles.supportItem}>
                  <View style={styles.supportIcon}>
                    <Icon name="headset" size={22} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.supportText}>Support Chat with Admin</Text>
                    <Text style={styles.supportSubText}>Check your tickets and replies</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#ccc" />
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="message-outline" size={80} color="#eee" />
              <Text style={styles.emptyText}>No direct messages yet</Text>
              <Text style={styles.emptySubText}>When you book a ride, chats will show up here.</Text>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Inbox;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#248907',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: { position: 'absolute', left: 15, bottom: 20 },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    bottom: 20,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderColor: '#248907',
  },
  activeTabText: {
    color: '#248907',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#248907',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  markAllText: {
    fontSize: 13,
    color: '#248907',
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  unreadItem: {
    backgroundColor: '#f9fef6',
    borderColor: '#e8f5e1',
  },
  notifIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unreadIconContainer: {
    backgroundColor: '#f0f9eb',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    flex: 1,
  },
  unreadText: {
    color: '#333',
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#248907',
    marginLeft: 5,
  },
  notifDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 10,
  },
  readMoreText: {
    fontSize: 14,
    color: '#248907',
    fontWeight: '600',
    marginRight: 5,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 1,
  },
  supportIcon: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: '#248907',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supportText: { fontSize: 16, fontWeight: '600', color: '#333' },
  supportSubText: { fontSize: 13, color: '#777', marginTop: 2 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  }
});
