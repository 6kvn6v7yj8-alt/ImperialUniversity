import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const storage = getStorage();
const db = getFirestore();
const auth = getAuth();

// طلب صلاحية المكتبة
export const requestMediaLibraryPermission = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('عذراً، نحتاج إلى صلاحية الوصول إلى المعرض لتغيير الصورة الشخصية');
    return false;
  }
  return true;
};

// طلب صلاحية الكاميرا
export const requestCameraPermission = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    alert('عذراً، نحتاج إلى صلاحية الوصول إلى الكاميرا لتغيير الصورة الشخصية');
    return false;
  }
  return true;
};

// اختيار صورة من المعرض
export const pickImageFromGallery = async () => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: false,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }
  return null;
};

// التقاط صورة من الكاميرا
export const takePhotoFromCamera = async () => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
    base64: false,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }
  return null;
};

// رفع الصورة إلى Firebase Storage
export const uploadProfileImage = async (imageUri, userId) => {
  try {
    if (!imageUri) throw new Error('لا توجد صورة للرفع');
    if (!userId) throw new Error('معرف المستخدم مطلوب');

    // إنشاء اسم فريد للصورة
    const fileName = `profile_${userId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `profileImages/${fileName}`);

    // تحويل الصورة إلى blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // رفع الصورة
    await uploadBytes(storageRef, blob);
    
    // الحصول على رابط التحميل
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('خطأ في رفع الصورة:', error);
    throw error;
  }
};

// تحديث رابط الصورة في Firestore
export const updateUserProfileImage = async (userId, imageUrl) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      profileImage: imageUrl,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('خطأ في تحديث الصورة:', error);
    throw error;
  }
};

// تغيير الصورة الشخصية (اختيار + رفع + تحديث)
export const changeProfilePicture = async (userId, source = 'gallery') => {
  let imageUri = null;
  
  if (source === 'gallery') {
    imageUri = await pickImageFromGallery();
  } else if (source === 'camera') {
    imageUri = await takePhotoFromCamera();
  }
  
  if (!imageUri) return null;
  
  // رفع الصورة
  const imageUrl = await uploadProfileImage(imageUri, userId);
  
  // تحديث قاعدة البيانات
  await updateUserProfileImage(userId, imageUrl);
  
  return imageUrl;
};