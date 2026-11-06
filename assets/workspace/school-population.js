/* Enrollment totals supplied by the user. Names, measurements and health are synthetic. */
(() => {
 'use strict';
 const plans=[{id:'usr_maetha',name:'โรงเรียนบ้านศาลาแม่ทา',prefix:'MT',grades:[['อนุบาล 1',18,4,103,16],['อนุบาล 2',14,5,109,18],['ป.1',12,6,116,21],['ป.2',18,7,122,24],['ป.3',14,8,128,27],['ป.5',8,10,140,34],['ป.6',13,11,146,39]]},{id:'usr_saraphi',name:'โรงเรียนสารภีพิทยาคม',prefix:'SP',grades:[['ม.1',301,12,153,44],['ม.2',245,13,159,49],['ม.3',215,14,163,53],['ม.4',189,15,165,55],['ม.5',203,16,167,57],['ม.6',185,17,168,59]]}];
 const boys=['ภาคิน','ธนกฤต','ณัฐพงษ์','ภูริณัฐ','ปุณณ์','ก้องภพ','ธนภัทร','อชิระ','นที','วีระ','ต้นกล้า','ภีม'];
 const girls=['พิมพ์ชนก','กานดา','สุพิชชา','ชนิกานต์','นภา','ลลิตา','ธิดา','วารุณี','สุภาพร','นิตยา','มธุรส','อารีย์'];
 const roots=['ใจ','แสง','ศรี','สุข','บุญ','ธาร','รุ่ง','วัฒน','พูน','คำ','ทอง','อินทร์'];
 const ends=['อารี','แก้ว','สวัสดิ์','เจริญ','กุล','มงคล','วิไล','ไพศาล','เกื้อกูล','สมบูรณ์','บำรุง','วัฒนา','ศิริ','พิทักษ์','เรืองรอง','ธารา','อำไพ','สันติ','ประเสริฐ','สุวรรณ','ร่มเย็น','กิตติ','ไชย','รุ่งเรือง','วัฒน์','มีสุข'];
 const rows=[],patients=[];
 for(const plan of plans){let serial=0;for(const [grade,count,age,baseH,baseW] of plan.grades){
  const retained=studentAttendanceDb.filter(s=>s.schoolId===plan.id&&s.gradeGroup===grade).slice(0,count);
  for(let i=0;i<count;i++){serial++;const old=retained[i],male=serial%2===0;
   const h=+(baseH+((serial*17)%121-60)/10+(age>=12?(male?3:-3):0)).toFixed(1);
   const w=+(baseW+((serial*23)%101-50)/10+(h-baseH)*.35).toFixed(1);
   const factors=serial%19===0?['asthma']:serial%13===0?['ar']:[];
   const previous=old&&allPatientsDb.find(p=>p.hosp===plan.id&&(p.cid===old.id||p.name===old.name));
   const id=old?.id||`DEMO-${plan.prefix}-${String(serial).padStart(4,'0')}`;
   const name=old?.name||`${age<=15?(male?'ด.ช.':'ด.ญ.'):(male?'นาย':'น.ส.')} ${(male?boys:girls)[serial%12]} ${roots[serial%12]}${ends[Math.floor(serial/12)%ends.length]}`;
   const health=previous?.factors||factors;
   rows.push({...old,id,name,schoolId:plan.id,schoolName:plan.name,gradeGroup:grade,gradeClass:old?.gradeClass||`${grade}/${Math.floor(i/35)+1}`,dob:old?.dob||`15 มิ.ย. ${2569-age}`,guardianContact:old?.guardianContact||'—',healthNote:old?.healthNote||(health.length?'ข้อมูลสุขภาพสมมุติ: '+health.map(k=>k==='asthma'?'หอบหืด':'ภูมิแพ้').join(', '):'None'),height:h,weight:w,measurementDate:'2026-10-29',measurementIsDemo:true,isDemo:true,status:old?.status||(['ขาด','ลา','สาย'][serial%3]&&serial%29===0?['ขาด','ลา','สาย'][serial%3]:'มา'),statusDetail:old?.statusDetail||{reason:'สถานะการเข้าเรียนสมมุติ',time:'07:45 น.',recordedBy:'ข้อมูลตัวอย่าง',actionTaken:'ติดตามตามปกติ'}});
   patients.push({...previous,cid:id,name,hosp:plan.id,hosp_name:plan.name,gender_age:`${male?'M':'F'}/${age}`,factors:[...health],height:h,weight:w,assessment_date:'2026-10-29',isDemo:true,lat:null,lng:null,station_name:null,conditions:health.join(', ')});
  }
 }}
 const schoolIds=plans.map(p=>p.id);
 studentAttendanceDb.splice(0,studentAttendanceDb.length,...studentAttendanceDb.filter(s=>!schoolIds.includes(s.schoolId)),...rows);
 allPatientsDb.splice(0,allPatientsDb.length,...allPatientsDb.filter(p=>!schoolIds.includes(p.hosp)),...patients);
 globalThis.LhsSchoolEnrollment=Object.freeze({source:'จำนวนนักเรียนตามข้อมูลผู้ใช้ ส่วนสูง/น้ำหนักและระเบียนบุคคลเป็นข้อมูลสมมุติ',plans});
})();
