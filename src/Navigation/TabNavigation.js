import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Home from "../Screens/Home";
import Publish from "../Screens/Publish";
import YourRides from "../Screens/YourRides";
import Profile from "../Screens/Profile";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";

const Tab = createBottomTabNavigator();

export default function TabNavigation({ route }) {
  // Screens where ONLY 2 tabs should show
  const twoTabScreens = ["RideBookingPage"];

  const routeName = getFocusedRouteNameFromRoute(route) ?? "Home";
  const showLimitedTabs = twoTabScreens.includes(routeName);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#248907", height: 70 },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#fff",
      }}
    >

      {/* Always visible */}
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ color }) => <Icon name="home" color={color} size={24} />,
        }}
      />

      {/* Only show Publish for drivers */}
      <Tab.Screen
        name="Publish"
        component={Publish}
        options={{
          tabBarIcon: ({ color }) => <Icon name="plus" color={color} size={24} />,
        }}
      />

      {/* Only show on Home Screen and others (NOT on limited screens) */}
      {!showLimitedTabs && (
        <>
          <Tab.Screen
            name="YourRides"
            component={YourRides}
            options={{
              tabBarIcon: ({ color }) => <Icon name="car" color={color} size={24} />,
            }}
          />

          <Tab.Screen
            name="Profile"
            component={Profile}
            options={{
              tabBarIcon: ({ color }) => <Icon name="account" color={color} size={24} />,
            }}
          />
        </>
      )}

    </Tab.Navigator>
  );
}
