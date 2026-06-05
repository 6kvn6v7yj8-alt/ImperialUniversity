import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// إعدادات الإشعارات
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldVibrate: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

// تسجيل الجهاز للإشعارات
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('يجب استخدام جهاز حقيقي للإشعارات');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert('تنبيه', 'لم يتم منح صلاحية الإشعارات');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'الإشعارات العامة',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E40AF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('activation', {
        name: 'تفعيل الحساب',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
      });
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '867091807986',
    });

    return token.data;
  } catch (error) {
    console.log('خطأ في تسجيل الإشعارات:', error);
    return null;
  }
}

// إرسال إشعار فوري (محلي)
export async function sendLocalNotification(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        vibrate: [0, 250, 250, 250],
        color: '#1E40AF',
        badge: 1,
      },
      trigger: null,
    });
  } catch (error) {
    console.log('خطأ في الإشعار:', error);
  }
}

// ✅ إرسال إشعار عن طريق Expo Push API (للأجهزة التانية - عن بعد)
export async function sendPushNotificationToUser(expoPushToken, title, body, data = {}) {
  if (!expoPushToken) {
    console.log('No push token available');
    return null;
  }

  try {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
      priority: 'high',
      channelId: 'default',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return null;
  }
}

// ✅ إرسال إشعار تفعيل الحساب للطالب
export async function sendActivationNotification(studentId) {
  try {
    const studentDoc = await getDoc(doc(db, 'users', studentId));
    
    if (studentDoc.exists()) {
      const student = studentDoc.data();
      const token = student.expoPushToken;
      
      if (token) {
        // إرسال push notification عن بعد
        await sendPushNotificationToUser(
          token,
          '🎉 تم تفعيل حسابك!',
          `مرحباً ${student.name || 'طالب'}، تم تفعيل حسابك في Imperial University. يمكنك الآن تسجيل الدخول.`,
          { type: 'activation', studentId }
        );
        console.log('Activation notification sent to:', student.name);
      } else {
        console.log('No push token for student:', student.name);
        // إرسال إشعار محلي كبديل
        await sendLocalNotification(
          '🎉 تم تفعيل حسابك!',
          `مرحباً ${student.name || 'طالب'}، تم تفعيل حسابك. يمكنك الآن تسجيل الدخول.`
        );
      }
    }
  } catch (error) {
    console.error('Error sending activation notification:', error);
  }
}

// إرسال إشعار مجدول
export async function sendScheduledNotification(title, body, seconds, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        vibrate: [0, 250, 250, 250],
        color: '#1E40AF',
      },
      trigger: { seconds, channelId: 'default' },
    });
  } catch (error) {
    console.log('خطأ في جدولة الإشعار:', error);
  }
}

// إرسال إشعار في وقت محدد
export async function sendScheduledAtNotification(title, body, date, data = {}) {
  try {
    const trigger = new Date(date);
    if (trigger.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          vibrate: [0, 250, 250, 250],
          color: '#1E40AF',
        },
        trigger: { date: trigger, channelId: 'default' },
      });
    }
  } catch (error) {
    console.log('خطأ في جدولة الإشعار:', error);
  }
}

// إشعار نتيجة جديدة
export async function sendGradeNotification(subject, score) {
  await sendLocalNotification(
    '📊 نتيجة جديدة',
    `تم رفع نتيجة ${subject}: ${score} درجة`,
    { type: 'grade', subject, score }
  );
}

// إشعار حضور
export async function sendAttendanceNotification(status) {
  await sendLocalNotification(
    '✅ تسجيل الحضور',
    status === 'present' ? 'تم تسجيل حضورك بنجاح' : 'تم تسجيل غيابك',
    { type: 'attendance', status }
  );
}

// إشعار محاضرة قادمة
export async function sendLectureReminder(subject, time, room) {
  await sendLocalNotification(
    '📅 تذكير بمحاضرة',
    `${subject} - ${time} - ${room}`,
    { type: 'lecture', subject, time, room }
  );
}

// إشعار دفعة مالية
export async function sendPaymentReminder(amount, dueDate) {
  await sendLocalNotification(
    '💰 تذكير بدفع',
    `عليك دفعة بقيمة ${amount} ريال قبل ${dueDate}`,
    { type: 'payment', amount, dueDate }
  );
}

// إشعار ترحيب
export async function sendWelcomeNotification(name) {
  await sendLocalNotification(
    '🎓 مرحباً بك في Imperial University',
    `أهلاً ${name}! نتمنى لك فصلاً دراسياً موفقاً.`,
    { type: 'welcome', name }
  );
}

// إلغاء جميع الإشعارات المجدولة
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// الحصول على جميع الإشعارات المجدولة
export async function getAllScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// إضافة مستمع للإشعارات الواردة
export function addNotificationListener(callback) {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    callback(notification);
  });
  return subscription;
}

// إضافة مستمع للنقر على الإشعار
export function addResponseListener(callback) {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    callback(response);
  });
  return subscription;
}

// تعيين عدد الشارة
export async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}