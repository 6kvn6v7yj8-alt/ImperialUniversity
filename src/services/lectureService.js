/**
 * Lecture Service
 * خدمة إدارة المحاضرات وجلب الجدول الدراسي
 */
import { collection, getDocs, doc, getDoc, query, where, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { getCurrentDay, getCurrentTimeInMinutes, timeToMinutes } from '../utils/timeValidator';

/**
 * جلب جدول محاضرات اليوم للدكتور
 */
export const getDoctorTodayLectures = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('يجب تسجيل الدخول');
    
    // جلب بيانات الدكتور
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('بيانات الدكتور غير موجودة');
    
    const doctorData = userDoc.data();
    const doctorSubjects = doctorData.subjects || [];
    
    if (doctorSubjects.length === 0) {
      // محاولة استخدام subject المفرد
      if (doctorData.subject) {
        doctorSubjects.push({ name: doctorData.subject, batch: doctorData.batch || 'all' });
      }
    }
    
    // جلب الجدول
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    const allSchedules = schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const today = getCurrentDay();
    const currentTime = getCurrentTimeInMinutes();
    
    // تصفية محاضرات اليوم الخاصة بالدكتور
    const todayLectures = allSchedules
      .filter(schedule => {
        // تطابق اليوم
        if (schedule.dayOfWeek !== today && schedule.day !== today) return false;
        
        // تطابق المادة مع مواد الدكتور
        const isDoctorSubject = doctorSubjects.some(
          subj => subj.name === schedule.subject || subj.name === schedule.courseName
        );
        
        return isDoctorSubject;
      })
      .map(schedule => {
        const startMinutes = timeToMinutes(schedule.startTime);
        const endMinutes = timeToMinutes(schedule.endTime);
        
        let lectureStatus = 'upcoming'; // قادمة
        if (currentTime >= startMinutes && currentTime <= endMinutes) {
          lectureStatus = 'active'; // جارية
        } else if (currentTime > endMinutes) {
          lectureStatus = 'finished'; // منتهية
        }
        
        return {
          ...schedule,
          lectureStatus,
          startMinutes,
          endMinutes,
          canGenerateQR: lectureStatus === 'active',
          timeUntilStart: startMinutes - currentTime,
          timeUntilEnd: endMinutes - currentTime
        };
      })
      .sort((a, b) => {
        // ترتيب: الجارية أولاً، ثم القادمة، ثم المنتهية
        const order = { active: 0, upcoming: 1, finished: 2 };
        return order[a.lectureStatus] - order[b.lectureStatus];
      });
    
    return {
      success: true,
      lectures: todayLectures,
      activeLecture: todayLectures.find(l => l.lectureStatus === 'active'),
      upcomingLectures: todayLectures.filter(l => l.lectureStatus === 'upcoming'),
      finishedLectures: todayLectures.filter(l => l.lectureStatus === 'finished')
    };
  } catch (error) {
    console.error('Error fetching doctor lectures:', error);
    return { success: false, error: error.message, lectures: [] };
  }
};

/**
 * جلب جدول محاضرات اليوم لدفعة معينة
 */
export const getBatchTodayLectures = async (batch) => {
  try {
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    const allSchedules = schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const today = getCurrentDay();
    const currentTime = getCurrentTimeInMinutes();
    
    const batchLectures = allSchedules
      .filter(schedule => {
        if (schedule.dayOfWeek !== today && schedule.day !== today) return false;
        return schedule.batch === batch || schedule.batch === 'all';
      })
      .map(schedule => {
        const startMinutes = timeToMinutes(schedule.startTime);
        const endMinutes = timeToMinutes(schedule.endTime);
        
        let status = 'upcoming';
        if (currentTime >= startMinutes && currentTime <= endMinutes) {
          status = 'active';
        } else if (currentTime > endMinutes) {
          status = 'finished';
        }
        
        return {
          ...schedule,
          lectureStatus: status,
          startMinutes,
          endMinutes
        };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);
    
    return { success: true, lectures: batchLectures };
  } catch (error) {
    console.error('Error fetching batch lectures:', error);
    return { success: false, error: error.message, lectures: [] };
  }
};

/**
 * بدء محاضرة وتسجيل وقت البداية الفعلي
 */
export const startLecture = async (scheduleId) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('يجب تسجيل الدخول');
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // تحديث حالة المحاضرة في الجدول
    await updateDoc(doc(db, 'schedules', scheduleId), {
      lectureStatus: 'active',
      actualStartTime: new Date().toISOString(),
      startedBy: user.uid,
      startedByName: userData.name || 'دكتور',
      startedByRole: userData.role || 'doctor'
    });
    
    // إنشاء سجل محاضرة في مجموعة lectures
    const scheduleDoc = await getDoc(doc(db, 'schedules', scheduleId));
    const scheduleData = scheduleDoc.data();
    
    await addDoc(collection(db, 'lectures'), {
      scheduleId,
      courseId: scheduleData.courseId || scheduleData.subject,
      courseName: scheduleData.courseName || scheduleData.subject,
      batch: scheduleData.batch,
      room: scheduleData.room,
      startTime: scheduleData.startTime,
      endTime: scheduleData.endTime,
      actualStartTime: serverTimestamp(),
      startedBy: user.uid,
      startedByName: userData.name || 'دكتور',
      status: 'active',
      attendanceCount: 0,
      qrCodes: [],
      createdAt: serverTimestamp()
    });
    
    return { success: true, message: '✅ تم بدء المحاضرة' };
  } catch (error) {
    console.error('Error starting lecture:', error);
    return { success: false, error: error.message };
  }
};

/**
 * إنهاء المحاضرة
 */
export const endLecture = async (scheduleId) => {
  try {
    await updateDoc(doc(db, 'schedules', scheduleId), {
      lectureStatus: 'finished',
      actualEndTime: new Date().toISOString()
    });
    
    return { success: true, message: '✅ تم إنهاء المحاضرة' };
  } catch (error) {
    console.error('Error ending lecture:', error);
    return { success: false, error: error.message };
  }
};