(() => {
  'use strict';
  const M=LhsCareOpsModel,$=id=>document.getElementById(id),esc=entryEscape;
  const date=d=>new Date(d+'T12:00:00+07:00').toLocaleDateString('th-TH',{day:'numeric',month:'short'});
  const status={exceed:'ถึงเกณฑ์',watch:'ขอบเขตบนถึงเกณฑ์',below:'ยังไม่ถึงเกณฑ์',missing:'ข้อมูลไม่ครบ'};
  function openDraft(tasks,days,isDemo){
    const dialog=$('care-mission-dialog'),people=tasks.reduce((n,t)=>n+t.records.length,0),unverified=tasks.filter(t=>!t.confirmed).length;
    const dates=[...new Set(tasks.flatMap(t=>t.dates))].sort();
    const villageRows=new Map();for(const t of tasks){const k=LhsPolicy.village(t.moo)||'unknown';villageRows.set(k,(villageRows.get(k)||0)+1);}
    const message=`ร่างเตรียมแจ้งอาสาสมัคร · ยังไม่ส่ง\n${isDemo?'ข้อมูลบุคคลและการจับคู่ครัวเรือนสมมุติ\n':''}พยากรณ์จำลองระดับตำบลกองแขก\nวันที่คาดการณ์ถึงเกณฑ์: ${dates.map(date).join(', ')||'—'}\nเกณฑ์ PM2.5 ≥150 µg/m³ หรืออุณหภูมิ ≥38°C\nรายการเตรียมดูแล ${tasks.length} จุดบ้าน / ${people} คนเปราะบาง\n${[...villageRows.entries()].map(([moo,n])=>`${Moo(moo)}: ${n} จุด`).join('\n')}\nยังไม่ยืนยันครัวเรือนและตำแหน่ง ${unverified} จุด ต้องตรวจสอบก่อนนำไปปฏิบัติงานจริง`;
    dialog.innerHTML=`<div class="care-dialog-head"><div><span>อบต. → อาสาสมัครประจำพื้นที่</span><h3>ร่างรายการเตรียมดูแล</h3></div><button type="button" id="care-draft-close" aria-label="ปิดร่างรายการ">×</button></div><div class="care-dialog-body"><p class="care-draft-note">ร่างสำหรับตรวจทาน ยังไม่มีการส่งข้อความถึงอาสาสมัคร${isDemo?' · ข้อมูลตัวอย่าง':''}</p><label for="care-draft-message">ข้อความประกอบการประสานงาน</label><textarea id="care-draft-message" readonly rows="9"></textarea><div class="care-draft-counts"><strong>${tasks.length} จุดบ้าน</strong><span>${people} คนเปราะบาง</span><span>รอยืนยัน ${unverified} จุด</span></div><p>รายการส่งออกมีรหัสอาคารอ้างอิง วันที่ถึงเกณฑ์ และสถานะพิกัด แยกข้อมูลตัวอย่างออกจากข้อมูลทะเบียน</p></div><div class="care-dialog-actions"><span id="care-draft-feedback" role="status"></span><button type="button" id="care-draft-copy" class="entry-btn">คัดลอกข้อความ</button><button type="button" id="care-draft-export" class="entry-btn entry-btn-primary">ดาวน์โหลดรายการ CSV</button></div>`;
    $('care-draft-message').value=message;
    $('care-draft-close').onclick=()=>dialog.close();
    $('care-draft-copy').onclick=async()=>{try{await navigator.clipboard.writeText(message);$('care-draft-feedback').textContent='คัดลอกข้อความแล้ว';}catch{$('care-draft-message').select();$('care-draft-feedback').textContent='เลือกข้อความแล้ว กดคัดลอกได้';}};
    $('care-draft-export').onclick=()=>{
      const rows=[['ประเภทข้อมูล','หมู่จากทะเบียน','บ้านเลขที่','รหัสครัวเรือนตัวอย่าง','รหัสอาคารอ้างอิง','บุคคลเปราะบาง','วันที่พยากรณ์ถึงเกณฑ์','ปัจจัยสิ่งแวดล้อม','ละติจูด','ลองจิจูด','สถานะพิกัด','สถานะการแจ้ง'],...tasks.map(t=>[t.isDemo?'ข้อมูลสมมุติ':'ทะเบียน',Moo(t.moo),t.houseNo,t.key,t.records[0].buildingId||'',t.records.map(r=>[r.prefix,r.firstName,r.lastName].filter(Boolean).join(' ')).join(' / '),t.dates.join(' / '),t.hazards.map(h=>h==='pm25'?'PM2.5':'อุณหภูมิ').join(' / '),t.lat??'',t.lng??'',t.confirmed?'ยืนยันตำแหน่งแล้ว':'ยังไม่ยืนยันครัวเรือน','ร่าง ยังไม่ส่ง'])];
      const cell=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
      const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='care-plan-'+forecastConfig.issueDate+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);$('care-draft-feedback').textContent='ดาวน์โหลดร่างรายการแล้ว ยังไม่ส่งข้อความ';
    };
    dialog.showModal();
  }
  function Moo(value){return LhsPolicy.village(value)?LhsCareModel.villageLabel(LhsPolicy.village(value)):'ยังไม่ระบุหมู่บ้าน';}
  function render({days,selectedDate,actionOnly,records,visible,onDate,onAction}){
    const selected=selectedDate==='all'?days:days.filter(d=>d.date===selectedDate);
    const targets=M.tasks(visible,selected,AIR_RISK_FACTORS,TEMP_RISK_FACTORS),allExceed=days.filter(d=>d.airLevel==='exceed'||d.heatLevel==='exceed'),anyWatch=days.some(d=>d.airLevel==='watch'||d.heatLevel==='watch');
    const incomplete=days.some(d=>d.airLevel==='missing'||d.heatLevel==='missing');
    const title=allExceed.length?`เตรียมดูแลล่วงหน้า · พบค่าคาดการณ์ถึงเกณฑ์ ${allExceed.length} วัน`:incomplete?'ข้อมูลพยากรณ์ยังไม่ครบ':anyWatch?'เฝ้าระวังขอบเขตบนของพยากรณ์':'ติดตามพยากรณ์ 7 วัน';
    const demo=LhsCommunityData.mode(LhsWorkspace.context().siteId)==='demo';
    $('care-ops-board').innerHTML=`<div class="care-ops-heading"><div><span>อบต. วางแผน → ประสานอาสา → ติดตามการดูแล</span><h3>${title}</h3><p>PM2.5 ≥150 µg/m³ หรืออุณหภูมิ ≥38°C · ใช้พยากรณ์ระดับตำบลร่วมกันทั้ง 12 หมู่บ้าน</p></div><span class="care-forecast-demo">พยากรณ์จำลอง</span></div><div class="care-ops-date-row"><button type="button" class="care-all-days" data-plan-day="all" aria-pressed="${selectedDate==='all'}">ตลอด 7 วัน</button><div class="care-plan-days">${days.map(d=>`<button type="button" data-plan-day="${d.date}" aria-pressed="${selectedDate===d.date}" class="care-plan-day ${d.airLevel==='exceed'||d.heatLevel==='exceed'?'has-exceed':''}"><strong>${date(d.date)}</strong><span title="${status[d.airLevel]} · ขอบเขต ${d.pm25.lower}–${d.pm25.upper}">PM <b>${d.pm25.mean??'—'}</b><em class="is-${d.airLevel}" aria-label="${status[d.airLevel]}">${d.airLevel==='exceed'?'!':d.airLevel==='watch'?'△':'·'}</em></span><span title="${status[d.heatLevel]} · ขอบเขต ${d.temp.lower}–${d.temp.upper}">°C <b>${d.temp.mean??'—'}</b><em class="is-${d.heatLevel}" aria-label="${status[d.heatLevel]}">${d.heatLevel==='exceed'?'!':d.heatLevel==='watch'?'△':'·'}</em></span></button>`).join('')}</div></div><div class="care-ops-legend"><span><b>!</b> ค่าคาดการณ์ถึงเกณฑ์</span><span><b>△</b> เฉพาะขอบเขตบนถึงเกณฑ์ ยังไม่รวมเป็นรายการแจ้ง</span></div><div class="care-plan-action"><div><strong>${targets.length} ${demo?'จุดบ้านตัวอย่าง':'ครัวเรือน'}ควรเตรียมดูแล</strong><small>${selectedDate==='all'?'รวม 7 วัน':date(selectedDate)} · ${targets.reduce((n,t)=>n+t.records.length,0)} คนเปราะบางตามข้อมูลในมุมมองนี้ · ยังไม่ยืนยันตำแหน่ง ${targets.filter(t=>!t.confirmed).length} จุด</small></div><label><input type="checkbox" id="care-action-only" ${actionOnly?'checked':''}>เฉพาะจุดที่ควรเตรียมดูแล</label><button id="care-prepare-mission" type="button" class="entry-btn entry-btn-primary" ${targets.length?'':'disabled'}>เตรียมร่างแจ้งอาสา</button></div>`;
    $('care-ops-board').onclick=e=>{const b=e.target.closest('[data-plan-day]');if(b)onDate(b.dataset.planDay);};
    $('care-action-only').onchange=e=>onAction(e.target.checked);
    $('care-prepare-mission').onclick=()=>openDraft(targets,selected,demo);
  }
  globalThis.LhsCareOpsView=Object.freeze({render});
})();
