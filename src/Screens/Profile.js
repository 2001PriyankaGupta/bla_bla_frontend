import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ImagePicker from 'react-native-image-crop-picker';

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, IMG_URL } from '../config/config';

const Profile = () => {
  const navigation = useNavigation();
  const [switchRole, setSwitchRole] = useState(false);
  const [userData, setUserData] = useState(null);

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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" />

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>

        {/* ================= HEADER ================= */}
        <View style={styles.header}>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Icon name="arrow-left" size={30} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Account</Text>

          <TouchableOpacity onPress={openEditModal} style={{ position: 'absolute', right: 20, top: Platform.OS === 'android' ? 15 : 10 }}>
            <Icon name="pencil" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Image */}
        <View style={styles.profileContainer}>
          {userData?.profile_picture ? (
            <Image
              source={{ uri: userData.profile_picture.startsWith('http') ? userData.profile_picture : `${IMG_URL}${userData.profile_picture}` }}
              style={styles.profileImage}
            />
          ) : (
            <Image
              source={require('../asset/Image/Profile.png')}
              style={styles.profileImage}
            />
          )}

          <Text style={styles.profilename}>{userData ? userData.name : 'Guest User'}</Text>

          <TouchableOpacity>
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>
        </View>

        {/* MAIN CONTENT */}
        <View style={styles.mainview}>

          {/* Account Info Section */}
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{userData ? userData.name : 'Guest User'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>{userData?.gender || 'Not Specified'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{userData?.email || 'Not Specified'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{userData?.phone || 'Not Specified'}</Text>
          </View>

          {/* Offering rides - Only for Drivers */}
          {userData?.user_type === 'driver' && (
            <>
              <Text style={styles.subTitle}>Offering Rides</Text>

              <TouchableOpacity
                onPress={() => navigation.navigate('AddYourCar')}
                style={styles.row}
              >
                <Text style={styles.rowText}>Add Car Details</Text>
                <Icon name="chevron-right" size={22} color="#000" />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.row}>
            <View>
              <Text style={styles.rowText}>Switch Role</Text>
              <Text style={{ fontSize: 12, color: 'gray' }}>Current: {userData?.user_type || 'Unknown'}</Text>
            </View>

            <Switch
              value={switchRole}
              onValueChange={handleSwitchRole}
              trackColor={{ false: '#ccc', true: '#4caf50' }}
              thumbColor="#fff"
            />
          </View>

          {/* Ratings Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Ratings & Reviews</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Review')}
            style={styles.row}
          >
            <Text style={styles.rowText}>View Ratings & Reviews</Text>
            <Icon name="chevron-right" size={22} color="#000" />
          </TouchableOpacity>

          {/* Help Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Help And Support</Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('HelpSupport')}
            style={styles.row}
          >
            <Text style={styles.rowText}>Help And Support</Text>
            <Icon name="chevron-right" size={22} color="#000" />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
      {/* Edit Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <TouchableOpacity onPress={handleImagePick} style={styles.modalImagePicker}>
              {editImage ? (
                <Image source={{ uri: editImage.path }} style={styles.modalImage} />
              ) : (
                userData?.profile_picture ?
                  <Image source={{ uri: userData.profile_picture.startsWith('http') ? userData.profile_picture : `${IMG_URL}${userData.profile_picture}` }} style={styles.modalImage} /> :
                  <Icon name="camera" size={40} color="#ccc" />
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.modalInput}
              placeholder="Name"
              value={editName}
              onChangeText={setEditName}
            />

            <View style={styles.genderContainer}>
              <Text>Gender: </Text>
              <TouchableOpacity onPress={() => setEditGender('male')} style={[styles.genderOption, editGender === 'male' && styles.genderSelected]}>
                <Text style={editGender === 'male' ? { color: '#fff' } : { color: '#000' }}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditGender('female')} style={[styles.genderOption, editGender === 'female' && styles.genderSelected]}>
                <Text style={editGender === 'female' ? { color: '#fff' } : { color: '#000' }}>Female</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Phone"
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.modalBtn, styles.cancelBtn]}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateProfile} style={[styles.modalBtn, styles.saveBtn]}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default Profile;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop:
      Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 0,
  },

  /* HEADER */
  header: {
    height: 150,
    backgroundColor: '#248907',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  backBtn: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'android' ? 15 : 10,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    alignSelf: 'center',
    marginBottom: 30,
  },

  /* PROFILE IMAGE */
  profileContainer: {
    alignItems: 'center',
    marginTop: -40,
  },

  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  profilename: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 10,
  },

  viewProfileText: {
    color: '#248907',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 5,
  },

  /* MAIN CONTENT */
  mainview: {
    padding: 15,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 0.8,
    borderColor: '#e5e5e5',
  },

  infoLabel: {
    fontSize: 16,
    color: '#000',
  },

  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },

  subTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 25,
    color: '#000',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 0.7,
    borderColor: '#e5e5e5',
  },

  rowText: {
    fontSize: 16,
    color: '#000',
  },

  sectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginTop: 18,
  },

  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },

  logoutBtn: {
    backgroundColor: '#b60000',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 30,
    alignItems: 'center',
  },

  logoutText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },

  /* MODAL STYLES */
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalImagePicker: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  modalImage: {
    width: 100,
    height: 100,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    color: '#000',
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  genderOption: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    marginLeft: 10,
  },
  genderSelected: {
    backgroundColor: '#248907',
    borderColor: '#248907',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#999',
  },
  saveBtn: {
    backgroundColor: '#248907',
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
