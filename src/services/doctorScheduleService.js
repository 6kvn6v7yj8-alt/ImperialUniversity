/**
 * Doctor Schedule Service
 * ربط الدكتور بالمواد والوقت الفعلي
 */
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { getCurrentDay, getCurrentTimeInMinutes, timeToMinutes } from '../utils/timeValidator';

/**
 * جلب جدول الدكتور لليوم مع المواد المرتبطة
 */
export const getDoctorScheduleWithSubjects = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('يجب تسجيل الدخول');

    // 1. جلب بيانات الدكتور
    const doctorDoc = await getDoc(doc(db, 'users', user.uid));
    if (!doctorDoc.exists()) throw new Error('بيانات الدكتور غير موجودة');
    
    const doctorData = doctorDoc.data();
    const doctorSubjects = doctorData.subjects || [];

    // لو مفيش subjects، نحول من البيانات القديمة
    if (doctorSubjects.length === 0 && doctorData.subject) {
      doctorSubjects.push({
        name: doctorData.subject,
        batch: doctorData.batch || 'all',
        schedule: {
          day: getCurrentDay(),
          startTime: '09:00',
          endTime: '10:30'
        }
      });
    }

    // 2. جلب الجدول من schedules collection
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    const allSchedules = schedulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3. ربط مواد الدكتور بالجدول
    const today = getCurrentDay();
    const currentTime = getCurrentTimeInMinutes();

    const doctorSchedule = doctorSubjects.map(subject => {
      // البحث عن جدول المادة
      const scheduleInfo = allSchedules.find(s => 
        (s.subject === subject.name || s.courseName === subject.name) &&
        (s.batch === subject.batch || s.batch === 'all' || subject.batch === 'all')
      ) || subject.schedule || {};

      // حساب حالة المحاضرة
      const startMinutes = timeToMinutes(scheduleInfo.startTime || '09:00');
      const endMinutes = timeToMinutes(scheduleInfo.endTime || '10:30');
      
      let status = 'idle'; // idle, upcoming, active, finished
      let canGenerateQR = false;
      let timeMessage = '';

      if (!scheduleInfo.day || scheduleInfo.day === today || scheduleInfo.dayOfWeek === today) {
        if (currentTime < startMinutes) {
          status = 'upcoming';
          const remaining = startMinutes - currentTime;
          timeMessage = `تبدأ بعد ${Math.floor(remaining/60)}:${(remaining%60).toString().padStart(2, '0')}`;
        } else if (currentTime >= startMinutes && currentTime <= endMinutes) {
          status = 'active';
          canGenerateQR = true;
          const remaining = endMinutes - currentTime;
          timeMessage = `متبقي ${remaining} دقيقة`;
        } else {
          status = 'finished';
          timeMessage = 'انتهت';
        }
      } else {
        timeMessage = `محاضرة ${scheduleInfo.day || scheduleInfo.dayOfWeek}`;
      }

      return {
        // بيانات المادة
        subjectId: subject.id || `sub_${Math.random().toString(36).substr(2, 9)}`,
        subjectName: subject.name,
        subjectCode: subject.code || subject.name,
        
        // بيانات الدكتور
        doctorId: user.uid,
        doctorName: doctorData.name || 'دكتور',
        
        // بيانات الجدول
        scheduleId: scheduleInfo.id || null,
        day: scheduleInfo.day || scheduleInfo.dayOfWeek || today,
        startTime: scheduleInfo.startTime || '09:00',
        endTime: scheduleInfo.endTime || '10:30',
        room: scheduleInfo.room || 'غير محدد',
        
        // بيانات الدفعة
        batch: subject.batch || 'all',
        
        // حالة المحاضرة
        status,
        canGenerateQR,
        timeMessage,
        startMinutes,
        endMinutes,
        isToday: (scheduleInfo.day === today || scheduleInfo.dayOfWeek === today)
      };
    });

    // ترتيب: الجارية أولاً، ثم القادمة، ثم الباقي
    doctorSchedule.sort((a, b) => {
      const order = { active: 0, upcoming: 1, finished: 2, idle: 3 };
      return (order[a.status] || 4) - (order[b.status] || 4);
    });

    return {
      success: true,
      doctorName: doctorData.name,
      schedule: doctorSchedule,
      activeLectures: doctorSchedule.filter(l => l.status === 'active'),
      upcomingLectures: doctorSchedule.filter(l => l.status === 'upcoming'),
      finishedLectures: doctorSchedule.filter(l => l.status === 'finished')
    };

  } catch (error) {
    console.error('Error fetching doctor schedule:', error);
    return { success: false, error: error.message, schedule: [] };
  }
};

