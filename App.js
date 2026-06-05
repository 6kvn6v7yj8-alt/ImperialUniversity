import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { registerForPushNotifications, addNotificationListener } from './src/services/notifications';

// Auth Screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/auth/OnboardingScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import OTPScreen from './src/screens/auth/OTPScreen';

// Student Screens
import StudentTabNavigator from './src/navigation/StudentTabNavigator';
import CoursesScreen from './src/screens/student/CoursesScreen';
import GradesScreen from './src/screens/student/GradesScreen';
import MyAttendanceScreen from './src/screens/student/MyAttendanceScreen';
import PaymentScreen from './src/screens/student/PaymentScreen';
import QRCodeScreen from './src/screens/student/QRCodeScreen';
import WarningsScreen from './src/screens/student/WarningsScreen';

// Doctor Screens
import DoctorDashboardScreen from './src/screens/doctor/DoctorDashboardScreen';
import DoctorQRCodeScreen from './src/screens/doctor/DoctorQRCodeScreen';
import DoctorLectureControlScreen from './src/screens/doctor/DoctorLectureControlScreen';
import ViewAttendanceScreen from './src/screens/doctor/ViewAttendanceScreen';
import DoctorProfileScreen from './src/screens/doctor/DoctorProfileScreen';

// Leader Screens
import LeaderQRScreen from './src/screens/leader/LeaderQRScreen';
import LeaderLectureControlScreen from './src/screens/leader/LeaderLectureControlScreen';
import LeaderDashboardScreen from './src/screens/leader/LeaderDashboardScreen';

// Admin Screens
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import ManageCoursesScreen from './src/screens/admin/ManageCoursesScreen';
import ManageScheduleScreen from './src/screens/admin/ManageScheduleScreen';
import ManageGradesScreen from './src/screens/admin/ManageGradesScreen';
import ManageLibraryScreen from './src/screens/admin/ManageLibraryScreen';
import SendNotificationScreen from './src/screens/admin/SendNotificationScreen';
import AdminViewAttendanceScreen from './src/screens/admin/AdminViewAttendanceScreen';
import AdminLiveAttendanceScreen from './src/screens/admin/AdminLiveAttendanceScreen';
import AdminProfileScreen from './src/screens/admin/AdminProfileScreen';
import ViewDoctorsScreen from './src/screens/admin/ViewDoctorsScreen';
import ViewLeadersScreen from './src/screens/admin/ViewLeadersScreen';
import ViewStudentsScreen from './src/screens/admin/ViewStudentsScreen';

// Shared Screens
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import ChatScreen from './src/screens/shared/ChatScreen';
import EditProfileScreen from './src/screens/shared/EditProfileScreen';
import AboutScreen from './src/screens/shared/AboutScreen';
import SecuritySettingsScreen from './src/screens/shared/SecuritySettingsScreen';
import AIChatScreen from './src/screens/shared/AIChatScreen';
import ChangeProfileImageScreen from './src/screens/shared/ChangeProfileImageScreen';
import ManageDoctorSubjectsScreen from './src/screens/admin/ManageDoctorSubjectsScreen';
import SuperAdminDashboard from './src/screens/superadmin/SuperAdminDashboard';
import DailyReportScreen from './src/screens/superadmin/DailyReportScreen';
import ActivateAccountsScreen from './src/screens/admin/ActivateAccountsScreen';
import ActivateLeaderAccountsScreen from './src/screens/leader/ActivateLeaderAccountsScreen';
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
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              animation: 'slide_from_right',
              animationDuration: 400,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              fullScreenGestureEnabled: true,
            }}
          >
            {/* ========== SPLASH & ONBOARDING ========== */}
            <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade_from_bottom', animationDuration: 600 }} />
            
            {/* ========== AUTH ========== */}
            <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'slide_from_bottom', animationDuration: 500 }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_left' }} />
            <Stack.Screen name="OTP" component={OTPScreen} options={{ animation: 'fade' }} />
            
            {/* ========== STUDENT ========== */}
            <Stack.Screen name="StudentDashboard" component={StudentTabNavigator} options={{ animation: 'fade', animationDuration: 300 }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="QR" component={QRCodeScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Courses" component={CoursesScreen} />
            <Stack.Screen name="Grades" component={GradesScreen} />
            <Stack.Screen name="MyAttendance" component={MyAttendanceScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'slide_from_left' }} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Warnings" component={WarningsScreen} />
            
            {/* ========== DOCTOR ========== */}
            <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} options={{ animation: 'fade', animationDuration: 300 }} />
            <Stack.Screen name="DoctorQRCode" component={DoctorQRCodeScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="DoctorLectureControl" component={DoctorLectureControlScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="ViewAttendance" component={ViewAttendanceScreen} />
            <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} />
            
            {/* ========== LEADER ========== */}
            <Stack.Screen name="LeaderQR" component={LeaderQRScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="LeaderLectureControl" component={LeaderLectureControlScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="LeaderDashboard" component={LeaderDashboardScreen} />
            {/* ========== ADMIN ========== */}
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ animation: 'fade', animationDuration: 300 }} />
            <Stack.Screen name="ManageCourses" component={ManageCoursesScreen} />
            <Stack.Screen name="ManageSchedule" component={ManageScheduleScreen} />
            <Stack.Screen name="ManageGrades" component={ManageGradesScreen} />
            <Stack.Screen name="ManageLibrary" component={ManageLibraryScreen} />
            <Stack.Screen name="SendNotification" component={SendNotificationScreen} />
            <Stack.Screen name="AdminViewAttendance" component={AdminViewAttendanceScreen} />
            <Stack.Screen name="AdminLiveAttendance" component={AdminLiveAttendanceScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
            <Stack.Screen name="ViewDoctors" component={ViewDoctorsScreen} />
            <Stack.Screen name="ViewLeaders" component={ViewLeadersScreen} />
            <Stack.Screen name="ViewStudents" component={ViewStudentsScreen} />
            
            {/* ========== SHARED ========== */}
            <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
            <Stack.Screen name="AIChat" component={AIChatScreen} />
            <Stack.Screen name="ChangeProfileImage" component={ChangeProfileImageScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ManageDoctorSubjects" component={ManageDoctorSubjectsScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="SuperAdminDashboard" component={SuperAdminDashboard} />
<Stack.Screen name="DailyReport" component={DailyReportScreen} />
<Stack.Screen name="ActivateAccounts" component={ActivateAccountsScreen} />
<Stack.Screen name="ActivateLeaderAccounts" component={ActivateLeaderAccountsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}