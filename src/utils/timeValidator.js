/**
 * Time Validator Utility
 * التحقق من صحة الوقت لتوليد QR Code وتسجيل الحضور
 */

export const QR_CODE_VALIDITY_SECONDS = 5;

const DAYS_MAP = {
  'sunday': 'الأحد',
  'monday': 'الإثنين', 
  'tuesday': 'الثلاثاء',
  'wednesday': 'الأربعاء',
  'thursday': 'الخميس',
  'friday': 'الجمعة',
  'saturday': 'السبت'
};

export const validateQRGenerationTime = (lecture) => {
  if (!lecture) {
    return { valid: false, message: '❌ لا توجد بيانات للمحاضرة', canGenerate: false };
  }

  const now = new Date();
  const currentDay = getCurrentDay();
  const currentTime = getCurrentTimeInMinutes();
  
  if (lecture.day && lecture.day !== currentDay && lecture.dayOfWeek !== currentDay) {
    return { 
      valid: false, 
      message: `❌ المحاضرة يوم ${DAYS_MAP[lecture.day] || lecture.day} وليس اليوم`,
      canGenerate: false 
    };
  }
  
  const startMinutes = timeToMinutes(lecture.startTime);
  const endMinutes = timeToMinutes(lecture.endTime);
  
  if (currentTime < startMinutes) {
    const remainingMinutes = startMinutes - currentTime;
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingMins = remainingMinutes % 60;
    return {
      valid: false,
      message: `⏰ المحاضرة تبدأ الساعة ${lecture.startTime} (متبقي ${remainingHours}:${remainingMins.toString().padStart(2, '0')})`,
      canGenerate: false,
      remainingMinutes
    };
  }
  
  if (currentTime > endMinutes) {
    const passedMinutes = currentTime - endMinutes;
    return {
      valid: false,
      message: `⏰ انتهت المحاضرة في ${lecture.endTime} (منذ ${passedMinutes} دقيقة)`,
      canGenerate: false,
      passedMinutes
    };
  }
  
  const remainingMinutes = endMinutes - currentTime;
  return {
    valid: true,
    message: `✅ المحاضرة جارية (متبقي ${remainingMinutes} دقيقة)`,
    canGenerate: true,
    remainingMinutes,
    isLate: currentTime > startMinutes + 10
  };
};

export const validateStudentAttendance = (lecture, scanTime = new Date()) => {
  if (!lecture) {
    return { valid: false, status: 'invalid', message: '❌ محاضرة غير موجودة' };
  }
  
  const currentDay = getCurrentDay();
  
  if (lecture.day && lecture.day !== currentDay && lecture.dayOfWeek !== currentDay) {
    return { valid: false, status: 'wrong_day', message: '❌ هذه المحاضرة ليست اليوم' };
  }
  
  const currentMinutes = scanTime.getHours() * 60 + scanTime.getMinutes();
  const startMinutes = timeToMinutes(lecture.startTime);
  const endMinutes = timeToMinutes(lecture.endTime);
  
  if (currentMinutes < startMinutes) {
    return { valid: false, status: 'too_early', message: `⏰ المحاضرة لم تبدأ بعد (تبدأ ${lecture.startTime})` };
  }
  
  if (currentMinutes > endMinutes) {
    return { valid: false, status: 'too_late', message: `⏰ انتهت المحاضرة في ${lecture.endTime}` };
  }
  
  const minutesFromStart = currentMinutes - startMinutes;
  let status, message;
  
  if (minutesFromStart <= 10) {
    status = 'present';
    message = '✅ حضور في الوقت المحدد';
  } else if (minutesFromStart <= 15) {
    status = 'late';
    message = '⏰ حضور متأخر';
  } else {
    status = 'very_late';
    message = '⚠️ حضور متأخر جداً';
  }
  
  return {
    valid: true,
    status,
    message,
    minutesFromStart,
    attendanceStatus: status === 'present' ? 'حاضر' : status === 'late' ? 'متأخر' : 'متأخر جداً'
  };
};

export const getCurrentDay = () => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

export const getCurrentDayArabic = () => {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[new Date().getDay()];
};

export const timeToMinutes = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const getCurrentTimeInMinutes = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

export const getCurrentTimeString = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

export const isTimeInRange = (startTime, endTime) => {
  const current = getCurrentTimeInMinutes();
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return current >= start && current <= end;
};

export const getRemainingTime = (endTime) => {
  const current = getCurrentTimeInMinutes();
  const end = timeToMinutes(endTime);
  const remaining = end - current;
  
  if (remaining <= 0) return { hours: 0, minutes: 0, total: 0, isFinished: true };
  
  return {
    hours: Math.floor(remaining / 60),
    minutes: remaining % 60,
    total: remaining,
    isFinished: false
  };
};

export const formatRemainingTime = (remaining) => {
  if (remaining.isFinished) return 'انتهت';
  if (remaining.hours > 0) {
    return `${remaining.hours}:${remaining.minutes.toString().padStart(2, '0')} ساعة`;
  }
  return `${remaining.minutes} دقيقة`;
};