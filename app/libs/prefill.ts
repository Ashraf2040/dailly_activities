import type { PlanFields } from '../components/types';

const prefillExample: Record<string, PlanFields> = {
  English: {
    unit: 'Unit 1: Elements of Literature\nUnit 2: Analyzing Literature',
    lessons: 'Unit 1: Lesson 5: Wrap-Up: Elements of Literature\nUnit 2: Lesson 1: Poetry',
    pages: 'Unit 1: Lesson 5: P. 24 – 26',
    homework: 'Complete the study guide worksheet and send it to the teacher.\nIXL Codes: PZY 8XM 64Z',
    classwork: 'Complete the assignment worksheet and submit answers for grading.',
  },
  Math: { unit: 'Unit 2: Signed Numbers', lessons: 'Unit 2: Lesson 3: Absolute Value\nUnit 2: Lesson 4: Wrap-Up: Signed Numbers', pages: '', homework: 'IXL Codes: 2YZ NSB 9CW', classwork: '' },
  Science: { unit: '', lessons: 'Unit 2: Lesson 2: Tools and Measurement', pages: 'P.27', homework: '', classwork: '' },
  'Social Studies': { unit: '', lessons: '', pages: 'Complete your work in p. 23', homework: '', classwork: '' },
  'Life Skills': {
    unit: 'Unit (1): My Success Skills',
    lessons: '',
    pages: 'P.26 - 29',
    homework: 'Complete your study guide worksheet',
    classwork: 'Checkup and review: Complete the exercises to review what was learned and watch the review video\nPractice: Complete the assignment worksheet and submit answers for grading. Take the quiz online.',
  },
  Computer: { unit: '6 - 12', lessons: 'Microsoft Excel: Revision', pages: 'Worksheet', homework: '', classwork: 'Formatting Cells using Microsoft Excel - Charts' },
  'اللغة العربية': { unit: 'الوحدة الأولى - قدوات ومثل عليا', lessons: 'اتبع مهارات القطع والوصل والهمزة المتوسطة', pages: '٣٧-٤٧-٥٧-٦٧-٧٧', homework: 'الواجب صفحة ٧٧', classwork: '' },
  'الدراسات الإسلامية': {
    unit: '1 - 2',
    lessons: 'التوحيد: مظاهر الشرك\nالحديث: محبته صلى الله عليه وسلم لذوي رحمه\nالفقه: صلاة العيدين\nالقرآن: حفظ سورة القلم 1-34',
    pages: 'التوحيد: 34\nالحديث: 57\nالفقه: 110',
    homework: 'التوحيد: 36\nالحديث: 60\nالفقه: 113',
    classwork: '',
  },
  'الدراسات الاجتماعية باللغة العربية': { unit: 'الوحدة الأولى والوحدة الثانية', lessons: 'أئمة الدولة السعودية الأولى', pages: '', homework: 'نشاط 2', classwork: 'معرفة مراحل تأسيس الدولة السعودية الأولى' },
};

const aliasToExampleKey: Record<string, string> = {
  Arabic: 'اللغة العربية',
  Islamic: 'الدراسات الإسلامية',
  'Social Arabic': 'الدراسات الاجتماعية باللغة العربية',
  ICT: 'Computer',
  LifeSkills: 'Life Skills',
  'Life Skills': 'Life Skills',
};

const canonicalKey = (dbName: string) => aliasToExampleKey[dbName] || dbName;

export const getPrefillFor = (dbName: string): PlanFields => {
  const key = canonicalKey(dbName);
  return prefillExample[key] || { unit: '', lessons: '', pages: '', homework: '', classwork: '' };
};
