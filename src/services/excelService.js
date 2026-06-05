import * as FileSystem from 'expo-file-system';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const readExcelFile = async (fileUri) => {
  try {
    const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
    const lines = fileContent.split('\n').filter(line => line.trim());
    const data = lines.map(line => line.split(/[\t,;]/).map(cell => cell.trim().replace(/^"|"$/g, '')));
    return { success: true, data, sheetName: 'Sheet1' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const findColumnIndex = (headers, possibleNames) => {
  return headers.findIndex(h => h && possibleNames.some(name => h.toLowerCase().includes(name.toLowerCase())));
};

export const calculateGradeLetter = (score) => {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 75) return 'C+';
  if (score >= 70) return 'C';
  if (score >= 65) return 'D+';
  if (score >= 60) return 'D';
  return 'F';
};

export const parseGradesExcel = (excelData, batch, specialization) => {
  if (!excelData || excelData.length < 2) {
    return { success: false, error: 'الملف فارغ' };
  }

  const headers = excelData[0];
  const rows = excelData.slice(1).filter(row => row.length > 0 && row.some(cell => cell));
  
  // البحث عن عمود الرقم الجامعي أو الطالب
  const studentIdCol = findColumnIndex(headers, ['الرقم الجامعي', 'studentId', 'رقم', 'id', 'stu']);
  const studentNameCol = findColumnIndex(headers, ['الطالب', 'الاسم', 'student', 'name']);
  
  const idCol = studentIdCol !== -1 ? studentIdCol : studentNameCol;
  
  if (idCol === -1) {
    return { success: false, error: 'لم يتم العثور على عمود "الرقم الجامعي" أو "الطالب"' };
  }

  const useStudentId = studentIdCol !== -1;
  
  const skipKeywords = ['الطالب', 'الاسم', 'student', 'name', 'الرقم الجامعي', 'studentid', 'stu', 'id', 'رقم', 'المجموع', 'total', 'النسبة', 'percentage', 'ملاحظات', 'notes'];
  
  const subjectColumns = [];
  headers.forEach((header, index) => {
    if (index !== idCol && header && header !== '' && header !== 'name') {
      const headerStr = header.toLowerCase();
      const isSkip = skipKeywords.some(skip => headerStr.includes(skip.toLowerCase()));
      if (!isSkip) {
        subjectColumns.push({ index, name: header });
      }
    }
  });

  if (subjectColumns.length === 0) {
    return { success: false, error: 'لم يتم العثور على أعمدة مواد' };
  }

  const grades = [];
  
  rows.forEach(row => {
    const identifier = row[idCol]?.trim();
    if (!identifier) return;

    subjectColumns.forEach(subjectCol => {
      const score = Number(row[subjectCol.index]);
      if (!isNaN(score) && score >= 0) {
        grades.push({
          [useStudentId ? 'studentId' : 'studentName']: identifier,
          studentName: useStudentId ? '' : identifier,
          courseName: subjectCol.name,
          score,
          letterGrade: calculateGradeLetter(score),
          batch,
          specialization
        });
      }
    });
  });

  return {
    success: true,
    grades,
    useStudentId,
    subjectColumns: subjectColumns.map(s => s.name),
    studentsCount: [...new Set(grades.map(g => g.studentId || g.studentName))].length,
    errors: []
  };
};

export const saveGradesToFirestore = async (grades, batch, specialization) => {
  try {
    let savedCount = 0;
    let updatedCount = 0;
    const timestamp = new Date().toISOString();

    for (const grade of grades) {
      let studentQuery;
      
      if (grade.studentId) {
        // البحث بالرقم الجامعي
        studentQuery = query(
          collection(db, 'users'),
          where('studentId', '==', grade.studentId),
          where('role', '==', 'student')
        );
      } else {
        // البحث بالاسم
        studentQuery = query(
          collection(db, 'users'),
          where('name', '==', grade.studentName),
          where('batch', '==', batch),
          where('role', '==', 'student')
        );
      }
      
      const studentSnap = await getDocs(studentQuery);
      let studentName = grade.studentName || '';
      
      if (!studentSnap.empty) {
        studentName = studentSnap.docs[0].data().name || studentName;
      }

      const existingQuery = query(
        collection(db, 'grades'),
        where('studentId', '==', grade.studentId || ''),
        where('studentName', '==', studentName),
        where('courseName', '==', grade.courseName),
        where('batch', '==', batch)
      );
      
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        await updateDoc(doc(db, 'grades', existingSnap.docs[0].id), {
          score: grade.score,
          letterGrade: grade.letterGrade,
          specialization,
          updatedAt: timestamp
        });
        updatedCount++;
      } else {
        await addDoc(collection(db, 'grades'), {
          studentId: grade.studentId || '',
          studentName,
          courseName: grade.courseName,
          score: grade.score,
          letterGrade: grade.letterGrade,
          batch,
          specialization: specialization || '',
          createdAt: timestamp,
          updatedAt: timestamp
        });
        savedCount++;
      }
    }

    return { success: true, savedCount, updatedCount, total: grades.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
};