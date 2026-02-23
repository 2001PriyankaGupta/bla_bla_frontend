
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Image,
    ActivityIndicator,
    Modal,
    PermissionsAndroid,
    Linking,
    Alert
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import GetLocation from 'react-native-get-location';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL, IMG_URL } from '../config/config';

const ChatScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { driverName, driverImage, rideId, receiverId } = route.params || {};

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [attachmentVisible, setAttachmentVisible] = useState(false);
    const flatListRef = useRef(null);
    const [userId, setUserId] = useState(null);

    // Get Current User ID
    useEffect(() => {
        const fetchUserId = async () => {
            const id = await AsyncStorage.getItem('user_id');
            if (id) {
                setUserId(parseInt(id));
            } else {
                console.warn("User ID not found in AsyncStorage. Make sure detailed login response saved it.");
            }
        };
        fetchUserId();
    }, []);

    // Fetch Messages
    useEffect(() => {
        if (rideId && receiverId) {
            fetchMessages();
            // Optional: Set up an interval or socket for real-time updates
            const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
            return () => clearInterval(interval);
        }
    }, [rideId, receiverId, userId]); // Added userId to dependencies to ensure it's available for fetchMessages

    const fetchMessages = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const currentUserId = userId || await AsyncStorage.getItem('user_id');

            if (!currentUserId && !userId) {
                return;
            }

            const response = await axios.get(`${BASE_URL}ride/${rideId}/conversation/${receiverId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.status === true) {
                const messagesData = response.data.data.messages || [];
                const fetchedMessages = messagesData.map(msg => ({
                    id: msg.id.toString(),
                    text: msg.message,
                    sender: msg.sender.id,
                    time: msg.formatted_time,
                    isUser: msg.is_sender
                }));
                setMessages(fetchedMessages);
                setLoading(false);
            } else {
                console.warn("Fetch messages failed:", response.data.message);
                setLoading(false);
            }
        } catch (error) {
            console.error("Fetch Messages Error:", error);
            setLoading(false);
        }
    };

    const sendMessage = async (type = 'text', content = null) => {
        const msgText = content || inputText;
        if (!msgText || msgText.trim() === '') return;

        // If it's a text message, clear input immediately for better UX
        if (type === 'text') {
            setInputText('');
        }

        setSending(true);

        try {
            const token = await AsyncStorage.getItem('access_token');
            const currentUserId = userId || await AsyncStorage.getItem('user_id');

            if (!currentUserId) {
                console.error("User ID not found, cannot send message.");
                setSending(false);
                return;
            }

            const payload = {
                receiver_id: receiverId,
                message: msgText
            };

            const response = await axios.post(`${BASE_URL}ride/${rideId}/message`, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.status === true) {
                const newMsgData = response.data.data;
                const newMessage = {
                    id: newMsgData.id.toString(),
                    text: newMsgData.message,
                    sender: newMsgData.sender.id,
                    time: newMsgData.formatted_time,
                    isUser: newMsgData.sender.id == currentUserId // Since we sent it
                };

                setMessages(prev => [...prev, newMessage]);
            } else {
                console.warn("Message send failed:", response.data.message);
                if (type === 'text') setInputText(msgText); // Restore text on failure
            }

        } catch (error) {
            console.error("Send Message Error:", error);
            if (type === 'text') setInputText(msgText); // Restore text on failure
            if (error.response) {
                console.error("Error Response Data:", error.response.data);
                if (error.response.status === 422) {
                    alert(`Validation Error: ${JSON.stringify(error.response.data.errors || error.response.data.message)}`);
                }
            }
        } finally {
            setSending(false);
            setAttachmentVisible(false);
        }
    };

    const handleAttachment = () => {
        setAttachmentVisible(!attachmentVisible);
    };

    const handleImagePick = (source) => {
        const options = {
            width: 800,
            height: 800,
            cropping: true,
            mediaType: 'photo',
            includeBase64: true
        };

        const pickerAction = source === 'camera' ? ImagePicker.openCamera : ImagePicker.openPicker;

        pickerAction(options).then(async (image) => {
            console.log("Image picked:", image.path);

            // Here you would typically upload the image to your server
            // For now, checks if we can send the base64 or path
            // Assuming we send the local path or base64 as a message for demo
            // In a real app, upload -> get URL -> send URL

            // Mocking upload by just sending a text that looks like an image URL 
            // or if backend supports base64, send that.
            // Let's send a placeholder or the actual base64 if small enough? No, base64 is too big for simple message field usually.

            // Just for UI demo:
            // "Image: [path]"
            // But to render it, we need to recognize it.

            // Hack for demo: send the local path (screens on same device might not see it, but it shows flow)
            // Ideally: upload to server.

            // Let's assume we simply send the image path as text for now.
            sendMessage('image', `[IMAGE]${image.path}`);
        }).catch(err => {
            console.log("ImagePicker Error:", err);
            setAttachmentVisible(false);
        });
    };

    const handleLocation = async () => {
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            ]);
            if (granted['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED &&
                granted['android.permission.ACCESS_COARSE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED) {
                console.log("Location permission denied");
                return;
            }
        }

        GetLocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 60000,
        })
            .then(location => {
                const { latitude, longitude } = location;
                const locationUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                sendMessage('location', locationUrl);
            })
            .catch(error => {
                const { code, message } = error;
                console.log("GetLocation Error:", code, message);
                Alert.alert("Error", "Could not get location.");
            });
    };

    const renderItem = ({ item }) => {
        // Use the isUser flag derived during fetch, or fallback to checking sender ID if available
        const isUser = item.isUser || (userId && item.sender === userId);

        let content;
        if (item.text && item.text.startsWith('[IMAGE]')) {
            const imagePath = item.text.replace('[IMAGE]', '');
            content = (
                <TouchableOpacity onPress={() => {/* Maybe open full screen */ }}>
                    <Image
                        source={{ uri: imagePath }}
                        style={{ width: 200, height: 200, borderRadius: 10, resizeMode: 'cover' }}
                    />
                </TouchableOpacity>
            );
        } else if (item.text && (item.text.startsWith('http') || item.text.startsWith('https'))) {
            // Check if it's a map link
            if (item.text.includes('maps.google.com') || item.text.includes('google.com/maps')) {
                content = (
                    <TouchableOpacity onPress={() => Linking.openURL(item.text)}>
                        <Text style={[styles.messageText, isUser ? styles.userText : styles.driverText, { textDecorationLine: 'underline' }]}>
                            📍 Location
                        </Text>
                        <Text style={[styles.messageText, isUser ? styles.userText : styles.driverText, { fontSize: 12 }]}>
                            Tap to view on map
                        </Text>
                    </TouchableOpacity>
                );
            } else {
                content = (
                    <Text style={[styles.messageText, isUser ? styles.userText : styles.driverText]} onPress={() => Linking.openURL(item.text)}>
                        {item.text}
                    </Text>
                );
            }
        } else {
            content = (
                <Text style={[styles.messageText, isUser ? styles.userText : styles.driverText]}>
                    {item.text}
                </Text>
            );
        }

        return (
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.driverBubble]}>
                {content}
                <Text style={[styles.timeText, isUser ? styles.userTime : styles.driverTime]}>
                    {item.time}
                </Text>
            </View>
        );
    };

    useEffect(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    <Image
                        source={driverImage ? { uri: driverImage } : require('../asset/Image/Rides.png')}
                        style={styles.avatar}
                    />
                    <Text style={styles.headerTitle}>{driverName || 'Chat'}</Text>
                </View>

                {/* <TouchableOpacity style={styles.callButton}>
                    <Icon name="phone" size={24} color="#fff" />
                </TouchableOpacity> */}
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
            >
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#248907" />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Text style={{ color: '#999' }}>No messages yet. Start the conversation!</Text>
                            </View>
                        }
                    />
                )}

                {/* Attachment Menu */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={attachmentVisible}
                    onRequestClose={() => setAttachmentVisible(false)}
                >
                    <TouchableOpacity style={styles.modalOverlay} onPress={() => setAttachmentVisible(false)}>
                        <View style={styles.attachmentContainer}>
                            <View style={styles.attachmentItem}>
                                <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#E91E63' }]} onPress={() => handleImagePick('camera')}>
                                    <Icon name="camera" size={24} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.attachmentText}>Camera</Text>
                            </View>
                            <View style={styles.attachmentItem}>
                                <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#9C27B0' }]} onPress={() => handleImagePick('gallery')}>
                                    <Icon name="image" size={24} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.attachmentText}>Gallery</Text>
                            </View>
                            <View style={styles.attachmentItem}>
                                <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#009688' }]} onPress={handleLocation}>
                                    <Icon name="map-marker" size={24} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.attachmentText}>Location</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity onPress={handleAttachment} style={styles.attachButton}>
                        <Icon name="plus" size={24} color="#555" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity onPress={() => sendMessage('text')} style={styles.sendButton} disabled={sending}>
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Icon name="send" size={24} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#248907',
        elevation: 4,
        marginTop: 35,
    },
    backButton: {
        marginRight: 15,
    },
    headerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#ccc',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    callButton: {
        padding: 5,
    },
    listContent: {
        padding: 15,
        paddingBottom: 50,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 15,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#248907',
        borderBottomRightRadius: 2,
    },
    driverBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#f1f1f1',
        borderBottomLeftRadius: 2,
    },
    messageText: {
        fontSize: 16,
    },
    userText: {
        color: '#fff',
    },
    driverText: {
        color: '#333',
    },
    timeText: {
        fontSize: 10,
        marginTop: 5,
        alignSelf: 'flex-end',
    },
    userTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    driverTime: {
        color: '#888',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    input: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        fontSize: 16,
        maxHeight: 100, // For multiline growth
    },
    sendButton: {
        backgroundColor: '#248907',
        width: 45,
        height: 45,
        borderRadius: 22.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachButton: {
        padding: 5,
        marginRight: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'flex-end',
    },
    attachmentContainer: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        paddingBottom: 40,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 10,
    },
    attachmentItem: {
        alignItems: 'center',
    },
    iconButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    attachmentText: {
        fontSize: 12,
        color: '#555',
    },
});

export default ChatScreen;
