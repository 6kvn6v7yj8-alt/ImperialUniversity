import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';

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
    // صلاحيات الإشعارات
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

    // إعداد قناة الإشعارات للأندرويد
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'الإشعارات العامة',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E40AF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('grades', {
        name: 'النتائج',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('attendance', {
        name: 'الحضور',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
        sound: 'default',
      });
    }

    // الحصول على توكن الإشعارات
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '867091807986',
    });

    return token.data;
  } catch (error) {
    console.log('خطأ في تسجيل الإشعارات:', error);
    return null;
  }
}

// إرسال إشعار فوري
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
      trigger: null, // فوري
    });
  } catch (error) {
    console.log('خطأ في الإشعار:', error);
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
      trigger: {
        seconds: seconds,
        channelId: 'default',
      },
    });
  } catch (error) {
    console.log('خطأ في جدولة الإشعار:', error);
  }
}

// إرسال إشعار في وقت محدد
export async function sendScheduledAtNotification(title, body, date, data = {}) {
  try {
    const trigger = new Date(date);
    trigger.setHours(trigger.getHours() - 1); // قبل الموعد بساعة
    
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
        trigger: {
          date: trigger,
          channelId: 'default',
        },
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
    `عليك دفعة بقيمة ${amount} ج.م قبل ${dueDate}`,
    { type: 'payment', amount, dueDate }
  );
}

// إشعار ترحيب
export async function sendWelcomeNotification(name) {
  await sendLocalNotification(
    '🎓 مرحباً بك في جامعة إمبريال',
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