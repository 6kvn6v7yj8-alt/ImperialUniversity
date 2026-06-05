import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, 
  ActivityIndicator, Alert, Animated, Dimensions 
} from 'react-native';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function ChangeProfileImageScreen({ navigation }) {
  const [currentImage, setCurrentImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  const user = auth.currentUser;

  useEffect(() => {
    fetchCurrentImage();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();
  };

  const fetchCurrentImage = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentImage(data.photo || null);
      }
    } catch (error) {
      console.log('Error fetching image:', error);
    }
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('تنبيه', 'نحتاج صلاحية الوصول إلى المعرض');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const base64 = result.assets[0].base64;
      return base64 ? `data:image/jpeg;base64,${base64}` : result.assets[0].uri;
    }
    return null;
  };

  const takePhotoFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('تنبيه', 'نحتاج صلاحية الوصول إلى الكاميرا');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const base64 = result.assets[0].base64;
      return base64 ? `data:image/jpeg;base64,${base64}` : result.assets[0].uri;
    }
    return null;
  };

  const updateImage = async (imageUri) => {
    if (!imageUri) return null;
    
    try {
      setUploading(true);
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        photo: imageUri,
        updatedAt: new Date().toISOString(),
      });
      
      return imageUri;
    } catch (error) {
      console.error('خطأ في حفظ الصورة:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSelectImage = async (source) => {
    let imageUri = null;
    
    if (source === 'gallery') {
      imageUri = await pickImageFromGallery();
    } else if (source === 'camera') {
      imageUri = await takePhotoFromCamera();
    }
    
    if (imageUri) {
      try {
        const newImageUrl = await updateImage(imageUri);
        setCurrentImage(newImageUrl);
        Alert.alert('✅ تم بنجاح', 'تم تغيير الصورة الشخصية', [
          { text: 'حسناً', onPress: () => navigation.goBack() }
        ]);
      } catch (error) {
        Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الصورة');
      }
    }
  };

  const handleRemoveImage = async () => {
    Alert.alert(
      'تأكيد',
      'هل أنت متأكد من حذف الصورة الشخصية؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                photo: '',
                updatedAt: new Date().toISOString(),
              });
              setCurrentImage(null);
              Alert.alert('✅ تم الحذف', 'تم حذف الصورة الشخصية');
              navigation.goBack();
            } catch (error) {
              Alert.alert('خطأ', 'حدث خطأ أثناء حذف الصورة');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تغيير الصورة الشخصية</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <Animated.View 
        style={[
          styles.imageContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {currentImage ? (
          <Image source={{ uri: currentImage }} style={styles.profileImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="person" size={80} color="#CBD5E1" />
          </View>
        )}
      </Animated.View>

      <Animated.View style={[styles.optionsContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.option}
          onPress={() => handleSelectImage('gallery')}
          disabled={uploading || loading}
        >
          <View style={styles.optionIcon}>
            <Icon name="photo-library" size={24} color="#4F46E5" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>اختيار من المعرض</Text>
            <Text style={styles.optionSub}>اختر صورة من معرض هاتفك</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.option}
          onPress={() => handleSelectImage('camera')}
          disabled={uploading || loading}
        >
          <View style={styles.optionIcon}>
            <Icon name="camera-alt" size={24} color="#4F46E5" />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionTitle}>التقاط صورة</Text>
            <Text style={styles.optionSub}>التقاط صورة جديدة بالكاميرا</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {currentImage && (
          <TouchableOpacity 
            style={[styles.option, styles.removeOption]}
            onPress={handleRemoveImage}
            disabled={uploading || loading}
          >
            <View style={[styles.optionIcon, styles.removeIcon]}>
              <Icon name="delete" size={24} color="#EF4444" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, styles.removeTitle]}>حذف الصورة</Text>
              <Text style={styles.optionSub}>حذف الصورة الشخصية الحالية</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {(uploading || loading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>
            {uploading ? 'جاري حفظ الصورة...' : 'جاري المعالجة...'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#4F46E5',
  },
  placeholderImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#E2E8F0',
  },
  optionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: '#64748B',
  },
  removeOption: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  removeIcon: {
    backgroundColor: '#FEE2E2',
  },
  removeTitle: {
    color: '#EF4444',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
});