(() => {
  'use strict';
  const validCoordinates=r=>r.lat!==''&&r.lng!==''&&r.lat!=null&&r.lng!=null&&Number.isFinite(Number(r.lat))&&Number.isFinite(Number(r.lng))&&Number(r.lat)>=-90&&Number(r.lat)<=90&&Number(r.lng)>=-180&&Number(r.lng)<=180;
  const vulnerable=r=>Array.isArray(r.factors)&&r.factors.length>0;
  const villages=Object.freeze(['บ้านอมขูด','บ้านแม่หลุ','บ้านหัวดอย','บ้านม้งโหล่งปง','บ้านอมลาน','บ้านโม่งหลวง','บ้านกองแขก','บ้านอมเม็ง','บ้านผาผึ้ง','บ้านแม่คงคา','บ้านกองแขกใต้','บ้านนายางดิน'].map((name,i)=>Object.freeze({number:i+1,name,note:i===6?'หมู่บ้านดั้งเดิม มีวัดกองแขกเหนือ':''})));
  function villageLabel(value){const n=Number(value);return Number.isInteger(n)&&villages[n-1]?`หมู่ที่ ${n} · ${villages[n-1].name}`:'ยังไม่ระบุหมู่บ้าน';}
  function households(records,{includeGeneral=false}={}){
    const result=new Map();
    for(const record of records.filter(r=>(includeGeneral||vulnerable(r))&&validCoordinates(r))){
      const lat=Number(record.lat),lng=Number(record.lng),key=`${lat.toFixed(6)},${lng.toFixed(6)}`;
      if(!result.has(key))result.set(key,{key,lat,lng,records:[]});
      result.get(key).records.push(record);
    }
    return [...result.values()];
  }
  function demo(siteId='usr_maechaem'){
    // Public building interiors are examples only; household/village/person links remain synthetic.
    const buildings=globalThis.LhsBuildingSamples?.buildings||[];
    const villageBuildings=villages.map(v=>buildings.filter(b=>b.sampleVillage===v.number));
    const firstNames=[['มาลี','ประเสริฐ','พิมพ์ใจ','ธนกฤต','กานดา','นที'],['สมพร','บุญส่ง','นภา','ปุณณ์','อรุณี','วีระ'],['สายฝน','วิชัย','รัตนา','ภูผา','จินตนา','ณรงค์'],['ศรีนวล','สมชาย','ลลิตา','ต้นกล้า','พัชรี','อานนท์'],['คำปัน','สุรชัย','อรทัย','น้องขวัญ','ธิดา','ทวี'],['บัวแก้ว','มนตรี','วารุณี','อชิระ','ปาริชาติ','วสันต์'],['อำไพ','สินชัย','สุภาพร','ณัฐ','ดารา','ชาญ'],['เพ็ญศรี','อุดม','นิตยา','ก้องภพ','อรพิน','สันติ'],['จันทร์เพ็ญ','อำนาจ','มธุรส','ปันปัน','สุนิสา','พิเชษฐ์'],['ละออง','เกรียงไกร','พรทิพย์','ภาคิน','กมล','สถาพร'],['ประภา','ถาวร','สุชาดา','ภีม','นวลจันทร์','ปรีชา'],['ดวงใจ','สมบัติ','ชุติมา','ข้าวหอม','อารีย์','ยุทธนา']];
    const surnames=['ใจอารี','แสงเดือน','พูนสุข','ร่มเย็น','สุขสม','บุญเกื้อ','งามใจ','แสงแก้ว','มีสุข','ใจงาม','พงษ์ไพร','ศรีธาร'];
    const air=[['ar'],['rti'],['bpd']];
    const heat=[['kidney','diuretic'],['neuro'],['beta_blocker']];
    const both=[['asthma'],['chd'],['newborn','child_5']];
    const extra=[['athlete'],['obesity'],['underweight','antihistamine']];
    const original=villages.flatMap((village,i)=>Array.from({length:6},(_,j)=>{
      const house=j===4?0:j===5?4:j,id=`DEMO-KK-${String(i+1).padStart(2,'0')}-${j+1}`;
      const building=villageBuildings[i][house];
      const factors=j===0?air[i%3]:j===1?heat[i%3]:j===2?extra[i%3]:j===3?both[i%3]:[];
      const ages=[i%3===2?4:28+i*2,61+i%12,26+i*2,j===3&&i%3===2?0.5:8+i%5,38+i%10,31+i%15];
      const gender=j===1||j===5?'M':j===3&&i%3!==2?'M':'F',age=ages[j];
      const prefix=age<=15?(gender==='M'?'ด.ช.':'ด.ญ.'):gender==='M'?'นาย':'นาง';
      return {id,code:id,siteId,prefix,firstName:firstNames[i][j],lastName:surnames[i],gender,age,houseNo:`${21+i*7+house}`,moo:String(i+1),villageName:villages[i].name,tambon:'กองแขก',amphoe:'แม่แจ่ม',province:'เชียงใหม่',lat:building?.point[1]??null,lng:building?.point[0]??null,householdId:`DEMO-HH-${i*5+house+1}`,buildingId:building?.id||null,buildingFootprint:building?.ring||null,buildingSourceUrl:building?.url||null,coordinateVerification:'unverified',coordinateSource:`${building?.provider||'Public'} building example`,factors:[...factors],assessedDate:'2026-10-20',medicalNote:j>3?'ไม่พบปัจจัยเปราะบางตามรายการประเมิน':'ข้อมูลสุขภาพสมมุติเพื่อแสดงการดูแล',isDemo:true};
    }));
    const roots=['สุข','ศรี','แสง','บุญ','ใจ','พูน','ร่ม','ธาร','ดอย','ไพร','วัฒน','รุ่ง','จันทร์','แก้ว','คำ','อินทร์','ชัย','สม','เพชร','พร','ทอง','วารี','นที','อรุณ'];
    const endings=['อารี','สวัสดิ์','วัฒนา','ไพศาล','ร่มเย็น','อำไพ','เจริญ','ธารา','วิไล','กมล','พิทักษ์','เกื้อกูล','บำรุง','มงคล','ประเสริฐ','พานิช','ศิริ','เรืองรอง','กิตติ','สมบูรณ์','สุวรรณ','รุ่งเรือง','วัฒน์','สันติ','ไชย'];
    const additional=Array.from({length:600},(_,h)=>{
      const i=Math.floor(h/50),number=61+h,building=villageBuildings[i][5+h%50],members=2+h%4,pattern=h%6;
      return Array.from({length:members},(_,j)=>{
        const factors=pattern===1&&j===0?['kidney','diuretic']:pattern===2&&j===Math.min(2,members-1)?['asthma']:pattern===3&&j===1?['ar']:pattern===4&&j===0?['athlete']:pattern===5&&j===0?['neuro']:pattern===5&&j===1?['asthma']:[];
        const age=(pattern===1||pattern===5)&&j===0?63+h%25:j===0?28+h%31:j===1?26+h%29:4+(h*3+j*7)%18;
        const gender=(h+j)%2?'F':'M',prefix=age<=15?(gender==='M'?'ด.ช.':'ด.ญ.'):gender==='M'?'นาย':'นาง';
        const id=`DEMO-ADD-${String(h+1).padStart(4,'0')}-${j+1}`;
        return {id,code:id,siteId,prefix,firstName:firstNames[(i+j)%12][(h%3)*2+(gender==='M'?1:0)],lastName:roots[h%24]+endings[Math.floor(h/24)],gender,age,
          houseNo:`${121+h%50}`,moo:String(i+1),villageName:villages[i].name,tambon:'กองแขก',amphoe:'แม่แจ่ม',province:'เชียงใหม่',
          lat:building?.point[1]??null,lng:building?.point[0]??null,householdId:`DEMO-HH-${number}`,
          buildingId:building?.id||null,buildingFootprint:building?.ring||null,buildingSourceUrl:building?.url||null,
          coordinateVerification:'unverified',coordinateSource:`${building?.provider||'Public'} building example`,
          factors,assessedDate:'2026-10-20',medicalNote:factors.length?'ข้อมูลสุขภาพสมมุติเพื่อแสดงการดูแล':'ไม่พบปัจจัยเปราะบางตามรายการประเมิน',isDemo:true};
      });
    }).flat();
    return original.concat(additional);
  }
  function summarize(records){return {total:records.length,vulnerable:records.filter(vulnerable).length,general:records.filter(r=>!vulnerable(r)).length,houses:households(records,{includeGeneral:true}).length,villages:new Set(records.map(r=>Number(r.moo)).filter(n=>Number.isInteger(n)&&n>=1&&n<=12)).size};}
  function toPatient(r,role={}){return {cid:r.code,name:[r.prefix,r.firstName,r.lastName].filter(Boolean).join(' '),gender_age:`${r.gender||'—'}/${r.age??'—'}`,hosp:r.siteId,hosp_name:role.name||'',tambon:r.tambon||role.tambon||'',moo:r.moo,lat:r.lat===''?null:r.lat,lng:r.lng===''?null:r.lng,factors:[...(r.factors||[])],assessment_date:r.assessedDate,isDemo:!!r.isDemo,conditions:(r.factors||[]).join(', '),station_name:null};}
  globalThis.LhsCareModel=Object.freeze({validCoordinates,vulnerable,villages,villageLabel,households,demo,summarize,toPatient});
})();
