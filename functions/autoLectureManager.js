/**
 * Cloud Functions - Auto Lecture Manager
 * 
 * المهام:
 * 1. بدء المحاضرات تلقائياً مع وقت البداية
 * 2. إنهاء المحاضرات تلقائياً مع وقت النهاية
 * 3. حساب الغياب للطلاب الذين لم يسجلوا حضور
 * 4. إرسال إنذارات للطلاب المتجاوزين نسبة الغياب
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

admin.initializeApp();
const db = getFirestore();

// ========== 1. بدء المحاضرات تلقائياً ==========
exports.autoStartLectures = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('Africa/Cairo')
  .onRun(async (context) => {
    try {
      const now = new Date();
      const currentDay = getCurrentDay();
      const currentTime = getCurrentTimeString();
      
      console.log(`[AutoStart] Checking lectures for ${currentDay} at ${currentTime}`);
      
      // جلب جميع جداول المحاضرات لليوم الحالي
      const schedulesSnap = await db.collection('schedules')
        .where('dayOfWeek', '==', currentDay)
        .where('lectureStatus', '==', 'scheduled')
        .get();
      
      if (schedulesSnap.empty) {
        console.log('[AutoStart] No scheduled lectures to start');
        return null;
      }
      
      const batch = db.batch();
      let startedCount = 0;
      
      schedulesSnap.forEach(doc => {
        const schedule = doc.data();
        const startTime = schedule.startTime;
        
        // التحقق من أن الوقت الحالي = وقت البداية
        if (currentTime === startTime) {
          const scheduleRef = db.collection('schedules').doc(doc.id);
          
          batch.update(scheduleRef, {
            lectureStatus: 'active',
            actualStartTime: FieldValue.serverTimestamp(),
            autoStarted: true,
            updatedAt: FieldValue.serverTimestamp()
          });
          
          // إنشاء سجل محاضرة
          const lectureRef = db.collection('lectures').doc();
          batch.set(lectureRef, {
            scheduleId: doc.id,
            courseId: schedule.courseId || schedule.subject,
            courseName: schedule.courseName || schedule.subject,
            batch: schedule.batch,
            room: schedule.room,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            actualStartTime: FieldValue.serverTimestamp(),
            startedAutomatically: true,
            status: 'active',
            attendanceCount: 0,
            createdAt: FieldValue.serverTimestamp()
          });
          
          startedCount++;
          console.log(`[AutoStart] Started lecture: ${schedule.courseName || schedule.subject}`);
        }
      });
      
      if (startedCount > 0) {
        await batch.commit();
        console.log(`[AutoStart] Successfully started ${startedCount} lectures`);
      }
      
      return { startedCount };
    } catch (error) {
      console.error('[AutoStart] Error:', error);
      return { error: error.message };
    }
  });

// ========== 2. إنهاء المحاضرات وحساب الغياب ==========
exports.autoEndLecturesAndCalculateAbsence = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('Africa/Cairo')
  .onRun(async (context) => {
    try {
      const now = new Date();
      const currentDay = getCurrentDay();
      const currentTime = getCurrentTimeString();
      
      console.log(`[AutoEnd] Checking lectures for ${currentDay} at ${currentTime}`);
      
      // جلب المحاضرات الجارية
      const activeLecturesSnap = await db.collection('schedules')
        .where('dayOfWeek', '==', currentDay)
        .where('lectureStatus', '==', 'active')
        .get();
      
      if (activeLecturesSnap.empty) {
        console.log('[AutoEnd] No active lectures to end');
        return null;
      }
      
      const batch = db.batch();
      let endedCount = 0;
      
      for (const doc of activeLecturesSnap.docs) {
        const schedule = doc.data();
        const endTime = schedule.endTime;
        
        // التحقق من أن الوقت الحالي = وقت النهاية
        if (currentTime === endTime) {
          const scheduleRef = db.collection('schedules').doc(doc.id);
          
          batch.update(scheduleRef, {
            lectureStatus: 'finished',
            actualEndTime: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
          
          // تحديث سجل المحاضرة
          const lecturesSnap = await db.collection('lectures')
            .where('scheduleId', '==', doc.id)
            .where('status', '==', 'active')
            .get();
          
          lecturesSnap.forEach(lectureDoc => {
            batch.update(db.collection('lectures').doc(lectureDoc.id), {
              status: 'finished',
              actualEndTime: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            });
          });
          
          // حساب الطلاب الغائبين
          await calculateAbsentStudents(
            schedule.batch, 
            schedule.courseName || schedule.subject,
            schedule.courseId || schedule.subject,
            batch
          );
          
          endedCount++;
          console.log(`[AutoEnd] Ended lecture: ${schedule.courseName || schedule.subject}`);
        }
      }
      
      if (endedCount > 0) {
        await batch.commit();
        console.log(`[AutoEnd] Successfully ended ${endedCount} lectures`);
      }
      
      return { endedCount };
    } catch (error) {
      console.error('[AutoEnd] Error:', error);
      return { error: error.message };
    }
  });

// ========== 3. حساب الطلاب الغائبين ==========
async function calculateAbsentStudents(batch, courseName, courseId, batchWriter) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // جلب جميع طلاب الدفعة
    const studentsSnap = await db.collection('users')
      .where('batch', '==', batch)
      .where('role', '==', 'student')
      .get();
    
    if (studentsSnap.empty) {
      console.log(`[Absence] No students found for batch ${batch}`);
      return;
    }
    
    // جلب الحضور المسجل اليوم
    const attendanceSnap = await db.collection('attendance')
      .where('courseName', '==', courseName)
      .where('date', '==', today)
      .get();
    
    const presentStudentIds = new Set();
    attendanceSnap.forEach(doc => {
      presentStudentIds.add(doc.data().studentId);
    });
    
    // تسجيل الغائبين
    let absentCount = 0;
    const now = new Date().toISOString();
    
    studentsSnap.forEach(studentDoc => {
      const studentId = studentDoc.id;
      
      if (!presentStudentIds.has(studentId)) {
        const studentData = studentDoc.data();
        
        batchWriter.set(db.collection('attendance').doc(), {
          studentId,
          studentName: studentData.name || 'طالب',
          studentEmail: studentData.email || '',
          studentBatch: studentData.batch || batch,
          studentSpecialization: studentData.specialization || '',
          courseId,
          courseName,
          date: today,
          time: 'نهاية المحاضرة',
          attendanceStatus: 'absent',
          statusText: 'غائب',
          markedAutomatically: true,
          timestamp: now
        });
        
        absentCount++;
      }
    });
    
    console.log(`[Absence] Marked ${absentCount} absent students for ${courseName}`);
  } catch (error) {
    console.error('[Absence] Error:', error);
  }
}

// ========== 4. إرسال إنذارات الغياب ==========
exports.sendAbsenceWarnings = functions.pubsub
  .schedule('every day 08:00')
  .timeZone('Africa/Cairo')
  .onRun(async (context) => {
    try {
      console.log('[Warnings] Starting daily absence warning check...');
      
      const studentsSnap = await db.collection('users')
        .where('role', '==', 'student')
        .get();
      
      if (studentsSnap.empty) {
        console.log('[Warnings] No students found');
        return null;
      }
      
      let warningCount = 0;
      let bannedCount = 0;
      
      for (const studentDoc of studentsSnap.docs) {
        const student = studentDoc.data();
        const studentId = studentDoc.id;
        
        // جلب سجل الحضور
        const attendanceSnap = await db.collection('attendance')
          .where('studentId', '==', studentId)
          .get();
        
        const attendanceRecords = attendanceSnap.docs.map(d => d.data());
        
        // تجميع حسب المادة
        const courseAttendance = {};
        attendanceRecords.forEach(record => {
          const course = record.courseName || record.courseId;
          if (!courseAttendance[course]) {
            courseAttendance[course] = { present: 0, absent: 0, total: 0 };
          }
          
          if (record.attendanceStatus === 'absent') {
            courseAttendance[course].absent++;
          } else {
            courseAttendance[course].present++;
          }
          courseAttendance[course].total++;
        });
        
        // فحص كل مادة
        for (const [course, data] of Object.entries(courseAttendance)) {
          // الحصول على إجمالي المحاضرات من الجدول
          const scheduleSnap = await db.collection('schedules')
            .where('subject', '==', course)
            .where('batch', '==', student.batch)
            .get();
          
          const totalScheduled = scheduleSnap.size || 16;
          const absencePercentage = Math.round((data.absent / totalScheduled) * 100);
          
          // إنشاء إنذار إذا تجاوز النسبة
          if (absencePercentage >= 25) {
            // حرمان
            await createWarning(studentId, student, course, absencePercentage, 'banned');
            bannedCount++;
          } else if (absencePercentage >= 20) {
            // إنذار أخير
            await createWarning(studentId, student, course, absencePercentage, 'danger');
            warningCount++;
          } else if (absencePercentage >= 15) {
            // تنبيه
            await createWarning(studentId, student, course, absencePercentage, 'warning');
            warningCount++;
          }
        }
      }
      
      console.log(`[Warnings] Created ${warningCount} warnings, ${bannedCount} bans`);
      return { warningCount, bannedCount };
    } catch (error) {
      console.error('[Warnings] Error:', error);
      return { error: error.message };
    }
  });

// ========== دوال مساعدة ==========
function getCurrentDay() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function getCurrentTimeString() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

async function createWarning(studentId, student, course, percentage, level) {
  try {
    const messages = {
      'banned': `🚫 حرمان من امتحان ${course} - نسبة الغياب ${percentage}%`,
      'danger': `⚠️ إنذار أخير في ${course} - نسبة الغياب ${percentage}%`,
      'warning': `⚡ تنبيه في ${course} - نسبة الغياب ${percentage}%`
    };
    
    await db.collection('warnings').add({
      studentId,
      studentName: student.name,
      studentEmail: student.email,
      studentBatch: student.batch,
      courseName: course,
      absencePercentage: percentage,
      level,
      message: messages[level] || `غياب ${percentage}% في ${course}`,
      read: false,
      createdAt: FieldValue.serverTimestamp()
    });
    
    console.log(`[Warning] Created ${level} warning for ${student.name} in ${course}`);
  } catch (error) {
    console.error('[Warning] Error creating warning:', error);
  }
}