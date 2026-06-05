import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

const LOCATION_TASK = 'background-location-task';

// تعريف المهمة الخلفية لتتبع الموقع
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'locations', user.uid), {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: new Date().toISOString(),
            uid: user.uid,
            email: user.email || '',
          }, { merge: true });
        } catch (err) {
          console.error('Save location error:', err);
        }
      }
    }
  }
});

// بدء تتبع الموقع
export async function startLocationTracking() {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.log('Foreground permission denied');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.log('Background permission denied');
      return false;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 30000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: '📍 تتبع الموقع',
        notificationBody: 'التطبيق يتتبع موقعك للجامعة',
        notificationColor: '#1E40AF',
      },
    });

    console.log('Location tracking started');
    return true;
  } catch (error) {
    console.error('Start tracking error:', error);
    return false;
  }
}

// إيقاف تتبع الموقع
export async function stopLocationTracking() {
  try {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    console.log('Location tracking stopped');
  } catch (error) {
    console.error('Stop tracking error:', error);
  }
}

// الحصول على موقع حالي (مرة واحدة)
export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Get current location error:', error);
    return null;
  }
}