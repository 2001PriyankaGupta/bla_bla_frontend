import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    FlatList,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    TextInput,
    KeyboardAvoidingView,
    Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/config';

const TicketChat = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { ticketId, ticketTitle } = route.params;

    const [ticket, setTicket] = useState(null);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const flatListRef = useRef();

    const fetchTicketDetails = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const userStr = await AsyncStorage.getItem('user_data');
            if (userStr) setCurrentUser(JSON.parse(userStr));

            const response = await axios.get(`${BASE_URL}tickets/${ticketId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'success') {
                setTicket(response.data.data);
                setReplies(response.data.data.replies || []);
            }
        } catch (error) {
            console.error('Error fetching ticket details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicketDetails();

        // Optional: Poll for new messages every 10 seconds
        const interval = setInterval(fetchTicketDetails, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleSendReply = async () => {
        if (!message.trim()) return;

        setSending(true);
        const optimismMessage = {
            id: Date.now(),
            message: message,
            user_id: currentUser?.id,
            created_at: new Date().toISOString(),
            user: currentUser
        };

        // Optimistic update
        setReplies([...replies, optimismMessage]);
        setMessage('');
        Keyboard.dismiss();

        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.post(`${BASE_URL}tickets/${ticketId}/reply`, {
                message: message.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'success') {
                // Refresh to get the real message with server ID
                fetchTicketDetails();
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            // Remove optimistic message on error? Maybe just show error
        } finally {
            setSending(false);
        }
    };

    const renderReplyItem = ({ item }) => {
        const isMe = item.user_id === currentUser?.id;
        return (
            <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                {!isMe && (
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {item.user?.name ? item.user.name.charAt(0).toUpperCase() : 'S'}
                        </Text>
                    </View>
                )}
                <View style={[styles.messageBubble, isMe ? styles.myMessageBubble : styles.otherMessageBubble]}>
                    {!isMe && <Text style={styles.senderName}>{item.user?.name || 'Support Agent'}</Text>}
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                        {item.message}
                    </Text>
                    <Text style={[styles.messageTime, isMe ? styles.myMessageTime : styles.otherMessageTime]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#1fa000" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={26} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{ticketTitle}</Text>
                    <Text style={styles.headerSubtitle}>Ticket {ticket?.ticket_id}</Text>
                </View>
                <View style={{ width: 26 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1fa000" style={{ flex: 1 }} />
            ) : (
                <>
                    <FlatList
                        ref={flatListRef}
                        data={replies}
                        renderItem={renderReplyItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.chatContainer}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        ListHeaderComponent={
                            <View style={styles.ticketInfoCard}>
                                <Text style={styles.ticketInfoLabel}>Ticket Description:</Text>
                                <Text style={styles.ticketDescription}>{ticket?.description}</Text>
                                <View style={styles.divider} />
                                <Text style={styles.chatStartText}>Support Chat Started</Text>
                            </View>
                        }
                    />

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
                    >
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Type your message..."
                                value={message}
                                onChangeText={setMessage}
                                multiline
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, !message.trim() && { opacity: 0.5 }]}
                                onPress={handleSendReply}
                                disabled={!message.trim() || sending}
                            >
                                {sending ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Icon name="send" size={24} color="#fff" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </>
            )}
        </SafeAreaView>
    );
};

export default TicketChat;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f0f2f5',
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 5 : 0,
    },
    header: {
        backgroundColor: '#1fa000',
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    chatContainer: {
        padding: 15,
        paddingBottom: 50,
    },
    ticketInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    ticketInfoLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#777',
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    ticketDescription: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 15,
    },
    chatStartText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 15,
        maxWidth: '85%',
    },
    myMessageWrapper: {
        alignSelf: 'flex-end',
        flexDirection: 'row-reverse',
    },
    otherMessageWrapper: {
        alignSelf: 'flex-start',
    },
    avatar: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        backgroundColor: '#1fa000',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    avatarText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    messageBubble: {
        borderRadius: 18,
        paddingHorizontal: 15,
        paddingVertical: 10,
        elevation: 1,
    },
    myMessageBubble: {
        backgroundColor: '#1fa000',
        borderTopRightRadius: 2,
    },
    otherMessageBubble: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 2,
    },
    senderName: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1fa000',
        marginBottom: 2,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#fff',
    },
    otherMessageText: {
        color: '#333',
    },
    messageTime: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myMessageTime: {
        color: 'rgba(255,255,255,0.7)',
    },
    otherMessageTime: {
        color: '#999',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#fff',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    input: {
        flex: 1,
        backgroundColor: '#f0f2f5',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginRight: 10,
        fontSize: 15,
        maxHeight: 100,
        color: '#000',
    },
    sendBtn: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#1fa000',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
