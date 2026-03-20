import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Modal,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { BASE_URL } from '../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OtpScreen = () => {
    const [otp, setOtp] = useState('');
    const inputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    const [modalState, setModalState] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'error',
        onConfirm: null,
    });

    const navigation = useNavigation();
    const route = useRoute();
    const email = route.params?.email || '';

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
            if (interval) clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timer]);

    const showModal = (title, message, type = 'error', onConfirm = null) => {
        setModalState({ visible: true, title, message, type, onConfirm });
    };

    const handleModalConfirm = () => {
        setModalState(prev => ({ ...prev, visible: false }));
        if (modalState.onConfirm) {
            modalState.onConfirm();
        }
    };

    const showError = (title, message) => {
        showModal(title, message, 'error');
    };

    const handleResend = async () => {
        if (!canResend) return;

        try {
            const response = await axios.post(`${BASE_URL}auth/resend-otp`, {
                email: email
            });

            if (response.data.status === "true") {
                setOtp('');
                setTimer(60);
                setCanResend(false);
                showModal('OTP Resent', 'A new OTP code has been sent to your email.', 'info');
            } else {
                showError('Resend Failed', response.data.message || 'Could not resend OTP.');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'An error occurred while resending the OTP.';
            showError('Resend Failed', errorMsg);
        }
    };

    const handleVerify = async () => {
        if (!otp || otp.length < 6) {
            showError('Invalid OTP', 'Please enter a valid 6-digit OTP code.');
            return;
        }

        try {
            const response = await axios.post(`${BASE_URL}auth/verify-otp`, {
                email: email,
                otp: otp
            });

            if (response.data.status === "true" || response.status === 200 || response.status === 201) {
                const { access_token, user } = response.data;
                if (access_token) {
                    await AsyncStorage.setItem('access_token', access_token);
                }
                if (user) {
                    await AsyncStorage.setItem('user_data', JSON.stringify(user));
                    if (user.id) {
                        await AsyncStorage.setItem('user_id', user.id.toString());
                    }
                }

                showModal('Success', 'Verification Successful!', 'success', () => {
                    navigation.navigate('RideBookingPage');
                });
            } else {
                setOtp(''); // Clear OTP digits on error
                showError('Verification Failed', response.data.message || 'OTP verification failed.');
            }
        } catch (error) {
            setOtp(''); // Clear OTP digits on error
            if (error.response && error.response.status === 401) {
                await AsyncStorage.removeItem('access_token');
                await AsyncStorage.removeItem('user_data');
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }

            if (error.response) {
                showError('Verification Failed', error.response.data.message || 'Verification failed.');
            } else if (error.request) {
                showError('Network Error', 'No response from server. Check your internet connection.');
            } else {
                showError('Unexpected Error', 'An error occurred. Please try again.');
            }
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" translucent={false} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }} bounces={false} showsVerticalScrollIndicator={false}>

                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Icon name="arrow-left" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Verification</Text>
                    </View>

                    <View style={styles.contentBox}>
                        <View style={styles.iconContainer}>
                            <Icon name="email-check-outline" size={60} color="#248907" />
                        </View>
                        <Text style={styles.title}>Enter OTP</Text>
                        <Text style={styles.subtitle}>
                            We have sent an OTP code to your email
                            {email ? `\n${email}` : ''}
                        </Text>

                        <TouchableOpacity
                            activeOpacity={1}
                            style={styles.otpContainer}
                            onPress={() => inputRef.current?.focus()}
                        >
                            {[...Array(6)].map((_, index) => {
                                const digit = otp[index] || '';
                                const isCurrent = index === otp.length;
                                const isActive = isCurrent && isFocused;
                                return (
                                    <View key={index} style={[styles.otpBox, isActive && styles.otpBoxActive]}>
                                        <Text style={styles.otpText}>{digit}</Text>
                                    </View>
                                );
                            })}
                            <TextInput
                                ref={inputRef}
                                value={otp}
                                onChangeText={setOtp}
                                maxLength={6}
                                keyboardType="numeric"
                                style={styles.hiddenInput}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                            />
                        </TouchableOpacity>

                        <View style={styles.resendContainer}>
                            {timer > 0 ? (
                                <Text style={styles.timerText}>Resend code in <Text style={{ fontWeight: '700', color: '#248907' }}>{timer}s</Text></Text>
                            ) : (
                                <TouchableOpacity onPress={handleResend}>
                                    <Text style={styles.resendText}>Resend OTP</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity onPress={handleVerify} style={styles.nextButton}>
                            <Text style={styles.nextText}>Verify & Proceed</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 25 }}>
                            <Text style={{ textAlign: 'center', color: '#777', fontSize: responsiveFontSize(16), fontWeight: '500' }}>
                                Go back to login
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={modalState.visible} transparent={true} animationType="fade">
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Icon
                                name={modalState.type === 'error' ? 'alert-circle-outline' : modalState.type === 'success' ? 'check-circle-outline' : 'email-fast-outline'}
                                size={50}
                                color={modalState.type === 'error' ? '#e53935' : '#248907'}
                            />
                            <Text style={styles.modalTitle}>{modalState.title}</Text>
                        </View>
                        <Text style={styles.modalText}>{modalState.message}</Text>
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: modalState.type === 'error' ? '#e53935' : '#248907' }]}
                            onPress={handleModalConfirm}
                        >
                            <Text style={styles.modalBtnText}>
                                {modalState.type === 'error' ? 'Close' : 'Continue'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
};

