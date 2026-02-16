import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    FlatList,
    ScrollView,
    StyleSheet,
    StatusBar,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    RefreshControl,
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/config';

const SupportTickets = () => {
    const navigation = useNavigation();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Create Ticket Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchTickets = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.get(`${BASE_URL}tickets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.status === 'success') {
                setTickets(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchTickets();
    }, []);

    const handleCreateTicket = async () => {
        if (!subject || !description) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setSubmitting(true);
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await axios.post(`${BASE_URL}tickets`, {
                subject,
                description,
                priority: 'Medium'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'success') {
                Alert.alert('Success', 'Ticket created successfully');
                setModalVisible(false);
                setSubject('');
                setDescription('');
                fetchTickets();
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            Alert.alert('Error', 'Failed to create ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Open': return '#007bff';
            case 'In Progress': return '#ffc107';
            case 'Closed': return '#28a745';
            default: return '#6c757d';
        }
    };

    const renderTicketItem = ({ item }) => (
        <TouchableOpacity
            style={styles.ticketCard}
            onPress={() => navigation.navigate('TicketChat', { ticketId: item.id, ticketTitle: item.subject })}
        >
            <View style={styles.ticketHeader}>
                <Text style={styles.ticketId}>{item.ticket_id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <Text style={styles.ticketSubject}>{item.subject}</Text>
            <Text style={styles.ticketDate}>Created on: {new Date(item.created_at).toLocaleDateString()}</Text>

            <View style={styles.ticketFooter}>
                <Text style={styles.priorityText}>Priority: <Text style={{ color: item.priority === 'High' ? '#d32f2f' : '#666' }}>{item.priority}</Text></Text>
                <Icon name="chevron-right" size={20} color="#999" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#1fa000" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Support Tickets</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <Icon name="plus" size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#1fa000" style={{ flex: 1 }} />
            ) : (
                <FlatList
                    data={tickets}
                    renderItem={renderTicketItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon name="ticket-outline" size={80} color="#eee" />
                            <Text style={styles.emptyText}>No tickets found</Text>
                            <TouchableOpacity
                                style={styles.createBtn}
                                onPress={() => setModalVisible(true)}
                            >
                                <Text style={styles.createBtnText}>Raise a Ticket</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Create Ticket Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Support Ticket</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Icon name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.inputLabel}>Subject</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="What is the issue about?"
                                value={subject}
                                onChangeText={setSubject}
                            />

                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Describe your issue in detail..."
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                            />

                            <TouchableOpacity
                                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                                onPress={handleCreateTicket}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Submit Ticket</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default SupportTickets;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 5 : 0,
    },
    header: {
        backgroundColor: '#1fa000',
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    listContainer: {
        padding: 15,
    },
    ticketCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    ticketId: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1fa000',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    ticketSubject: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    ticketDate: {
        fontSize: 12,
        color: '#777',
        marginBottom: 10,
    },
    ticketFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    priorityText: {
        fontSize: 13,
        color: '#666',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 10,
        marginBottom: 20,
    },
    createBtn: {
        backgroundColor: '#1fa000',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    createBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 15,
        color: '#333',
    },
    textArea: {
        height: 120,
    },
    submitBtn: {
        backgroundColor: '#1fa000',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 30,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    }
});
