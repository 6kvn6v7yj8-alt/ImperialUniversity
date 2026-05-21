import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './src/context/AuthContext';
import { registerForPushNotifications, addNotificationListener } from './src/services/notifications';
import OnboardingScreen from './src/screens/auth/OnboardingScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import OTPScreen from './src/screens/auth/OTPScreen';
import StudentTabNavigator from './src/navigation/StudentTabNavigator';
import DoctorDashboardScreen from './src/screens/doctor/DoctorDashboardScreen';
import DoctorQRCodeScreen from './src/screens/doctor/DoctorQRCodeScreen';
import ViewAttendanceScreen from './src/screens/doctor/ViewAttendanceScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import ManageCoursesScreen from './src/screens/admin/ManageCoursesScreen';
import ManageScheduleScreen from './src/screens/admin/ManageScheduleScreen';
import ManageGradesScreen from './src/screens/admin/ManageGradesScreen';
import ManageLibraryScreen from './src/screens/admin/ManageLibraryScreen';
import SendNotificationScreen from './src/screens/admin/SendNotificationScreen';
import AdminViewAttendanceScreen from './src/screens/admin/AdminViewAttendanceScreen';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import ChatScreen from './src/screens/shared/ChatScreen';
import PaymentScreen from './src/screens/student/PaymentScreen';
import QRCodeScreen from './src/screens/student/QRCodeScreen';
import CoursesScreen from './src/screens/student/CoursesScreen';
import GradesScreen from './src/screens/student/GradesScreen';
import MyAttendanceScreen from './src/screens/student/MyAttendanceScreen';
import EditProfileScreen from './src/screens/shared/EditProfileScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    registerForPushNotifications().then(token => {
      if (token) console.log('Push Token:', token);
    });
    const subscription = addNotificationListener(notification => {
      console.log('Notification received:', notification);
    });
    return () => subscription?.remove();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="OTP" component={OTPScreen} />
          
          <Stack.Screen name="StudentDashboard" component={StudentTabNavigator} />
          <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
          <Stack.Screen name="DoctorQRCode" component={DoctorQRCodeScreen} />
          <Stack.Screen name="ViewAttendance" component={ViewAttendanceScreen} />
          
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="QR" component={QRCodeScreen} />
          <Stack.Screen name="Courses" component={CoursesScreen} />
          <Stack.Screen name="Grades" component={GradesScreen} />
          <Stack.Screen name="MyAttendance" component={MyAttendanceScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          <Stack.Screen name="ManageCourses" component={ManageCoursesScreen} />
          <Stack.Screen name="ManageSchedule" component={ManageScheduleScreen} />
          <Stack.Screen name="ManageGrades" component={ManageGradesScreen} />
          <Stack.Screen name="ManageLibrary" component={ManageLibraryScreen} />
          <Stack.Screen name="SendNotification" component={SendNotificationScreen} />
          <Stack.Screen name="AdminViewAttendance" component={AdminViewAttendanceScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}