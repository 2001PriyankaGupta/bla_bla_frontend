import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Payments = () => {
  const [activeTab, setActiveTab] = useState('Paid');

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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#248907" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 25,
    paddingTop: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  balanceText: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
  },
  balanceSubText: {
    color: '#777',
    fontSize: 13,
    marginLeft: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#248907',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  withdrawButton: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 15,
    color: '#000',
  },
  methodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 1,
  },
  methodIcon: {
    width: 35,
    height: 35,
    marginRight: 12,
  },
  methodName: {
    fontWeight: '600',
    fontSize: 15,
    color: '#000',
  },
  methodType: {
    color: '#777',
    fontSize: 13,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: '#248907',
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#000',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 1,
  },
  transactionTitle: {
    fontWeight: '600',
    color: '#000',
  },
  transactionDesc: {
    color: '#777',
    fontSize: 13,
  },
});
