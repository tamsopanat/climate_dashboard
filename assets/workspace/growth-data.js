/* =========================================================================
 * TSPE Thai Growth Chart Data & Multi-Year Student Measurement Database
 * Reference: Thai Society for Pediatric Endocrinology (TSPE 2022)
 *            WHO Growth Standards (2006, ages 2-5)
 *            National Growth References (2020, Bureau of Nutrition, MOPH Thailand, ages 5-19)
 * ========================================================================= */
(() => {
  'use strict';

  // Ages 2 to 19 years
  const AGES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  // --- BOYS (เด็กชาย) REFERENCE CURVES ---
  const BOYS_REFERENCE = Object.freeze({
    height: Object.freeze({
      p3:  [81.5, 88.5, 95.0, 101.0, 106.5, 112.0, 117.0, 122.0, 126.5, 131.0, 136.0, 142.5, 149.0, 154.5, 157.0, 158.5, 159.0, 159.5],
      p10: [83.5, 91.0, 97.5, 104.0, 109.5, 115.0, 120.5, 125.5, 130.5, 135.5, 141.0, 147.5, 154.5, 160.0, 162.5, 164.0, 164.5, 165.0],
      p25: [85.5, 93.5, 100.5, 107.0, 113.0, 118.5, 124.0, 129.5, 134.5, 140.0, 146.0, 153.0, 160.0, 165.0, 167.5, 169.0, 169.5, 170.0],
      p50: [87.5, 96.0, 103.5, 110.5, 116.5, 122.5, 128.0, 133.5, 139.0, 144.5, 151.0, 158.5, 165.5, 170.0, 172.5, 173.5, 174.0, 174.5],
      p75: [90.0, 99.0, 106.5, 114.0, 120.5, 126.5, 132.5, 138.0, 144.0, 150.0, 156.5, 164.0, 170.5, 175.0, 177.5, 178.5, 179.0, 179.5],
      p90: [92.0, 101.5, 109.5, 117.0, 124.0, 130.5, 136.5, 142.5, 148.5, 155.0, 161.5, 169.0, 175.0, 179.5, 181.5, 182.5, 183.0, 183.5],
      p97: [94.0, 103.5, 112.0, 120.0, 127.0, 134.0, 140.5, 146.5, 153.0, 159.5, 166.5, 173.5, 179.0, 183.0, 185.0, 186.0, 186.5, 187.0]
    }),
    weight: Object.freeze({
      p3:  [10.0, 11.5, 13.0, 14.5, 16.0, 18.0, 20.0, 22.0, 24.5, 27.0, 30.0, 34.0, 38.5, 43.0, 46.0, 48.0, 49.0, 49.5],
      p10: [10.8, 12.5, 14.2, 16.0, 17.8, 20.0, 22.5, 25.0, 28.0, 31.0, 34.5, 39.0, 44.0, 48.5, 51.5, 53.5, 54.5, 55.0],
      p25: [11.6, 13.5, 15.5, 17.5, 19.8, 22.2, 25.0, 28.0, 31.5, 35.5, 39.5, 44.5, 49.5, 54.0, 57.0, 59.0, 60.0, 60.5],
      p50: [12.5, 14.8, 17.0, 19.5, 22.0, 25.0, 28.2, 31.8, 36.0, 40.5, 45.5, 51.0, 56.5, 61.0, 64.0, 66.0, 67.0, 67.5],
      p75: [13.8, 16.2, 19.0, 22.0, 25.2, 29.0, 33.0, 37.5, 42.5, 48.0, 54.0, 60.5, 66.5, 71.0, 74.0, 76.0, 77.0, 77.5],
      p90: [15.0, 18.0, 21.5, 25.2, 29.2, 34.0, 39.0, 44.5, 51.0, 58.0, 65.0, 71.5, 78.0, 82.5, 85.5, 87.0, 88.0, 88.5],
      p97: [16.2, 19.8, 24.0, 28.5, 33.5, 39.0, 45.5, 52.0, 60.0, 68.0, 75.5, 82.0, 88.0, 92.0, 95.0, 96.5, 97.5, 98.0]
    }),
    puberty: Object.freeze([
      { label: 'Genital Tanner stage II', p3: 9.5, p50: 11.5, p97: 13.5, color: '#38bdf8' },
      { label: 'Pubic hair Tanner stage II', p3: 10.0, p50: 12.0, p97: 14.0, color: '#0284c7' }
    ])
  });

  // --- GIRLS (เด็กหญิง) REFERENCE CURVES ---
  const GIRLS_REFERENCE = Object.freeze({
    height: Object.freeze({
      p3:  [80.0, 87.0, 93.5, 99.5, 105.5, 111.0, 116.0, 121.0, 126.0, 131.5, 138.0, 143.0, 146.0, 147.5, 148.0, 148.0, 148.5, 148.5],
      p10: [82.0, 89.5, 96.0, 102.5, 108.5, 114.0, 119.5, 124.5, 130.0, 136.0, 142.5, 147.5, 150.5, 152.0, 152.5, 153.0, 153.0, 153.0],
      p25: [84.0, 92.0, 99.0, 105.5, 111.5, 117.5, 123.0, 128.5, 134.5, 141.0, 147.0, 151.5, 154.5, 156.0, 156.5, 157.0, 157.0, 157.0],
      p50: [86.5, 95.0, 102.0, 109.0, 115.0, 121.0, 127.0, 132.5, 138.5, 145.0, 151.0, 155.0, 157.5, 159.0, 159.5, 160.0, 160.0, 160.0],
      p75: [89.0, 98.0, 105.5, 112.5, 119.0, 125.0, 131.0, 137.0, 143.5, 150.0, 155.5, 159.0, 161.5, 162.5, 163.0, 163.5, 163.5, 163.5],
      p90: [91.5, 100.5, 108.5, 116.0, 122.5, 129.0, 135.0, 141.5, 148.0, 154.5, 159.5, 163.0, 165.0, 166.0, 166.5, 167.0, 167.0, 167.0],
      p97: [93.5, 103.0, 111.5, 119.0, 126.0, 132.5, 139.0, 145.5, 152.0, 158.5, 163.5, 166.5, 168.5, 169.5, 170.0, 170.5, 170.5, 170.5]
    }),
    weight: Object.freeze({
      p3:  [9.5,  11.0, 12.5, 14.0, 15.5, 17.5, 19.5, 21.5, 24.0, 27.0, 30.5, 34.0, 37.0, 39.0, 40.0, 40.5, 40.5, 41.0],
      p10: [10.2, 11.8, 13.5, 15.2, 17.0, 19.2, 21.5, 24.0, 27.0, 30.5, 34.5, 38.5, 41.5, 43.5, 44.5, 45.0, 45.5, 45.5],
      p25: [11.0, 12.8, 14.8, 16.8, 19.0, 21.5, 24.2, 27.5, 31.0, 35.0, 39.5, 43.5, 46.5, 48.5, 49.5, 50.0, 50.5, 50.5],
      p50: [12.0, 14.0, 16.2, 18.5, 21.0, 24.0, 27.2, 31.0, 35.5, 40.5, 45.5, 49.5, 52.5, 54.5, 55.5, 56.0, 56.5, 56.5],
      p75: [13.2, 15.5, 18.0, 21.0, 24.0, 27.5, 31.5, 36.0, 41.5, 47.5, 53.0, 57.5, 60.5, 62.5, 63.5, 64.0, 64.5, 64.5],
      p90: [14.5, 17.2, 20.5, 24.0, 28.0, 32.5, 37.5, 43.0, 49.5, 56.5, 62.5, 67.0, 70.0, 72.0, 73.0, 73.5, 74.0, 74.0],
      p97: [15.8, 19.0, 23.0, 27.5, 32.5, 38.0, 44.0, 50.5, 58.0, 65.5, 72.0, 76.5, 79.5, 81.5, 82.5, 83.0, 83.5, 83.5]
    }),
    puberty: Object.freeze([
      { label: 'Breast Tanner stage II', p3: 8.5, p50: 10.0, p97: 12.0, color: '#f472b6' },
      { label: 'Menarche (ประจำเดือนครั้งแรก)', p3: 10.5, p50: 12.2, p97: 14.5, color: '#db2777' }
    ])
  });

  // Helper for linear interpolation between integer age points
  function interpolatePercentile(refCurves, metric, percentileKey, exactAge) {
    const pKey = percentileKey.toLowerCase();
    const arr = refCurves[metric][pKey];
    if (!arr) return null;
    if (exactAge <= AGES[0]) return arr[0];
    if (exactAge >= AGES[AGES.length - 1]) return arr[arr.length - 1];

    const idx = AGES.findIndex(a => a >= exactAge);
    if (idx === 0) return arr[0];
    const a0 = AGES[idx - 1], a1 = AGES[idx];
    const v0 = arr[idx - 1], v1 = arr[idx];
    const fraction = (exactAge - a0) / (a1 - a0);
    return Math.round((v0 + fraction * (v1 - v0)) * 10) / 10;
  }

  // Assess height according to Thai Bureau of Nutrition / TSPE standard
  function assessHeight(arg1, arg2, arg3) {
    let gender = (typeof arg1 === 'string') ? arg1 : ((typeof arg3 === 'string') ? arg3 : 'boy');
    let age = (typeof arg1 === 'number' && arg1 <= 20) ? arg1 : ((typeof arg2 === 'number') ? arg2 : 10);
    let height = (typeof arg1 === 'number' && arg1 > 20) ? arg1 : ((typeof arg3 === 'number') ? arg3 : 100);

    const ref = gender === 'girl' ? GIRLS_REFERENCE : BOYS_REFERENCE;
    const p3 = interpolatePercentile(ref, 'height', 'p3', age);
    const p10 = interpolatePercentile(ref, 'height', 'p10', age);
    const p25 = interpolatePercentile(ref, 'height', 'p25', age);
    const p50 = interpolatePercentile(ref, 'height', 'p50', age);
    const p75 = interpolatePercentile(ref, 'height', 'p75', age);
    const p90 = interpolatePercentile(ref, 'height', 'p90', age);
    const p97 = interpolatePercentile(ref, 'height', 'p97', age);

    if (height < p3) return { level: 'short', label: 'เตี้ย', percentile: '< P3', text: 'เตี้ย (< P3)', color: 'text-rose-700 bg-rose-50 border border-rose-200', tag: 'ควรปรึกษาแพทย์' };
    if (height < p10) return { level: 'fair-short', label: 'ค่อนข้างเตี้ย', percentile: 'P3-P10', text: 'ค่อนข้างเตี้ย (P3-P10)', color: 'text-amber-700 bg-amber-50 border border-amber-200', tag: 'เฝ้าระวัง' };
    if (height <= p75) return { level: 'normal', label: 'ส่วนสูงตามเกณฑ์', percentile: 'P10-P75', text: 'ส่วนสูงตามเกณฑ์ (P10-P75)', color: 'text-emerald-700 bg-emerald-50 border border-emerald-200', tag: 'ปกติ' };
    if (height <= p97) return { level: 'tall', label: 'ค่อนข้างสูง', percentile: 'P75-P97', text: 'ค่อนข้างสูง (P75-P97)', color: 'text-sky-700 bg-sky-50 border border-sky-200', tag: 'เจริญเติบโตดี' };
    return { level: 'very-tall', label: 'สูงกว่าเกณฑ์', percentile: '> P97', text: 'สูงกว่าเกณฑ์ (> P97)', color: 'text-indigo-700 bg-indigo-50 border border-indigo-200', tag: 'สูงเด่น' };
  }

  // Assess weight according to Thai Bureau of Nutrition / TSPE standard
  function assessWeight(arg1, arg2, arg3) {
    let gender = (typeof arg1 === 'string') ? arg1 : ((typeof arg3 === 'string') ? arg3 : 'boy');
    let age = (typeof arg1 === 'number' && arg1 <= 20) ? arg1 : ((typeof arg2 === 'number') ? arg2 : 10);
    let weight = (typeof arg1 === 'number' && arg1 > 20) ? arg1 : ((typeof arg3 === 'number') ? arg3 : 30);

    const ref = gender === 'girl' ? GIRLS_REFERENCE : BOYS_REFERENCE;
    const p3 = interpolatePercentile(ref, 'weight', 'p3', age);
    const p10 = interpolatePercentile(ref, 'weight', 'p10', age);
    const p25 = interpolatePercentile(ref, 'weight', 'p25', age);
    const p75 = interpolatePercentile(ref, 'weight', 'p75', age);
    const p90 = interpolatePercentile(ref, 'weight', 'p90', age);
    const p97 = interpolatePercentile(ref, 'weight', 'p97', age);

    if (weight < p3) return { level: 'underweight', label: 'น้ำหนักน้อยมาก', percentile: '< P3', text: 'น้ำหนักน้อยมาก (< P3)', color: 'text-rose-700 bg-rose-50 border border-rose-200' };
    if (weight < p10) return { level: 'thin', label: 'ค่อนข้างผอม', percentile: 'P3-P10', text: 'ค่อนข้างผอม (P3-P10)', color: 'text-amber-700 bg-amber-50 border border-amber-200' };
    if (weight <= p75) return { level: 'normal', label: 'น้ำหนักตามเกณฑ์', percentile: 'P10-P75', text: 'น้ำหนักตามเกณฑ์ (P10-P75)', color: 'text-emerald-700 bg-emerald-50 border border-emerald-200' };
    if (weight <= p90) return { level: 'plump', label: 'น้ำหนักเกินเกณฑ์ / ท้วม', percentile: 'P75-P90', text: 'น้ำหนักเกินเกณฑ์ / ท้วม (P75-P90)', color: 'text-amber-700 bg-amber-50 border border-amber-200' };
    if (weight <= p97) return { level: 'overweight', label: 'เริ่มอ้วน', percentile: 'P90-P97', text: 'เริ่มอ้วน (P90-P97)', color: 'text-orange-700 bg-orange-50 border border-orange-200' };
    return { level: 'obese', label: 'อ้วน', percentile: '> P97', text: 'อ้วน (> P97)', color: 'text-rose-700 bg-rose-50 border border-rose-200' };
  }

  // Calculate BMI and Thai nutrition status
  function assessBmi(arg1, arg2) {
    const num1 = Number(arg1) || 0;
    const num2 = Number(arg2) || 0;
    if (!num1 || !num2) return { bmi: 0, label: '-', text: '-', color: 'text-gray-500' };
    // Distinguish height in cm from weight in kg
    const heightCm = Math.max(num1, num2);
    const weightKg = Math.min(num1, num2);

    const hMeter = heightCm / 100;
    const bmi = Math.round((weightKg / (hMeter * hMeter)) * 10) / 10;
    if (bmi < 18.5) return { bmi, label: 'ผอม / น้ำหนักน้อย', text: 'ผอม / น้ำหนักน้อย', color: 'text-amber-700 bg-amber-50 border border-amber-200' };
    if (bmi < 23.0) return { bmi, label: 'สมส่วน', text: 'สมส่วน / สมบูรณ์ตามวัย', color: 'text-emerald-700 bg-emerald-50 border border-emerald-200' };
    if (bmi < 25.0) return { bmi, label: 'ท้วม / น้ำหนักเกิน', text: 'ท้วม / น้ำหนักเกิน', color: 'text-amber-700 bg-amber-50 border border-amber-200' };
    if (bmi < 30.0) return { bmi, label: 'เริ่มอ้วน', text: 'เริ่มอ้วน (Overweight)', color: 'text-orange-700 bg-orange-50 border border-orange-200' };
    return { bmi, label: 'โรคอ้วน', text: 'โรคอ้วน (Obesity)', color: 'text-rose-700 bg-rose-50 border border-rose-200' };
  }

  // Calculate Mid-parental height (Target Height)
  function calcMidParentalHeight(arg1, arg2, arg3) {
    let gender = (typeof arg1 === 'string') ? arg1 : ((typeof arg3 === 'string') ? arg3 : 'boy');
    let f = (typeof arg1 === 'number') ? arg1 : Number(arg2) || 0;
    let m = (typeof arg3 === 'number') ? arg3 : Number(arg3) || (typeof arg2 === 'number' && typeof arg1 === 'string' ? Number(arg3) || 0 : 0);
    if (typeof arg1 === 'string') {
      f = Number(arg2) || 0;
      m = Number(arg3) || 0;
    } else if (typeof arg3 === 'string') {
      f = Number(arg1) || 0;
      m = Number(arg2) || 0;
      gender = arg3;
    }
    if (!f || !m) return null;
    const target = gender === 'boy' ? (f + m + 13) / 2 : (f + m - 13) / 2;
    return {
      target: Math.round(target * 10) / 10,
      rangeMin: Math.round((target - 8.5) * 10) / 10,
      rangeMax: Math.round((target + 8.5) * 10) / 10
    };
  }

  // --- INITIAL STUDENT GROWTH RECORDS DATABASE ---
  const studentGrowthDb = {
    // === โรงเรียนสารภีพิทยาคม (usr_saraphi) ===
    "SP-670184": {
      id: "SP-670184",
      name: "นาย ณัฐพงษ์ แซ่ลิ้ม",
      gender: "boy",
      schoolId: "usr_saraphi",
      gradeClass: "ม.4/2",
      gradeGroup: "ม.4",
      dob: "14 ก.พ. 2553",
      fatherHeight: 173.0,
      motherHeight: 159.0,
      records: [
        { yearBe: 2564, grade: "ป.5", date: "2021-06-15", age: 11.3, height: 143.5, weight: 37.0 },
        { yearBe: 2565, grade: "ป.6", date: "2022-06-18", age: 12.3, height: 150.0, weight: 42.5 },
        { yearBe: 2566, grade: "ม.1", date: "2023-06-12", age: 13.3, height: 158.2, weight: 48.0 },
        { yearBe: 2567, grade: "ม.2", date: "2024-06-14", age: 14.3, height: 165.0, weight: 54.0 },
        { yearBe: 2568, grade: "ม.3", date: "2025-06-16", age: 15.3, height: 169.5, weight: 58.5 },
        { yearBe: 2569, grade: "ม.4", date: "2026-06-20", age: 16.3, height: 172.5, weight: 62.0 }
      ]
    },
    "SP-670231": {
      id: "SP-670231",
      name: "น.ส. พิมพ์ชนก ขำดี",
      gender: "girl",
      schoolId: "usr_saraphi",
      gradeClass: "ม.4/3",
      gradeGroup: "ม.4",
      dob: "3 มิ.ย. 2553",
      fatherHeight: 170.0,
      motherHeight: 156.0,
      records: [
        { yearBe: 2564, grade: "ป.5", date: "2021-06-15", age: 11.0, height: 145.0, weight: 38.0 },
        { yearBe: 2565, grade: "ป.6", date: "2022-06-18", age: 12.0, height: 151.5, weight: 43.5 },
        { yearBe: 2566, grade: "ม.1", date: "2023-06-12", age: 13.0, height: 156.0, weight: 47.5 },
        { yearBe: 2567, grade: "ม.2", date: "2024-06-14", age: 14.0, height: 158.5, weight: 50.0 },
        { yearBe: 2568, grade: "ม.3", date: "2025-06-16", age: 15.0, height: 160.0, weight: 52.0 },
        { yearBe: 2569, grade: "ม.4", date: "2026-06-20", age: 16.0, height: 160.5, weight: 53.2 }
      ]
    },
    "SP-660097": {
      id: "SP-660097",
      name: "นาย ธนากร อินตา",
      gender: "boy",
      schoolId: "usr_saraphi",
      gradeClass: "ม.5/1",
      gradeGroup: "ม.5",
      dob: "28 พ.ย. 2552",
      fatherHeight: 175.0,
      motherHeight: 162.0,
      records: [
        { yearBe: 2564, grade: "ป.6", date: "2021-06-15", age: 11.6, height: 146.0, weight: 39.5 },
        { yearBe: 2565, grade: "ม.1", date: "2022-06-18", age: 12.6, height: 154.0, weight: 46.0 },
        { yearBe: 2566, grade: "ม.2", date: "2023-06-12", age: 13.6, height: 162.5, weight: 53.0 },
        { yearBe: 2567, grade: "ม.3", date: "2024-06-14", age: 14.6, height: 169.0, weight: 60.0 },
        { yearBe: 2568, grade: "ม.4", date: "2025-06-16", age: 15.6, height: 173.0, weight: 64.5 },
        { yearBe: 2569, grade: "ม.5", date: "2026-06-20", age: 16.6, height: 175.0, weight: 67.0 }
      ]
    },
    "SP-650142": {
      id: "SP-650142",
      name: "น.ส. กัญญาณัฐ วงค์ษา",
      gender: "girl",
      schoolId: "usr_saraphi",
      gradeClass: "ม.6/4",
      gradeGroup: "ม.6",
      dob: "17 ส.ค. 2551",
      fatherHeight: 168.0,
      motherHeight: 155.0,
      records: [
        { yearBe: 2564, grade: "ม.2", date: "2021-06-15", age: 12.8, height: 152.0, weight: 44.5 },
        { yearBe: 2565, grade: "ม.3", date: "2022-06-18", age: 13.8, height: 155.5, weight: 47.0 },
        { yearBe: 2566, grade: "ม.4", date: "2023-06-12", age: 14.8, height: 157.0, weight: 49.0 },
        { yearBe: 2567, grade: "ม.5", date: "2024-06-14", age: 15.8, height: 158.0, weight: 51.0 },
        { yearBe: 2568, grade: "ม.6", date: "2025-06-16", age: 16.8, height: 158.5, weight: 52.0 }
      ]
    },
    "SP-680055": {
      id: "SP-680055",
      name: "ด.ช. ภูริณัฐ ไชยโย",
      gender: "boy",
      schoolId: "usr_saraphi",
      gradeClass: "ม.3/2",
      gradeGroup: "ม.3",
      dob: "21 ม.ค. 2554",
      fatherHeight: 171.0,
      motherHeight: 157.0,
      records: [
        { yearBe: 2565, grade: "ป.5", date: "2022-06-18", age: 11.4, height: 140.0, weight: 34.0 },
        { yearBe: 2566, grade: "ป.6", date: "2023-06-12", age: 12.4, height: 146.5, weight: 39.0 },
        { yearBe: 2567, grade: "ม.1", date: "2024-06-14", age: 13.4, height: 153.5, weight: 44.5 },
        { yearBe: 2568, grade: "ม.2", date: "2025-06-16", age: 14.4, height: 161.0, weight: 51.0 },
        { yearBe: 2569, grade: "ม.3", date: "2026-06-20", age: 15.4, height: 166.0, weight: 56.0 }
      ]
    },
    "SP-670312": {
      id: "SP-670312",
      name: "น.ส. วรินทร ปัญญาวงศ์",
      gender: "girl",
      schoolId: "usr_saraphi",
      gradeClass: "ม.4/1",
      gradeGroup: "ม.4",
      dob: "10 ก.ย. 2553",
      fatherHeight: 174.0,
      motherHeight: 160.0,
      records: [
        { yearBe: 2565, grade: "ป.6", date: "2022-06-18", age: 11.8, height: 149.0, weight: 41.0 },
        { yearBe: 2566, grade: "ม.1", date: "2023-06-12", age: 12.8, height: 154.5, weight: 46.0 },
        { yearBe: 2567, grade: "ม.2", date: "2024-06-14", age: 13.8, height: 158.0, weight: 49.5 },
        { yearBe: 2568, grade: "ม.3", date: "2025-06-16", age: 14.8, height: 160.2, weight: 52.0 },
        { yearBe: 2569, grade: "ม.4", date: "2026-06-20", age: 15.8, height: 161.0, weight: 53.5 }
      ]
    },
    "SP-660420": {
      id: "SP-660420",
      name: "นาย ธนภัทร สุขสม",
      gender: "boy",
      schoolId: "usr_saraphi",
      gradeClass: "ม.5/3",
      gradeGroup: "ม.5",
      dob: "5 ธ.ค. 2552",
      fatherHeight: 176.0,
      motherHeight: 163.0,
      records: [
        { yearBe: 2565, grade: "ม.1", date: "2022-06-18", age: 12.5, height: 152.0, weight: 45.0 },
        { yearBe: 2566, grade: "ม.2", date: "2023-06-12", age: 13.5, height: 160.5, weight: 52.0 },
        { yearBe: 2567, grade: "ม.3", date: "2024-06-14", age: 14.5, height: 168.0, weight: 59.5 },
        { yearBe: 2568, grade: "ม.4", date: "2025-06-16", age: 15.5, height: 172.5, weight: 64.0 },
        { yearBe: 2569, grade: "ม.5", date: "2026-06-20", age: 16.5, height: 175.5, weight: 67.5 }
      ]
    },
    "SP-680199": {
      id: "SP-680199",
      name: "ด.ญ. อมิตา ใจแก้ว",
      gender: "girl",
      schoolId: "usr_saraphi",
      gradeClass: "ม.3/1",
      gradeGroup: "ม.3",
      dob: "18 พ.ค. 2554",
      fatherHeight: 166.0,
      motherHeight: 154.0,
      records: [
        { yearBe: 2565, grade: "ป.5", date: "2022-06-18", age: 11.1, height: 143.0, weight: 36.5 },
        { yearBe: 2566, grade: "ป.6", date: "2023-06-12", age: 12.1, height: 150.0, weight: 42.0 },
        { yearBe: 2567, grade: "ม.1", date: "2024-06-14", age: 13.1, height: 154.0, weight: 46.5 },
        { yearBe: 2568, grade: "ม.2", date: "2025-06-16", age: 14.1, height: 156.5, weight: 49.0 },
        { yearBe: 2569, grade: "ม.3", date: "2026-06-20", age: 15.1, height: 157.5, weight: 50.5 }
      ]
    },
    "SP-670405": {
      id: "SP-670405",
      name: "นาย ภาคิน คำมา",
      gender: "boy",
      schoolId: "usr_saraphi",
      gradeClass: "ม.4/4",
      gradeGroup: "ม.4",
      dob: "2 ก.ค. 2553",
      fatherHeight: 172.0,
      motherHeight: 158.0,
      records: [
        { yearBe: 2565, grade: "ป.6", date: "2022-06-18", age: 12.0, height: 148.0, weight: 41.5 },
        { yearBe: 2566, grade: "ม.1", date: "2023-06-12", age: 13.0, height: 156.0, weight: 47.0 },
        { yearBe: 2567, grade: "ม.2", date: "2024-06-14", age: 14.0, height: 163.5, weight: 54.0 },
        { yearBe: 2568, grade: "ม.3", date: "2025-06-16", age: 15.0, height: 168.0, weight: 59.0 },
        { yearBe: 2569, grade: "ม.4", date: "2026-06-20", age: 16.0, height: 171.0, weight: 62.5 }
      ]
    },
    "SP-660288": {
      id: "SP-660288",
      name: "น.ส. สุพิชชา มหาวัน",
      gender: "girl",
      schoolId: "usr_saraphi",
      gradeClass: "ม.5/2",
      gradeGroup: "ม.5",
      dob: "14 มี.ค. 2552",
      fatherHeight: 171.0,
      motherHeight: 158.0,
      records: [
        { yearBe: 2565, grade: "ม.1", date: "2022-06-18", age: 13.3, height: 153.0, weight: 46.0 },
        { yearBe: 2566, grade: "ม.2", date: "2023-06-12", age: 14.3, height: 156.5, weight: 49.5 },
        { yearBe: 2567, grade: "ม.3", date: "2024-06-14", age: 15.3, height: 158.5, weight: 52.0 },
        { yearBe: 2568, grade: "ม.4", date: "2025-06-16", age: 16.3, height: 159.2, weight: 53.5 },
        { yearBe: 2569, grade: "ม.5", date: "2026-06-20", age: 17.3, height: 159.5, weight: 54.0 }
      ]
    },
    "SP-650081": {
      id: "SP-650081",
      name: "นาย กฤษฎา ปันเต",
      gender: "boy",
      schoolId: "usr_saraphi",
      gradeClass: "ม.6/1",
      gradeGroup: "ม.6",
      dob: "12 ก.พ. 2551",
      fatherHeight: 178.0,
      motherHeight: 164.0,
      records: [
        { yearBe: 2565, grade: "ม.2", date: "2022-06-18", age: 14.4, height: 165.5, weight: 56.0 },
        { yearBe: 2566, grade: "ม.3", date: "2023-06-12", age: 15.4, height: 172.0, weight: 63.5 },
        { yearBe: 2567, grade: "ม.4", date: "2024-06-14", age: 16.4, height: 175.5, weight: 68.0 },
        { yearBe: 2568, grade: "ม.5", date: "2025-06-16", age: 17.4, height: 177.0, weight: 70.5 },
        { yearBe: 2569, grade: "ม.6", date: "2026-06-20", age: 18.4, height: 177.5, weight: 71.5 }
      ]
    },
    "SP-680244": {
      id: "SP-680244",
      name: "ด.ญ. ชนิกานต์ ดวงแก้ว",
      gender: "girl",
      schoolId: "usr_saraphi",
      gradeClass: "ม.3/3",
      gradeGroup: "ม.3",
      dob: "9 พ.ย. 2554",
      fatherHeight: 169.0,
      motherHeight: 157.0,
      records: [
        { yearBe: 2565, grade: "ป.5", date: "2022-06-18", age: 10.6, height: 141.0, weight: 35.0 },
        { yearBe: 2566, grade: "ป.6", date: "2023-06-12", age: 11.6, height: 148.0, weight: 40.5 },
        { yearBe: 2567, grade: "ม.1", date: "2024-06-14", age: 12.6, height: 153.5, weight: 45.5 },
        { yearBe: 2568, grade: "ม.2", date: "2025-06-16", age: 13.6, height: 156.0, weight: 48.0 },
        { yearBe: 2569, grade: "ม.3", date: "2026-06-20", age: 14.6, height: 157.2, weight: 50.0 }
      ]
    },

    // === โรงเรียนบ้านศาลาแม่ทา (usr_maetha) ===
    "MT-670012": {
      id: "MT-670012",
      name: "ด.ช. ศิวกร ทาปินตา",
      gender: "boy",
      schoolId: "usr_maetha",
      gradeClass: "ป.5/1",
      gradeGroup: "ป.5",
      dob: "15 มี.ค. 2558",
      fatherHeight: 169.0,
      motherHeight: 156.0,
      records: [
        { yearBe: 2566, grade: "ป.3", date: "2023-06-15", age: 8.3, height: 126.0, weight: 26.5 },
        { yearBe: 2567, grade: "ป.4", date: "2024-06-15", age: 9.3, height: 132.0, weight: 30.5 },
        { yearBe: 2568, grade: "ป.5", date: "2025-06-15", age: 10.3, height: 137.5, weight: 34.5 },
        { yearBe: 2569, grade: "ป.6", date: "2026-06-20", age: 11.3, height: 143.0, weight: 38.0 }
      ]
    },
    "MT-670045": {
      id: "MT-670045",
      name: "ด.ญ. ณิชาภัทร ขันคำ",
      gender: "girl",
      schoolId: "usr_maetha",
      gradeClass: "ป.5/2",
      gradeGroup: "ป.5",
      dob: "22 ส.ค. 2558",
      fatherHeight: 167.0,
      motherHeight: 155.0,
      records: [
        { yearBe: 2566, grade: "ป.3", date: "2023-06-15", age: 7.8, height: 124.5, weight: 24.5 },
        { yearBe: 2567, grade: "ป.4", date: "2024-06-15", age: 8.8, height: 130.5, weight: 28.0 },
        { yearBe: 2568, grade: "ป.5", date: "2025-06-15", age: 9.8, height: 136.5, weight: 32.5 },
        { yearBe: 2569, grade: "ป.6", date: "2026-06-20", age: 10.8, height: 142.5, weight: 37.0 }
      ]
    },
    "MT-680018": {
      id: "MT-680018",
      name: "ด.ช. กิตติพงษ์ ใจมูล",
      gender: "boy",
      schoolId: "usr_maetha",
      gradeClass: "ป.4/1",
      gradeGroup: "ป.4",
      dob: "8 ม.ค. 2559",
      fatherHeight: 170.0,
      motherHeight: 158.0,
      records: [
        { yearBe: 2566, grade: "ป.2", date: "2023-06-15", age: 7.4, height: 121.0, weight: 23.5 },
        { yearBe: 2567, grade: "ป.3", date: "2024-06-15", age: 8.4, height: 127.0, weight: 27.0 },
        { yearBe: 2568, grade: "ป.4", date: "2025-06-15", age: 9.4, height: 133.0, weight: 31.0 },
        { yearBe: 2569, grade: "ป.5", date: "2026-06-20", age: 10.4, height: 138.5, weight: 35.0 }
      ]
    },
    "MT-660089": {
      id: "MT-660089",
      name: "ด.ญ. พรรณวดี เมืองมา",
      gender: "girl",
      schoolId: "usr_maetha",
      gradeClass: "ป.6/1",
      gradeGroup: "ป.6",
      dob: "11 พ.ค. 2557",
      fatherHeight: 168.0,
      motherHeight: 156.0,
      records: [
        { yearBe: 2565, grade: "ป.3", date: "2022-06-18", age: 8.1, height: 126.0, weight: 26.0 },
        { yearBe: 2566, grade: "ป.4", date: "2023-06-12", age: 9.1, height: 132.5, weight: 30.0 },
        { yearBe: 2567, grade: "ป.5", date: "2024-06-14", age: 10.1, height: 139.0, weight: 34.5 },
        { yearBe: 2568, grade: "ป.6", date: "2025-06-16", age: 11.1, height: 145.5, weight: 39.5 },
        { yearBe: 2569, grade: "ม.1", date: "2026-06-20", age: 12.1, height: 151.0, weight: 44.0 }
      ]
    },
    "MT-660023": {
      id: "MT-660023",
      name: "ด.ช. ธีรภัทร มูลอินทร์",
      gender: "boy",
      schoolId: "usr_maetha",
      gradeClass: "ป.6/2",
      gradeGroup: "ป.6",
      dob: "19 ต.ค. 2557",
      fatherHeight: 172.0,
      motherHeight: 160.0,
      records: [
        { yearBe: 2565, grade: "ป.3", date: "2022-06-18", age: 7.7, height: 124.0, weight: 24.5 },
        { yearBe: 2566, grade: "ป.4", date: "2023-06-12", age: 8.7, height: 130.0, weight: 28.5 },
        { yearBe: 2567, grade: "ป.5", date: "2024-06-14", age: 9.7, height: 135.5, weight: 32.5 },
        { yearBe: 2568, grade: "ป.6", date: "2025-06-16", age: 10.7, height: 141.0, weight: 36.5 },
        { yearBe: 2569, grade: "ม.1", date: "2026-06-20", age: 11.7, height: 146.5, weight: 41.0 }
      ]
    },
    "MT-650015": {
      id: "MT-650015",
      name: "นาย อัครเดช หล้าคำ",
      gender: "boy",
      schoolId: "usr_maetha",
      gradeClass: "ม.3/1",
      gradeGroup: "ม.3",
      dob: "29 เม.ย. 2554",
      fatherHeight: 174.0,
      motherHeight: 160.0,
      records: [
        { yearBe: 2565, grade: "ป.6", date: "2022-06-18", age: 11.1, height: 142.0, weight: 36.0 },
        { yearBe: 2566, grade: "ม.1", date: "2023-06-12", age: 12.1, height: 148.5, weight: 41.0 },
        { yearBe: 2567, grade: "ม.2", date: "2024-06-14", age: 13.1, height: 156.0, weight: 47.0 },
        { yearBe: 2568, grade: "ม.3", date: "2025-06-16", age: 14.1, height: 163.0, weight: 53.5 },
        { yearBe: 2569, grade: "ม.4", date: "2026-06-20", age: 15.1, height: 168.0, weight: 58.0 }
      ]
    },
    "MT-680072": {
      id: "MT-680072",
      name: "ด.ญ. ชุติกาญจน์ ปัญญา",
      gender: "girl",
      schoolId: "usr_maetha",
      gradeClass: "ป.4/2",
      gradeGroup: "ป.4",
      dob: "14 ก.พ. 2559",
      fatherHeight: 166.0,
      motherHeight: 154.0,
      records: [
        { yearBe: 2566, grade: "ป.2", date: "2023-06-15", age: 7.3, height: 120.0, weight: 22.5 },
        { yearBe: 2567, grade: "ป.3", date: "2024-06-15", age: 8.3, height: 126.0, weight: 26.0 },
        { yearBe: 2568, grade: "ป.4", date: "2025-06-15", age: 9.3, height: 132.0, weight: 29.5 },
        { yearBe: 2569, grade: "ป.5", date: "2026-06-20", age: 10.3, height: 138.0, weight: 33.5 }
      ]
    },
    "MT-670094": {
      id: "MT-670094",
      name: "ด.ช. ปวริศ แก้วดวงดี",
      gender: "boy",
      schoolId: "usr_maetha",
      gradeClass: "ป.5/1",
      gradeGroup: "ป.5",
      dob: "4 ธ.ค. 2558",
      fatherHeight: 171.0,
      motherHeight: 157.0,
      records: [
        { yearBe: 2566, grade: "ป.3", date: "2023-06-15", age: 7.5, height: 122.0, weight: 24.0 },
        { yearBe: 2567, grade: "ป.4", date: "2024-06-15", age: 8.5, height: 128.0, weight: 27.5 },
        { yearBe: 2568, grade: "ป.5", date: "2025-06-15", age: 9.5, height: 134.0, weight: 31.5 },
        { yearBe: 2569, grade: "ป.6", date: "2026-06-20", age: 10.5, height: 140.0, weight: 36.0 }
      ]
    },
    "MT-690005": {
      id: "MT-690005",
      name: "ด.ช. วรัญญู อินปา",
      gender: "boy",
      schoolId: "usr_maetha",
      gradeClass: "ป.3/1",
      gradeGroup: "ป.3",
      dob: "3 ก.ย. 2560",
      fatherHeight: 173.0,
      motherHeight: 159.0,
      records: [
        { yearBe: 2567, grade: "ป.1", date: "2024-06-15", age: 6.8, height: 118.0, weight: 21.5 },
        { yearBe: 2568, grade: "ป.2", date: "2025-06-15", age: 7.8, height: 124.0, weight: 25.0 },
        { yearBe: 2569, grade: "ป.3", date: "2026-06-20", age: 8.8, height: 130.0, weight: 29.0 }
      ]
    },
    "MT-650044": {
      id: "MT-650044",
      name: "น.ส. พิชญา ศรีวิชัย",
      gender: "girl",
      schoolId: "usr_maetha",
      gradeClass: "ม.3/2",
      gradeGroup: "ม.3",
      dob: "17 ก.ค. 2554",
      fatherHeight: 169.0,
      motherHeight: 156.0,
      records: [
        { yearBe: 2565, grade: "ป.6", date: "2022-06-18", age: 10.9, height: 143.0, weight: 36.0 },
        { yearBe: 2566, grade: "ม.1", date: "2023-06-12", age: 11.9, height: 150.0, weight: 42.0 },
        { yearBe: 2567, grade: "ม.2", date: "2024-06-14", age: 12.9, height: 154.5, weight: 46.5 },
        { yearBe: 2568, grade: "ม.3", date: "2025-06-16", age: 13.9, height: 157.0, weight: 49.5 },
        { yearBe: 2569, grade: "ม.4", date: "2026-06-20", age: 14.9, height: 158.5, weight: 51.5 }
      ]
    }
  };

  // Expose API
  globalThis.LhsGrowthData = Object.freeze({
    AGES,
    BOYS_REFERENCE,
    GIRLS_REFERENCE,
    studentGrowthDb,
    getStudentGrowth(studentId) {
      return studentGrowthDb[studentId] || null;
    },
    getAllStudentsForSchool(schoolId) {
      return Object.values(studentGrowthDb).filter(s => s.schoolId === schoolId);
    },
    addRecord(studentId, record) {
      if (!studentGrowthDb[studentId]) return false;
      studentGrowthDb[studentId].records.push(record);
      studentGrowthDb[studentId].records.sort((a, b) => a.age - b.age);
      return true;
    },
    assessHeight,
    assessWeight,
    assessBmi,
    calcMidParentalHeight,
    interpolatePercentile
  });
})();