/**
 * إضافة مادة للدكتور مع الجدول
 */
export const addSubjectToDoctor = async (doctorId, subjectData) => {
  try {
    const doctorRef = doc(db, 'users', doctorId);
    const doctorDoc = await getDoc(doctorRef);
    
    if (!doctorDoc.exists()) throw new Error('الدكتور غير موجود');
    
    const doctorData = doctorDoc.data();
    const currentSubjects = doctorData.subjects || [];
    
    // إضافة المادة الجديدة
    const newSubject = {
      id: `sub_${Date.now()}`,
      name: subjectData.name,
      code: subjectData.code || subjectData.name,
      batch: subjectData.batch || 'all',
      schedule: {
        day: subjectData.day || 'sunday',
        startTime: subjectData.startTime || '09:00',
        endTime: subjectData.endTime || '10:30',
        room: subjectData.room || 'غير محدد',
        type: subjectData.type || 'lecture'
      }
    };
    
    currentSubjects.push(newSubject);
    
    await updateDoc(doctorRef, {
      subjects: currentSubjects,
      updatedAt: new Date().toISOString()
    });
    
    // إضافة المادة للجدول العام أيضاً
    await addDoc(collection(db, 'schedules'), {
      courseName: newSubject.name,
      subject: newSubject.name,
      code: newSubject.code,
      batch: newSubject.batch,
      day: newSubject.schedule.day,
      dayOfWeek: newSubject.schedule.day,
      startTime: newSubject.schedule.startTime,
      endTime: newSubject.schedule.endTime,
      room: newSubject.schedule.room,
      doctorId: doctorId,
      doctorName: doctorData.name,
      createdAt: new Date().toISOString()
    });
    
    return { success: true, message: '✅ تم إضافة المادة بنجاح' };
  } catch (error) {
    console.error('Error adding subject:', error);
    return { success: false, error: error.message };
  }
};

/**
 * التحقق من صلاحية الدكتور للمادة في الوقت الحالي
 */
export const validateDoctorSubjectAccess = async (subjectName) => {
  try {
    const user = auth.currentUser;
    if (!user) return { valid: false, message: 'يجب تسجيل الدخول' };

    const doctorDoc = await getDoc(doc(db, 'users', user.uid));
    if (!doctorDoc.exists()) return { valid: false, message: 'بيانات الدكتور غير موجودة' };

    const doctorData = doctorDoc.data();
    const subjects = doctorData.subjects || [];
    
    // البحث عن المادة
    const subject = subjects.find(s => s.name === subjectName);
    if (!subject) return { valid: false, message: 'هذه المادة ليست من موادك' };

    // التحقق من الوقت
    const today = getCurrentDay();
    const currentTime = getCurrentTimeInMinutes();
    const schedule = subject.schedule || {};
    
    if (schedule.day !== today && schedule.dayOfWeek !== today) {
      return { 
        valid: false, 
        message: `هذه المادة يوم ${schedule.day || schedule.dayOfWeek} وليس اليوم` 
      };
    }

    const startMinutes = timeToMinutes(schedule.startTime || '09:00');
    const endMinutes = timeToMinutes(schedule.endTime || '10:30');

    if (currentTime < startMinutes) {
      return { valid: false, message: `المحاضرة تبدأ الساعة ${schedule.startTime}` };
    }

    if (currentTime > endMinutes) {
      return { valid: false, message: `انتهت المحاضرة الساعة ${schedule.endTime}` };
    }

    return { 
      valid: true, 
      message: '✅ يمكنك توليد QR Code الآن',
      subject,
      schedule 
    };

  } catch (error) {
    console.error('Error validating access:', error);
    return { valid: false, message: 'حدث خطأ في التحقق' };
  }
};

/**
 * جلب كل مواد الدكتور مع حالتها
 */
export const getAllDoctorSubjects = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('يجب تسجيل الدخول');

    const doctorDoc = await getDoc(doc(db, 'users', user.uid));
    if (!doctorDoc.exists()) throw new Error('بيانات الدكتور غير موجودة');

    const doctorData = doctorDoc.data();
    const subjects = doctorData.subjects || [];

    // لو في بيانات قديمة (subject مفرد)
    if (subjects.length === 0 && doctorData.subject) {
      subjects.push({
        name: doctorData.subject,
        batch: doctorData.batch || 'all',
        schedule: {}
      });
    }

    return { success: true, subjects };
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return { success: false, error: error.message, subjects: [] };
  }
};