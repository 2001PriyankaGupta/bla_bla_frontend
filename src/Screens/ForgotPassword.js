import React, { useState } from 'react';
import {
    View,
    Text,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { BASE_URL } from '../config/config';

const ForgotPassword = () => {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // Steps: 1 = Enter Email, 2 = Enter Code, 3 = New Password
    const [step, setStep] = useState(1);
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    const handleSendCode = async () => {
        if (!email) {
            Alert.alert("Error", "Please enter your email");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${BASE_URL}auth/forgot-password`, { email });
            console.log("Forgot Password Response:", response.data);

            if (response.data.status === 'true' || response.status === 200) {
                Alert.alert("Success", response.data.message);
                setStep(2);
            } else {
                Alert.alert("Error", response.data.message || "Something went wrong");
            }
        } catch (error) {
            console.error("Forgot Password Error:", error);
            const msg = error.response?.data?.message || "Failed to send code";
            Alert.alert("Error", msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!code) {
            Alert.alert("Error", "Please enter the code");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${BASE_URL}auth/verify-code`, { email, code });

            if (response.data.status === 'true') {
                setStep(3);
            } else {
                Alert.alert("Error", response.data.message || "Invalid code");
            }
        } catch (error) {
            console.error("Verify Code Error:", error);
            Alert.alert("Error", "Invalid code");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!password || !passwordConfirm) {
            Alert.alert("Error", "Please enter new password");
            return;
        }
        if (password !== passwordConfirm) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${BASE_URL}auth/reset-password`, {
                email,
                code,
                password,
                password_confirmation: passwordConfirm
            });

            if (response.data.status === 'true') {
                Alert.alert("Success", "Password reset successfully!", [
                    { text: "Login", onPress: () => navigation.navigate('LoginDetails') }
                ]);
            } else {
                Alert.alert("Error", response.data.message || "Failed to reset password");
            }
        } catch (error) {
            console.error("Reset Password Error:", error);
            Alert.alert("Error", "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" translucent={false} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Forgot Password</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>

                {step === 1 && (
                    <>
                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>Enter your email to receive a reset code.</Text>

                        <View style={styles.inputBox}>
                            <Icon name="email-outline" size={22} color="#000" />
                            <TextInput
                                placeholder="Email Address"
                                placeholderTextColor="#777"
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Code</Text>}
                        </TouchableOpacity>
                    </>
                )}

                {step === 2 && (
                    <>
                        <Text style={styles.title}>Enter Code</Text>
                        <Text style={styles.subtitle}>Enter the code sent to {email}</Text>

                        <View style={styles.inputBox}>
                            <Icon name="lock-outline" size={22} color="#000" />
                            <TextInput
                                placeholder="Reset Code"
                                placeholderTextColor="#777"
                                style={styles.input}
                                value={code}
                                onChangeText={setCode}
                                keyboardType="default" // or number-pad if strictly numeric
                            />
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleVerifyCode} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify Code</Text>}
                        </TouchableOpacity>
                    </>
                )}

                {step === 3 && (
                    <>
                        <Text style={styles.title}>New Password</Text>
                        <Text style={styles.subtitle}>Create a new password for your account.</Text>

                        <View style={styles.inputBox}>
                            <Icon name="lock" size={22} color="#000" />
                            <TextInput
                                placeholder="New Password"
                                placeholderTextColor="#777"
                                style={styles.input}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <View style={styles.inputBox}>
                            <Icon name="lock-check" size={22} color="#000" />
                            <TextInput
                                placeholder="Confirm Password"
                                placeholderTextColor="#777"
                                style={styles.input}
                                value={passwordConfirm}
                                onChangeText={setPasswordConfirm}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Reset Password</Text>}
                        </TouchableOpacity>
                    </>
                )}

            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#248907', // Green Header
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: 20,
        marginTop: 35,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff'
    },
    content: {
        padding: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#248907',
        marginBottom: 10
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 40,
        lineHeight: 22
    },
    inputBox: {
        width: '100%',
        height: 55,
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 20,
        backgroundColor: '#f9f9f9',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
    },
    button: {
        width: '100%',
        height: 55,
        backgroundColor: '#248907',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        shadowColor: "#248907",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    }
});

export default ForgotPassword;
