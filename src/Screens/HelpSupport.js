import { useNavigation } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { BASE_URL } from '../config/config';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STATIC_DATA = {
  'Account & Payment': 'Manage your profile, update your contact details, or add/remove payment methods. You can also view your transaction history and resolve any payment-related discrepancies. To change your email or phone number, go to Profile > Edit.',
  'Ride Issues': 'If you experienced any issues during your ride, such as a wrong route, vehicle condition, or driver behavior, please report it here. Our team will investigate and take necessary actions. You can also report lost items from this section.',
  'Safety & Security': 'Your safety is our priority. In case of an emergency, use the SOS button in the app. You can also share your ride status with friends and family. Report any safety concerns or suspicious activities immediately.',
  'App & Features': 'Learn how to use new features, troubleshoot app crashes, or provide feedback on app performance. Ensure you are using the latest version of the app for the best experience. Check for updates on the Play Store or App Store.',
  'Terms & Conditions': 'By using this app, you agree to our terms of service. This includes responsible use of the platform, adherence to local laws, and respect for other users. Misuse of the service may lead to account suspension.',
  'Refund & Privacy Policy': 'We value your privacy. Your data is encrypted and never shared with third parties without your consent. For refunds, please submit a request within 48 hours of the transaction. Approved refunds are processed within 5-7 business days.'
};

const HelpSupport = () => {
  const navigation = useNavigation();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredFaqs, setFilteredFaqs] = useState([]);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchFaqs = async () => {
      try {
        const response = await axios.get(`${BASE_URL}faqs`);
        if (isMounted && response.data.status === 'success') {
          setFaqs(response.data.data);
          setFilteredFaqs(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching FAQs:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFaqs();
    return () => { isMounted = false; };
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text === '') {
      setFilteredFaqs(faqs);
    } else {
      const filtered = faqs.filter(faq =>
        faq.question.toLowerCase().includes(text.toLowerCase()) ||
        faq.answer.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredFaqs(filtered);
    }
  };

  const toggleSection = (section) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1fa000" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SupportTickets')}>
          <Icon name="ticket-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={22} color="#777" />
          <TextInput
            placeholder="Search for help"
            placeholderTextColor="#777"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Common Issues */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Issues</Text>
          {[
            'Account & Payment',
            'Ride Issues',
            'Safety & Security',
            'App & Features',
          ].map(title => (
            <View key={title} style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => toggleSection(title)}
                activeOpacity={0.7}
              >
                <Text style={styles.listText}>{title}</Text>
                <Icon
                  name={expandedSections[title] ? "chevron-up" : "chevron-down"}
                  size={24}
                  color="#333"
                />
              </TouchableOpacity>
              {expandedSections[title] && (
                <View style={styles.expandedContent}>
                  <Text style={styles.expandedText}>{STATIC_DATA[title]}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* FAQs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#1fa000" style={{ margin: 20 }} />
          ) : filteredFaqs.length > 0 ? (
            filteredFaqs.map((item, index) => (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity
                  onPress={() => toggleSection(`faq_${index}`)}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text style={[styles.faqQuestion, { flex: 1 }]}>{item.question}</Text>
                  <Icon name={expandedSections[`faq_${index}`] ? "chevron-up" : "chevron-down"} size={20} color="#777" />
                </TouchableOpacity>
                {expandedSections[`faq_${index}`] && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No FAQs found matching your search.</Text>
          )}
        </View>

        {/* Contact Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Still need help?</Text>
          <TouchableOpacity
            style={styles.redButton}
            onPress={() => navigation.navigate('SupportTickets')}
          >
            <Text style={styles.redButtonText}>Raise a Support Ticket</Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Policies</Text>
          {[
            'Terms & Conditions',
            'Refund & Privacy Policy',
          ].map(title => (
            <View key={title} style={styles.accordionContainer}>
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => toggleSection(title)}
                activeOpacity={0.7}
              >
                <Text style={styles.listText}>{title}</Text>
                <Icon
                  name={expandedSections[title] ? "chevron-up" : "chevron-down"}
                  size={24}
                  color="#333"
                />
              </TouchableOpacity>
              {expandedSections[title] && (
                <View style={styles.expandedContent}>
                  <Text style={styles.expandedText}>{STATIC_DATA[title]}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpSupport;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
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
  searchContainer: {
    backgroundColor: '#fff',
    elevation: 3,
    margin: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
    color: '#000',
  },
  section: {
    marginTop: 10,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 15,
    marginBottom: 5,
    marginTop: 15,
    color: '#1fa000',
  },
  accordionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  listText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  expandedContent: {
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 5,
  },
  expandedText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  faqItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 10,
  },
  redButton: {
    backgroundColor: '#cc0000',
    marginHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  redButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  noData: {
    textAlign: 'center',
    color: '#777',
    margin: 20,
  }
});
