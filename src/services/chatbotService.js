import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

async function getStudentData() {
  const user = auth.currentUser;
  if (!user) return null;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.exists() ? userDoc.data() : {};

  const attSnap = await getDocs(collection(db, 'attendance'));
  const attendance = attSnap.docs.map(d => d.data()).filter(a => a.studentId === user.uid);

  const scheduleSnap = await getDocs(collection(db, 'schedules'));
  const schedules = scheduleSnap.docs.map(d => d.data())
    .filter(s => s.batch === userData.batch || s.batch === 'all' || !s.batch);

  const gradesSnap = await getDocs(collection(db, 'grades'));
  const grades = gradesSnap.docs.map(d => d.data());

  const coursesSnap = await getDocs(collection(db, 'courses'));
  const courses = coursesSnap.docs.map(d => d.data())
    .filter(c => c.batch === userData.batch || c.batch === 'all' || !c.batch);

  return { userData, attendance, schedules, grades, courses };
}

export async function askGemini(question) {
  try {
    const data = await getStudentData();
    if (!data) return { success: false, reply: 'سجل دخولك أولاً' };

    const q = question.toLowerCase().trim();
    const { userData, attendance, schedules, grades, courses } = data;

    if (q.includes('غياب') || q.includes('نسبة') || q.includes('حضور')) {
      let reply = '📊 نسبة حضورك:\n\n';
      courses.forEach(c => {
        const att = attendance.filter(a => a.courseName === c.name).length;
        const pct = Math.round((att / 14) * 100);
        const emoji = pct >= 80 ? '🟢' : pct >= 60 ? '🟡' : '🔴';
        reply += `${emoji} ${c.name}: ${att}/14 (${pct}%)\n`;
      });
      return { success: true, reply };
    }

    if (q.includes('محاضرة') || q.includes('قادم') || q.includes('بعدي')) {
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const today = new Date().getDay();
      const upcoming = schedules.find(s => days.indexOf(s.day) >= today) || schedules[0];
      if (upcoming) {
        return { success: true, reply: `📅 محاضرتك القادمة:\n\n📚 ${upcoming.subject}\n🕐 ${upcoming.time}\n📍 ${upcoming.room}\n📅 ${upcoming.day}` };
      }
      return { success: true, reply: 'لا توجد محاضرات قادمة.' };
    }

    if (q.includes('دكتور') || q.includes('دكاترة') || q.includes('يدرس')) {
      const doctors = [...new Set(courses.map(c => c.doctor).filter(Boolean))];
      return { success: true, reply: `👨‍🏫 دكاترتك:\n\n${doctors.map(d => '• ' + d).join('\n')}` };
    }

    if (q.includes('عدد') || q.includes('مواد') || q.includes('كم مادة')) {
      return { success: true, reply: `📚 عدد موادك: ${courses.length}\n\n${courses.map(c => '• ' + c.name + ' (' + c.code + ')').join('\n')}` };
    }

    if (q.includes('نتيجة') || q.includes('درجة') || q.includes('علامة')) {
      if (grades.length === 0) return { success: true, reply: 'لا توجد نتائج مسجلة لك بعد.' };
      let reply = '📊 نتائجك:\n\n';
      grades.forEach(g => { reply += `• ${g.subject}: ${g.score} (${g.grade})\n`; });
      return { success: true, reply };
    }

    if (q.includes('جدول') || q.includes('مواعيد')) {
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
      let reply = '📅 جدولك الدراسي:\n\n';
      days.forEach(day => {
        const daySchedule = schedules.filter(s => s.day === day);
        if (daySchedule.length > 0) {
          reply += `**${day}:**\n`;
          daySchedule.forEach(s => { reply += `  📚 ${s.subject} - 🕐 ${s.time} - 📍 ${s.room}\n`; });
        }
      });
      return { success: true, reply };
    }

    if (q.includes('نصيحة') || q.includes('مذاكرة') || q.includes('دراسة') || q.includes('تحسين') || q.includes('معدل')) {
      return { success: true, reply: '📝 نصائح للمذاكرة:\n\n• قسم وقتك: 25 دقيقة مذاكرة + 5 دقائق راحة\n• راجع المحاضرات أول بأول\n• استخدم الخرائط الذهنية للملخصات\n• نام كويس قبل الامتحان\n• اسأل دكتورك عن أي نقطة مش فاهمها' };
    }

    if (q.includes('مساعدة') || q.includes('help') || q.includes('بتعمل') || q.includes('تقدر')) {
      return { success: true, reply: '🤖 أقدر أساعدك في:\n\n• "كم غيابي؟"\n• "محاضرتي القادمة؟"\n• "من هم دكاترتي؟"\n• "كم عدد موادى؟"\n• "نتائجي"\n• "جدولي"\n• "نصائح للمذاكرة"\n\nاسألني أي سؤال! 😊' };
    }

    return { success: true, reply: '🤖 جرب تسأل:\n\n📊 "كم غيابي؟"\n📅 "محاضرتي القادمة؟"\n👨‍🏫 "من هم دكاترتي؟"\n📚 "كم عدد موادى؟"\n📝 "نتائجي"' };
  } catch (error) {
    return { success: false, reply: 'حدث خطأ. حاول مرة أخرى.' };
  }
}

export function getSuggestedQuestions() {
  return [
    { icon: '📊', text: 'كم غيابي؟' },
    { icon: '📅', text: 'محاضرتي القادمة؟' },
    { icon: '👨‍🏫', text: 'من هم دكاترتي؟' },
    { icon: '📚', text: 'كم عدد موادى؟' },
    { icon: '📝', text: 'نتائجي' },
    { icon: '💡', text: 'نصائح للمذاكرة' },
    { icon: '📅', text: 'جدولي' },
  ];
}