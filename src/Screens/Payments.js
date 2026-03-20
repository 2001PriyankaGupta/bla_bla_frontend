import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale, moderateScale, responsiveFontSize } from '../utils/Responsive';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const Payments = () => {
  const [activeTab, setActiveTab] = useState('Paid');
  const insets = useSafeAreaInsets();

  const transactions = {
    Paid: [
      { id: 1, title: 'Paid Rs150.00', desc: 'Ride to Airport' },
      { id: 2, title: 'Paid Rs150.00', desc: 'Ride to Home' },
      { id: 3, title: 'Paid Rs150.00', desc: 'Ride to Office' },
    ],
    Received: [
      { id: 1, title: 'Received Rs200.00', desc: 'From John' },
      { id: 2, title: 'Received Rs100.00', desc: 'From Mike' },
    ],
  };

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" translucent={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: verticalScale(30) }}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + verticalScale(15) }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity>
              <Icon name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payments & Wallet</Text>
          </View>

          {/* Wallet Balance Card */}
          <View style={styles.walletCard}>
            <View style={styles.balanceRow}>
              <Icon name="wallet-outline" size={28} color="#248907" />
              <View>
                <Text style={styles.balanceText}>Rs1250.00</Text>
                <Text style={styles.balanceSubText}>Available balance</Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.buttonText}>Add Funds</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.withdrawButton}>
                <Text style={[styles.buttonText, { color: '#000' }]}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>

          <TouchableOpacity>  <View style={styles.methodBox}>
            <Image
              source={require('../asset/Image/Paytm.png')}
              style={styles.methodIcon}
            />
            <View>
              <Text style={styles.methodName}>Paytm</Text>
              <Text style={styles.methodType}>UPI</Text>
            </View>
          </View></TouchableOpacity>

          <TouchableOpacity>
            <View style={styles.methodBox}>
              <Image
                source={require('../asset/Image/Visa.png')}
                style={styles.methodIcon}
              />
              <View>
                <Text style={styles.methodName}>Visa **** 1234</Text>
                <Text style={styles.methodType}>Card</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity>
            <View style={styles.methodBox}>
              <Image
                source={require('../asset/Image/Phonepay.png')}
                style={styles.methodIcon}
              />
              <View>
                <Text style={styles.methodName}>Phone Pay</Text>
                <Text style={styles.methodType}>Wallet</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>

          {/* Tabs */}
          <View style={styles.tabRow}>
            {['Paid', 'Received'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  activeTab === tab && styles.activeTabButton,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transactions */}
          {transactions[activeTab].map((item) => (
            <View key={item.id} style={styles.transactionItem}>
              <Icon
                name="car-outline"
                size={30}
                color="#248907"
                style={{ marginRight: 10 }}
              />
              <View>
                <Text style={styles.transactionTitle}>{item.title}</Text>
                <Text style={styles.transactionDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Payments;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#248907',
    borderBottomLeftRadius: moderateScale(20),
    borderBottomRightRadius: moderateScale(20),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(25),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(15),
    marginTop: verticalScale(10),
  },
  headerTitle: {
    color: '#fff',
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    marginLeft: scale(10),
  },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(15),
    padding: moderateScale(15),
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(15),
  },
  balanceText: {
    fontSize: responsiveFontSize(20),
    fontWeight: '700',
    marginLeft: scale(10),
  },
  balanceSubText: {
    color: '#777',
    fontSize: responsiveFontSize(13),
    marginLeft: scale(10),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#248907',
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    marginRight: scale(10),
  },
  withdrawButton: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '700',
    color: '#fff',
    fontSize: responsiveFontSize(14),
  },
  section: {
    padding: moderateScale(20),
  },
  sectionTitle: {
    fontSize: responsiveFontSize(16),
    fontWeight: '700',
    marginBottom: verticalScale(15),
    color: '#000',
  },
  methodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    marginBottom: verticalScale(10),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 1,
  },
  methodIcon: {
    width: scale(35),
    height: scale(35),
    marginRight: scale(12),
  },
  methodName: {
    fontWeight: '600',
    fontSize: responsiveFontSize(15),
    color: '#000',
  },
  methodType: {
    color: '#777',
    fontSize: responsiveFontSize(13),
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tabButton: {
    flex: 1,
    paddingVertical: verticalScale(8),
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: '#248907',
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
    fontSize: responsiveFontSize(14),
  },
  activeTabText: {
    color: '#000',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    marginBottom: verticalScale(10),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 1,
  },
  transactionTitle: {
    fontWeight: '600',
    color: '#000',
    fontSize: responsiveFontSize(14),
  },
  transactionDesc: {
    color: '#777',
    fontSize: responsiveFontSize(13),
  },
});
