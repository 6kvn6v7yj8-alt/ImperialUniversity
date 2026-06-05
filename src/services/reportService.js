import { collection, getDocs, query, where, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const generateDailyReport = async () => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const todayStart = today + 'T00:00:00.000Z';

  const report = {
    date: today,
    time: now.toLocaleTimeString('ar-SA'),
    generatedAt: now.toISOString(),
    sections: {}
  };

  try {
    // 1. المستخدمين
    const usersSnap = await getDocs(collection(db, 'users'));
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const onlineUsers = users.filter(u => u.lastSeen && new Date(u.lastSeen) > new Date(now - 30 * 60000));
    
    report.sections.users = {
      total: users.length,
      students: users.filter(u => u.role === 'student').length,
      doctors: users.filter(u => u.role === 'doctor').length,
      leaders: users.filter(u => u.role === 'leader').length,
      admins: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
      newToday: users.filter(u => u.createdAt && u.createdAt >= todayStart).length,
      onlineNow: onlineUsers.length,
      onlineStudents: onlineUsers.filter(u => u.role === 'student').length,
      onlineDoctors: onlineUsers.filter(u => u.role === 'doctor').length,
      onlineAdmins: onlineUsers.filter(u => u.role === 'admin' || u.role === 'superadmin').length,
      byBatch: { A: users.filter(u => u.batch === 'A').length, B: users.filter(u => u.batch === 'B').length, C: users.filter(u => u.batch === 'C').length, D: users.filter(u => u.batch === 'D').length }
    };

    // 2. نشاط الدكاترة
    const doctorActivity = [];
    const doctors = users.filter(u => u.role === 'doctor');
    const schedulesSnap = await getDocs(collection(db, 'schedules'));
    const schedules = schedulesSnap.docs.map(d => d.data());
    const todayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];
    const todayLectures = schedules.filter(s => (s.day || s.dayOfWeek) === todayName);
    
    for (const doc of doctors) {
      const docLectures = todayLectures.filter(l => 
        doc.subjects?.some(s => s.name === (l.subject || l.courseName))
      );
      const attendanceSnap = await getDocs(query(collection(db, 'attendance'), where('doctorName', '==', doc.name), where('date', '==', today)));
      doctorActivity.push({
        name: doc.name,
        email: doc.email,
        subjectsCount: doc.subjects?.length || 0,
        lecturesToday: docLectures.length,
        activeLectures: docLectures.filter(l => l.lectureStatus === 'active').length,
        cancelledLectures: docLectures.filter(l => l.lectureStatus === 'cancelled').length,
        completedLectures: docLectures.filter(l => l.lectureStatus === 'finished').length,
        attendanceRecorded: attendanceSnap.size,
        isOnline: onlineUsers.some(u => u.id === doc.id),
        lastSeen: doc.lastSeen || null
      });
    }

    report.sections.doctorActivity = doctorActivity;

    // 3. نشاط الإدارة
    const adminActivity = users.filter(u => u.role === 'admin' || u.role === 'superadmin').map(a => ({
      name: a.name,
      email: a.email,
      role: a.role === 'superadmin' ? 'مدير عام' : 'مدير',
      isOnline: onlineUsers.some(u => u.id === a.id),
      lastSeen: a.lastSeen || null,
      actionsToday: 0
    }));

    report.sections.adminActivity = adminActivity;

    // 4. المحاضرات
    report.sections.lectures = {
      totalScheduled: schedules.length,
      todayTotal: todayLectures.length,
      todayActive: todayLectures.filter(l => l.lectureStatus === 'active').length,
      todayCompleted: todayLectures.filter(l => l.lectureStatus === 'finished').length,
      todayCancelled: todayLectures.filter(l => l.lectureStatus === 'cancelled').length,
      todayPending: todayLectures.filter(l => !l.lectureStatus || l.lectureStatus === 'scheduled').length,
      cancelledList: todayLectures.filter(l => l.lectureStatus === 'cancelled').map(l => ({
        subject: l.subject || l.courseName,
        startTime: l.startTime,
        room: l.room,
        batch: l.batch
      })),
      activeList: todayLectures.filter(l => l.lectureStatus === 'active').map(l => ({
        subject: l.subject || l.courseName,
        startTime: l.startTime,
        endTime: l.endTime,
        room: l.room,
        batch: l.batch
      }))
    };

    // 5. الحضور
    const attendanceSnap = await getDocs(query(collection(db, 'attendance'), where('date', '==', today)));
    const attendance = attendanceSnap.docs.map(d => d.data());
    
    report.sections.attendance = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present' || a.attendanceStatus === 'present').length,
      late: attendance.filter(a => a.status === 'late' || a.attendanceStatus === 'late').length,
      absent: attendance.filter(a => a.status === 'absent' || a.attendanceStatus === 'absent').length,
      attendanceRate: attendance.length > 0 ? Math.round((attendance.filter(a => a.status === 'present' || a.attendanceStatus === 'present').length / attendance.length) * 100) : 0,
      byDoctor: groupBy(attendance, 'doctorName'),
      byCourse: groupBy(attendance, 'courseName'),
      byBatch: groupBy(attendance, 'studentBatch')
    };

    // 6. النتائج
    const gradesSnap = await getDocs(query(collection(db, 'grades'), where('createdAt', '>=', todayStart)));
    report.sections.grades = {
      addedToday: gradesSnap.size,
      total: (await getDocs(collection(db, 'grades'))).size
    };

    // 7. المدفوعات
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    const payments = paymentsSnap.docs.map(d => d.data());
    const todayPayments = payments.filter(p => p.date === today);
    report.sections.payments = {
      total: payments.length,
      todayCount: todayPayments.length,
      todayAmount: todayPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      totalPaid: payments.filter(p => p.status === 'paid').length,
      totalPending: payments.filter(p => p.status === 'pending').length
    };

    // 8. الإشعارات
    const notifSnap = await getDocs(query(collection(db, 'notifications'), where('sentAt', '>=', todayStart)));
    report.sections.notifications = {
      sentToday: notifSnap.size
    };

    // 9. الشكاوى
    const complaintsSnap = await getDocs(query(collection(db, 'complaints'), where('createdAt', '>=', todayStart)));
    report.sections.complaints = {
      newToday: complaintsSnap.size,
      pending: complaintsSnap.docs.filter(d => d.data().status === 'pending').length,
      resolved: complaintsSnap.docs.filter(d => d.data().status === 'resolved').length
    };

    // 10. المكتبة
    const librarySnap = await getDocs(collection(db, 'library'));
    report.sections.library = {
      totalBooks: librarySnap.size
    };

    // 11. ملخص
    report.summary = {
      totalOperations: attendance.length + report.sections.grades.addedToday + todayPayments.length + notifSnap.size,
      onlineNow: onlineUsers.length,
      activeDoctors: doctorActivity.filter(d => d.activeLectures > 0).length,
      activeLectures: todayLectures.filter(l => l.lectureStatus === 'active').length,
      cancelledLectures: todayLectures.filter(l => l.lectureStatus === 'cancelled').length,
      attendanceRate: report.sections.attendance.attendanceRate,
      totalStudents: report.sections.users.students,
      totalDoctors: report.sections.users.doctors
    };

    return { success: true, report };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
};

function groupBy(arr, key) {
  const result = {};
  arr.forEach(item => {
    const val = item[key] || 'غير معروف';
    result[val] = (result[val] || 0) + 1;
  });
  return result;
}

export const saveReportToFirestore = async (report) => {
  try {
    const docRef = await (await import('firebase/firestore')).addDoc(collection(db, 'daily_reports'), report);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getPreviousReports = async (days = 7) => {
  try {
    const snap = await getDocs(query(collection(db, 'daily_reports'), orderBy('generatedAt', 'desc'), limit(days)));
    return { success: true, reports: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  } catch (error) {
    try {
      const snap = await getDocs(collection(db, 'daily_reports'));
      const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      reports.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
      return { success: true, reports: reports.slice(0, days) };
    } catch(e) {
      return { success: false, error: e.message, reports: [] };
    }
  }
};