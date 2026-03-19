import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Switch,
  Image,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ImagePicker from 'react-native-image-crop-picker';

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { BASE_URL, IMG_URL } from '../config/config';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import { useFocusEffect } from '@react-navigation/native';

const Profile = () => {
  const navigation = useNavigation();
  const [switchRole, setSwitchRole] = useState(false);
  const [userData, setUserData] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;
      const response = await axios.get(`${BASE_URL}notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.status === 'success') {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      fetchUnreadCount();
    }, [])
  );

  // Edit Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editImage, setEditImage] = useState(null);

  React.useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      // console.log('Token:', token);

      // Fetch from API
      if (token) {
        const response = await axios.get(`${BASE_URL}profile/get`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });

        console.log('Get Profile Response:', response.data);

        if (response.data.status === true || response.data.status === "true" || response.status === 200) {
          const user = response.data.data || response.data.user;
          if (user) {
            setUserData(user);
            setSwitchRole(user.user_type === 'driver');
            await AsyncStorage.setItem('user_data', JSON.stringify(user));
            return; // Exit if successful
          }
        }
      }

      // Fallback to local storage if API fails or no token (or data missing in response)
      const storedUser = await AsyncStorage.getItem('user_data');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserData(user);
        setSwitchRole(user.user_type === 'driver');
      }

    } catch (error) {
      console.error('Failed to load user data:', error);
      // Fallback on error
      const storedUser = await AsyncStorage.getItem('user_data');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserData(user);
        setSwitchRole(user.user_type === 'driver');
      }
    }
  };

  const handleSwitchRole = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      // Changed to POST request as per standard state change practices
      const response = await axios.post(`${BASE_URL}profile/switch-role`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      console.log('Switch Role Response:', response.data);

      if (response.data.status === "true" || response.status === 200) {
        Alert.alert('Success', response.data.message || 'Role switched successfully');

        if (response.data.user) {
          setUserData(response.data.user);
          setSwitchRole(response.data.user.user_type === 'driver');
          await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        } else {
          // Fallback logic: if currently driver, become customer (passenger). Otherwise become driver.
          // This handles cases where user_type might be 'passenger', 'customer' or undefined.
          const newType = userData.user_type === 'driver' ? 'customer' : 'driver';
          const updatedUser = { ...userData, user_type: newType };
          setUserData(updatedUser);
          setSwitchRole(newType === 'driver');
          await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        }
      } else {
        Alert.alert('Error', response.data.message || 'Failed to switch role');
        setSwitchRole(userData.user_type === 'driver'); // Revert to original state
      }
    } catch (error) {
      console.error('Switch Role Error:', error);
      Alert.alert('Error', 'Failed to switch role');
      setSwitchRole(userData.user_type === 'driver'); // Revert to original state
    }
  };

  const openEditModal = () => {
    if (userData) {
      setEditName(userData.name || '');
      setEditGender(userData.gender || '');
      setEditPhone(userData.phone || '');
    }
    setModalVisible(true);
  };

  const handleImagePick = () => {
    ImagePicker.openPicker({
      width: 300,
      height: 300,
      cropping: true,
      mediaType: 'photo',
    }).then(image => {
      setEditImage(image);
    }).catch(err => {
      console.log('ImagePicker Error: ', err);
    });
  };

  const handleUpdateProfile = async () => {
    try {
      console.log('Updating profile...');
      const token = await AsyncStorage.getItem('access_token');
      console.log('Using Token:', token);

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data, headers) => {
          return data; // Prevent axios from transforming FormData
        },
        timeout: 10000
      };

      const formData = new FormData();
      formData.append('name', editName);
      formData.append('gender', editGender);
      formData.append('phone', editPhone);

      if (editImage) {
        formData.append('profile_image', {
          uri: editImage.path,
          type: editImage.mime,
          name: editImage.path.split('/').pop(),
        });
      }

      console.log('Sending FormData Update');
      const response = await axios.post(`${BASE_URL}profile/update`, formData, config);

      console.log('Update Response:', response.data);

      if (response.data.status === true || response.data.status === "true" || response.status === 200) {
        Alert.alert('Success', response.data.message || 'Profile updated successfully');
        setModalVisible(false);
        if (response.data.user) {
          setUserData(response.data.user);
          await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
        } else {
          // Fallback if user object not returned (though specific example shows it is)
          const updatedUser = { ...userData, name: editName, gender: editGender, phone: editPhone };
          if (editImage) updatedUser.profile_picture = editImage.path; // Optimistic update
          setUserData(updatedUser);
          await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        }
      } else {
        Alert.alert('Error', response.data.message || 'Update failed');
      }
    } catch (error) {
      console.error('Update Error:', error);
      if (error.response) {
        console.error('Error Data:', error.response.data);
        console.error('Error Status:', error.response.status);
        Alert.alert('Error', error.response.data.message || `Update failed with status ${error.response.status}`);
      } else if (error.request) {
        console.error('Error Request:', error.request);
        Alert.alert('Error', 'No response from server. Check network connection.');
      } else {
        Alert.alert('Error', error.message || 'Failed to update profile');
      }
    }
  };

  const handleLogout = async () => {
    try {
      // Sign out from Google if possible
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore if already signed out or error
      }

      await AsyncStorage.clear();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left', 'bottom']}>
      <StatusBar barStyle="dark-content" translucent={false} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >

        {/* ================= MODERN HEADER ================= */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Icon name="arrow-left" size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>My Account</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.editBtnHeader, { marginRight: scale(10) }]}
                onPress={() => navigation.navigate('Inbox')}
              >
                <Icon name="bell-outline" size={24} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={openEditModal} style={styles.editBtnHeader}>
                <Icon name="account-edit-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* PROFILE CARD - Floating effect */}
        <View style={styles.profileCard}>
          <View style={styles.imageWrapper}>
            {userData?.profile_picture ? (
              <Image
                source={{ uri: userData.profile_picture.startsWith('http') ? userData.profile_picture : `${IMG_URL}${userData.profile_picture}` }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="account" size={50} color="#248907" />
              </View>
            )}
            <TouchableOpacity style={styles.cameraIcon} onPress={handleImagePick}>
              <Icon name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.profilename}>{userData ? userData.name : 'Guest User'}</Text>
          <Text style={styles.profileEmail}>{userData?.email || 'No Email Added'}</Text>

          <View style={styles.statusBadge}>
            <Icon name="shield-check" size={14} color="#248907" />
            <Text style={styles.statusText}>Verified Account</Text>
          </View>
        </View>

        {/* MAIN SETTINGS LIST */}
        <View style={styles.menuSection}>
          <Text style={styles.menuHeader}>Personal Information</Text>

          <View style={styles.menuCard}>
            <InfoItem icon="account-outline" label="Full Name" value={userData?.name || '—'} />
            <View style={styles.itemDivider} />
            <InfoItem icon="email-outline" label="Email Address" value={userData?.email || '—'} />
            <View style={styles.itemDivider} />
            <InfoItem icon="phone-outline" label="Phone Number" value={userData?.phone || '—'} />
            <View style={styles.itemDivider} />
            <InfoItem icon="gender-male-female" label="Gender" value={userData?.gender || 'Not Specified'} isLast />
          </View>

          <Text style={styles.menuHeader}>Preferences & Actions</Text>

          <View style={styles.menuCard}>
            <MenuItem
              icon="car-info"
              label="Car Details"
              subLabel="Manage your vehicles"
              onPress={() => navigation.navigate('AddYourCar')}
            />
            <View style={styles.itemDivider} />
            <MenuItem
              icon="star-face"
              label="Ratings & Reviews"
              subLabel="See what others say"
              onPress={() => navigation.navigate('Review')}
            />
            <View style={styles.itemDivider} />
            <MenuItem
              icon="help-circle-outline"
              label="Help & Support"
              subLabel="Get assistance"
              onPress={() => navigation.navigate('HelpSupport')}
              isLast
            />
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout-variant" size={20} color="#e74c3c" />
            <Text style={styles.logoutButtonText}>Logout from Account</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version 1.0.4 (Beta)</Text>
        </View>

      </ScrollView>

      {/* Edit Profile Modal (Remaining same for functionality but can be styled later if needed) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Profile</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                <TouchableOpacity onPress={handleImagePick} style={styles.modalImagePicker}>
                  {editImage ? (
                    <Image source={{ uri: editImage.path }} style={styles.modalImage} />
                  ) : (
                    userData?.profile_picture ?
                      <Image source={{ uri: userData.profile_picture.startsWith('http') ? userData.profile_picture : `${IMG_URL}${userData.profile_picture}` }} style={styles.modalImage} /> :
                      <Icon name="camera" size={40} color="#ccc" />
                  )}
                  <View style={styles.cameraOverlay}>
                    <Icon name="camera" size={20} color="#fff" />
                  </View>
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Display Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Full Name"
                    value={editName}
                    onChangeText={setEditName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <View style={styles.genderContainer}>
                    {['male', 'female', 'other'].map((g) => (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setEditGender(g)}
                        style={[styles.genderOption, editGender === g && styles.genderSelected]}
                      >
                        <Text style={[styles.genderText, editGender === g && { color: '#fff' }]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Phone Number"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <TouchableOpacity onPress={handleUpdateProfile} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

// --- Reusable Components ---
const InfoItem = ({ icon, label, value, isLast }) => (
  <View style={styles.infoItem}>
    <View style={styles.infoIconBox}>
      <Icon name={icon} size={20} color="#248907" />
    </View>
    <View style={styles.infoTextBox}>
      <Text style={styles.infoTitle}>{label}</Text>
      <Text style={styles.infoDesc}>{value}</Text>
    </View>
  </View>
);

const MenuItem = ({ icon, label, subLabel, onPress, isLast }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.infoIconBox, { backgroundColor: '#F1F8E9' }]}>
      <Icon name={icon} size={22} color="#248907" />
    </View>
    <View style={styles.infoTextBox}>
      <Text style={styles.menuItemLabel}>{label}</Text>
      <Text style={styles.menuItemSub}>{subLabel}</Text>
    </View>
    <Icon name="chevron-right" size={24} color="#BDC3C7" />
  </TouchableOpacity>
);

export default Profile;

/* ================= PREVENTATIVE STYLES ================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  /* MODERN HEADER */
  header: {
    backgroundColor: '#248907',
    height: verticalScale(180),
    paddingTop: Platform.OS === 'ios' ? 0 : verticalScale(20),
    borderBottomLeftRadius: moderateScale(35),
    borderBottomRightRadius: moderateScale(35),
    elevation: 8,
    shadowColor: '#248907',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,

  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    marginTop: verticalScale(10),
  },
  headerTitle: {
    color: '#fff',
    fontSize: responsiveFontSize(20),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnHeader: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e74c3c',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#248907',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },

  /* PROFILE CARD */
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: scale(20),
    marginTop: verticalScale(-80),
    borderRadius: moderateScale(25),
    padding: moderateScale(20),
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  imageWrapper: {
    position: 'relative',
    marginBottom: verticalScale(15),
  },
  profileImage: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    borderWidth: 4,
    borderColor: '#fff',
  },
  imagePlaceholder: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(55),
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: verticalScale(5),
    right: scale(5),
    backgroundColor: '#248907',
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profilename: {
    fontSize: responsiveFontSize(22),
    fontWeight: '800',
    color: '#2C3E50',
  },
  profileEmail: {
    fontSize: responsiveFontSize(14),
    color: '#7F8C8D',
    marginTop: verticalScale(4),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(20),
    marginTop: verticalScale(12),
  },
  statusText: {
    color: '#248907',
    fontSize: responsiveFontSize(12),
    fontWeight: '700',
    marginLeft: scale(5),
  },

  /* SETTINGS SECTIONS */
  menuSection: {
    paddingHorizontal: scale(20),
    marginTop: verticalScale(30),
  },
  menuHeader: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#7F8C8D',
    marginBottom: verticalScale(15),
    marginLeft: scale(5),
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(15),
    marginBottom: verticalScale(25),
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F5F6F7',
  },

  /* INFO ITEM */
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(15),
  },
  infoIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(12),
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(15),
  },
  infoTextBox: {
    flex: 1,
  },
  infoTitle: {
    fontSize: responsiveFontSize(12),
    color: '#95A5A6',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoDesc: {
    fontSize: responsiveFontSize(15),
    color: '#2C3E50',
    fontWeight: '700',
    marginTop: verticalScale(2),
  },

  /* MENU ITEM */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(15),
  },
  menuItemLabel: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    color: '#2C3E50',
  },
  menuItemSub: {
    fontSize: responsiveFontSize(13),
    color: '#95A5A6',
    marginTop: verticalScale(2),
  },

  /* LOGOUT */
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDEDEC',
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(18),
    marginTop: verticalScale(10),
    borderWidth: 1,
    borderColor: '#FADBD8',
  },
  logoutButtonText: {
    color: '#e74c3c',
    fontSize: responsiveFontSize(16),
    fontWeight: '800',
    marginLeft: scale(10),
  },
  versionText: {
    textAlign: 'center',
    color: '#BDC3C7',
    fontSize: responsiveFontSize(12),
    marginTop: verticalScale(20),
    marginBottom: verticalScale(10),
  },

  /* MODAL MODERN STYLES */
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: moderateScale(35),
    borderTopRightRadius: moderateScale(35),
    padding: moderateScale(25),
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  modalTitle: {
    fontSize: responsiveFontSize(22),
    fontWeight: '800',
    color: '#2C3E50',
  },
  modalImagePicker: {
    alignSelf: 'center',
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: '#F5F6F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(30),
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#F1F8E9',
  },
  modalImage: {
    width: scale(120),
    height: scale(120),
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    height: verticalScale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: verticalScale(20),
  },
  inputLabel: {
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
    color: '#7F8C8D',
    marginBottom: verticalScale(8),
    marginLeft: scale(5),
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: moderateScale(15),
    padding: moderateScale(15),
    fontSize: responsiveFontSize(16),
    color: '#2C3E50',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#EBEDEF',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: scale(10),
  },
  genderOption: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBEDEF',
  },
  genderSelected: {
    backgroundColor: '#248907',
    borderColor: '#248907',
  },
  genderText: {
    fontWeight: '700',
    color: '#7F8C8D',
  },
  saveBtn: {
    backgroundColor: '#248907',
    paddingVertical: verticalScale(18),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    marginTop: verticalScale(10),
    elevation: 5,
    shadowColor: '#248907',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
  },
});