export default OtpScreen;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        paddingTop: verticalScale(15),
        backgroundColor: '#248907',
        paddingHorizontal: scale(25),
        paddingBottom: verticalScale(60),
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: scale(15),
    },
    headerTitle: {
        fontSize: responsiveFontSize(32),
        fontWeight: '800',
        color: '#fff',
    },
    contentBox: {
        flex: 1,
        backgroundColor: '#fff',
        marginTop: verticalScale(-60),
        borderTopLeftRadius: moderateScale(25),
        borderTopRightRadius: moderateScale(25),
        paddingHorizontal: scale(30),
        paddingTop: verticalScale(40),
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: verticalScale(20),
    },
    title: {
        fontSize: responsiveFontSize(26),
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: verticalScale(10),
    },
    subtitle: {
        fontSize: responsiveFontSize(16),
        color: '#666',
        textAlign: 'center',
        marginBottom: verticalScale(40),
        lineHeight: 24,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: verticalScale(10),
    },
    otpBox: {
        width: scale(45),
        height: verticalScale(55),
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: moderateScale(10),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    otpBoxActive: {
        borderColor: '#248907',
        borderWidth: 2,
    },
    otpText: {
        fontSize: responsiveFontSize(24),
        fontWeight: 'bold',
        color: '#000',
    },
    hiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: verticalScale(30),
    },
    resendText: {
        fontSize: responsiveFontSize(16),
        color: '#248907',
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    timerText: {
        fontSize: responsiveFontSize(15),
        color: '#666',
    },
    nextButton: {
        backgroundColor: '#248907',
        height: verticalScale(55),
        borderRadius: moderateScale(10),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#248907',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    nextText: {
        fontSize: responsiveFontSize(18),
        fontWeight: '700',
        color: '#fff',
    },
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: responsiveFontSize(22),
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
        textAlign: 'center',
    },
    modalText: {
        fontSize: responsiveFontSize(15),
        color: '#555',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
        paddingHorizontal: 10,
    },
    modalBtn: {
        backgroundColor: '#248907',
        paddingVertical: verticalScale(14),
        paddingHorizontal: scale(40),
        borderRadius: moderateScale(15),
        width: '100%',
    },
    modalBtnText: {
        color: '#fff',
        fontSize: responsiveFontSize(18),
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
