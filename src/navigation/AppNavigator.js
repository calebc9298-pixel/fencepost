import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/fonts';
import {
  Platform,
  useWindowDimensions,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';

// Import screens (to be created)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import FeedScreen from '../screens/feed/FeedScreen';
import CreatePostScreen from '../screens/post/CreatePostScreen';
import CreateFencePostScreen from '../screens/post/CreateFencePostScreen';
import FencePostBoardScreen from '../screens/fence/FencePostBoardScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import CommentsScreen from '../screens/comments/CommentsScreen';
import RainGaugeScreen from '../screens/RainGaugeScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import { isAdmin } from '../utils/adminUtils';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import PrivacyPolicyScreen from '../screens/legal/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/legal/TermsOfServiceScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

const linking = {
  prefixes: [Linking.createURL('/'), 'https://fencepost-65663.web.app'],
  config: {
    screens: {
      Comments: 'comments/:postId',
    },
  },
};

function MainDrawer() {
  const { user } = useAuth();
  const showAdminMenu = isAdmin(user);
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 768;
  const isWeb = Platform.OS === 'web';

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerPosition: 'left',
        drawerType: isLargeScreen && !isWeb ? 'permanent' : 'front',
        drawerStyle: {
          backgroundColor: '#ACD1AF', // Dark green
          width: isLargeScreen ? 160 : '80%',
          borderRightWidth: 2,
          borderRightColor: '#2D5016', // Gold
        },
        drawerActiveTintColor: '#2D5016', // Gold
        drawerInactiveTintColor: '#999',
        drawerActiveBackgroundColor: 'rgba(212, 175, 55, 0.1)',
        drawerLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          marginLeft: -16,
          flexWrap: 'wrap',
          fontFamily: fonts.semibold,
        },
        drawerItemStyle: {
          borderRadius: 0,
          marginVertical: 1,
          paddingVertical: 6,
          paddingRight: 8,
        },
        drawerContentStyle: {
          paddingRight: 0,
        },
        headerStyle: {
          backgroundColor: '#ACD1AF', // Dark green
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 4,
          borderBottomWidth: 2,
          borderBottomColor: '#2D5016', // Gold
          height: 50,
        },
        headerTintColor: '#2D5016',
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: isLargeScreen ? 18 : 16,
          letterSpacing: isLargeScreen ? 1.5 : 0.8,
          textTransform: 'uppercase',
          fontFamily: fonts.extrabold,
        },
        swipeEnabled: !isLargeScreen && !isWeb,
        headerShown: true,
        headerLeft:
          isLargeScreen && !isWeb
            ? () => (
                <img
                  src="/icon.svg"
                  alt="FencePost Logo"
                  style={{ height: 32, width: 32, marginLeft: 12 }}
                />
              )
            : undefined,
        headerLeftContainerStyle: {
          paddingLeft: 8,
        },
      }}
    >
      <Drawer.Screen
        name="Feed"
        component={FeedScreen}
        options={({ navigation }) => ({
          drawerLabel: 'Feed',
          headerTitle: () => (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: isLargeScreen ? '-40px' : '0',
              }}
            >
              <img
                src="/icon.svg"
                alt="FencePost"
                style={{ height: 28, width: 28 }}
              />
              <span
                style={{
                  fontSize: isLargeScreen ? 20 : 18,
                  fontWeight: '500',
                  letterSpacing: isLargeScreen ? 1.2 : 0.8,
                  textTransform: 'uppercase',
                  color: '#2D5016',
                  fontFamily: fonts.semibold,
                }}
              >
                FencePost
              </span>
            </div>
          ),
          headerLeft:
            !isLargeScreen && !isWeb
              ? () => (
                  <TouchableOpacity
                    onPress={() => navigation.toggleDrawer()}
                    style={{ paddingLeft: 16, paddingRight: 16 }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: '#2D5016',
                        fontWeight: '800',
                      }}
                    >
                      Menu
                    </Text>
                  </TouchableOpacity>
                )
              : undefined,
        })}
      />
      <Drawer.Screen
        name="FencePost"
        component={CreatePostScreen}
        options={({ navigation }) => ({
          drawerLabel: 'FencePost',
          headerTitle: () => (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: isLargeScreen ? '-40px' : '0',
              }}
            >
              <img
                src="/icon.svg"
                alt="FencePost"
                style={{ height: 28, width: 28 }}
              />
              <span
                style={{
                  fontSize: isLargeScreen ? 20 : 18,
                  fontWeight: '500',
                  letterSpacing: isLargeScreen ? 1.2 : 0.8,
                  textTransform: 'uppercase',
                  color: '#2D5016',
                  fontFamily: fonts.semibold,
                }}
              >
                FencePost
              </span>
            </div>
          ),
          headerLeft:
            !isLargeScreen && !isWeb
              ? () => (
                  <TouchableOpacity
                    onPress={() => navigation.toggleDrawer()}
                    style={{ paddingLeft: 16, paddingRight: 16 }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: '#2D5016',
                        fontWeight: '800',
                      }}
                    >
                      Menu
                    </Text>
                  </TouchableOpacity>
                )
              : undefined,
        })}
      />
      <Drawer.Screen
        name="Rain Gauge"
        component={RainGaugeScreen}
        options={({ navigation }) => ({
          drawerLabel: 'Rain Gauge',
          headerTitle: () => (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: isLargeScreen ? '-40px' : '0',
              }}
            >
              <img
                src="/icon.svg"
                alt="FencePost"
                style={{ height: 28, width: 28 }}
              />
              <span
                style={{
                  fontSize: isLargeScreen ? 20 : 18,
                  fontWeight: '500',
                  letterSpacing: isLargeScreen ? 1.2 : 0.8,
                  textTransform: 'uppercase',
                  color: '#2D5016',
                  fontFamily: fonts.semibold,
                }}
              >
                FencePost
              </span>
            </div>
          ),
          headerLeft:
            !isLargeScreen && !isWeb
              ? () => (
                  <TouchableOpacity
                    onPress={() => navigation.toggleDrawer()}
                    style={{ paddingLeft: 16, paddingRight: 16 }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: '#2D5016',
                        fontWeight: '800',
                      }}
                    >
                      Menu
                    </Text>
                  </TouchableOpacity>
                )
              : undefined,
        })}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          drawerLabel: 'Profile',
          headerTitle: () => (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: isLargeScreen ? '-40px' : '0',
              }}
            >
              <img
                src="/icon.svg"
                alt="FencePost"
                style={{ height: 28, width: 28 }}
              />
              <span
                style={{
                  fontSize: isLargeScreen ? 20 : 18,
                  fontWeight: '500',
                  letterSpacing: isLargeScreen ? 1.2 : 0.8,
                  textTransform: 'uppercase',
                  color: '#2D5016',
                  fontFamily: fonts.semibold,
                }}
              >
                FencePost
              </span>
            </div>
          ),
          headerLeft:
            !isLargeScreen && !isWeb
              ? () => (
                  <TouchableOpacity
                    onPress={() => navigation.toggleDrawer()}
                    style={{ paddingLeft: 16, paddingRight: 16 }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: '#2D5016',
                        fontWeight: '800',
                      }}
                    >
                      Menu
                    </Text>
                  </TouchableOpacity>
                )
              : undefined,
        })}
      />
      {/* Notifications bell under Profile */}
      <Drawer.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={({ navigation }) => ({
          drawerLabel: 'Notifications',
          headerTitle: () => (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: isLargeScreen ? '-40px' : '0',
              }}
            >
              <img
                src="/icon.svg"
                alt="FencePost"
                style={{ height: 28, width: 28 }}
              />
              <span
                style={{
                  fontSize: isLargeScreen ? 20 : 18,
                  fontWeight: '500',
                  letterSpacing: isLargeScreen ? 1.2 : 0.8,
                  textTransform: 'uppercase',
                  color: '#2D5016',
                  fontFamily: fonts.semibold,
                }}
              >
                FencePost
              </span>
            </div>
          ),
        })}
      />
      {showAdminMenu && (
        <Drawer.Screen
          name="Admin"
          component={AdminScreen}
          options={({ navigation }) => ({
            drawerLabel: 'Admin',
            headerTitle: () => (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginLeft: isLargeScreen ? '-40px' : '0',
                }}
              >
                <img
                  src="/icon.svg"
                  alt="FencePost"
                  style={{ height: 28, width: 28 }}
                />
                <span
                  style={{
                    fontSize: isLargeScreen ? 20 : 18,
                    fontWeight: '500',
                    letterSpacing: isLargeScreen ? 1.2 : 0.8,
                    textTransform: 'uppercase',
                    color: '#2D5016',
                    fontFamily: fonts.semibold,
                  }}
                >
                  FencePost
                </span>
              </div>
            ),
            headerLeft:
              !isLargeScreen && !isWeb
                ? () => (
                    <TouchableOpacity
                      onPress={() => navigation.toggleDrawer()}
                      style={{ paddingLeft: 16, paddingRight: 16 }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          color: '#2D5016',
                          fontWeight: '800',
                        }}
                      >
                        Menu
                      </Text>
                    </TouchableOpacity>
                  )
                : undefined,
          })}
        />
      )}
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // TODO: replace with a loading spinner if desired
  }

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: '800' },
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainDrawer}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="FencePostBoard"
              component={FencePostBoardScreen}
              options={{
                title: 'FencePost Board',
                headerStyle: { backgroundColor: '#ACD1AF' },
                headerTintColor: '#2D5016',
                headerTitleStyle: { fontWeight: '800' },
              }}
            />
            <Stack.Screen
              name="CreateFencePost"
              component={CreateFencePostScreen}
              options={({ navigation }) => ({
                title: 'Create FencePost',
                headerStyle: {
                  backgroundColor: '#ACD1AF',
                },
                headerTintColor: '#2D5016',
                headerTitleStyle: {
                  fontWeight: '800',
                  color: '#2D5016',
                },
                headerBackTitleStyle: {
                  color: '#2D5016',
                },
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ paddingLeft: 16, paddingRight: 16 }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: '#2D5016',
                        fontWeight: '800',
                      }}
                    >
                      Back
                    </Text>
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="Comments"
              component={CommentsScreen}
              options={{
                title: 'Comments',
                headerStyle: {
                  backgroundColor: '#ACD1AF',
                },
                headerTintColor: '#2D5016',
                headerTitleStyle: {
                  fontWeight: '800',
                },
              }}
            />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{
                title: 'Privacy Policy',
                headerStyle: {
                  backgroundColor: '#ACD1AF',
                },
                headerTintColor: '#2D5016',
                headerTitleStyle: {
                  fontWeight: '800',
                },
              }}
            />
            <Stack.Screen
              name="TermsOfService"
              component={TermsOfServiceScreen}
              options={{
                title: 'Terms of Service',
                headerStyle: {
                  backgroundColor: '#ACD1AF',
                },
                headerTintColor: '#2D5016',
                headerTitleStyle: {
                  fontWeight: '800',
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
