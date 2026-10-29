/* One population dataset feeds both the map and government station summaries. */
(() => {
  'use strict';
  const modes=new Map(),M=LhsCareModel;
  const registry=siteId=>LhsEntry.getCitizens(siteId);
  const mode=siteId=>modes.get(siteId)||(registry(siteId).length?'registry':'demo');
  const records=siteId=>mode(siteId)==='demo'?M.demo(siteId):registry(siteId);
  function setMode(siteId,value){if(['registry','demo'].includes(value))modes.set(siteId,value);}
  function renderRiskSummary(role){
    let panel=document.getElementById('community-risk-summary');
    const isGov=role.type==='Gov Office'||role.isGov;
    if(!panel&&isGov){panel=document.createElement('section');panel.id='community-risk-summary';document.getElementById('hazards-comparison-container').before(panel);}
    if(!panel)return;
    panel.hidden=!isGov;if(!isGov)return;
    const stats=M.summarize(records(role.hospcode)),source=mode(role.hospcode);
    panel.className='community-risk-summary';
    panel.setAttribute('aria-label','สรุปประชากรชุดเดียวกับแผนที่การดูแล');
    panel.innerHTML=`<div class="community-summary-head"><div><h3>ภาพรวมทะเบียนและกลุ่มเปราะบาง</h3><p>${source==='demo'?'ข้อมูลบุคคลสมมุติ · 12 หมู่บ้านกองแขก':'ข้อมูลจากทะเบียนของหน่วยงานนี้'} · ใช้ชุดเดียวกับแผนที่การดูแล</p></div><div><label for="community-risk-source">ชุดข้อมูล</label><select id="community-risk-source"><option value="demo">ข้อมูลสมมุติ 12 หมู่บ้าน</option><option value="registry">ทะเบียนของหน่วยงาน</option></select></div></div>${role.hospcode===LhsCareOpsModel.baseline.siteId?'<div class="community-baseline-reference"><span>ประชากรทั้งตำบล <strong>6,626</strong> คน</span><span>ครัวเรือนทั้งตำบล <strong>2,353</strong> ครัวเรือน</span><small>ยอดรวมเบื้องต้น แยกจากระเบียนในชุดที่เลือก</small></div>':''}<div class="community-risk-stats"><div><span>บุคคลในชุดข้อมูลนี้</span><strong>${stats.total}<small> คน</small></strong></div><div><span>กลุ่มเปราะบาง</span><strong>${stats.vulnerable}<small> คน</small></strong></div><div><span>กลุ่มทั่วไป</span><strong>${stats.general}<small> คน</small></strong></div><div><span>หมู่บ้านที่มีข้อมูล</span><strong>${stats.villages}<small> / 12 หมู่บ้าน</small></strong></div></div><div class="community-summary-foot"><p>กลุ่มทั่วไปคือผู้ที่ไม่พบปัจจัยเปราะบางตามรายการประเมิน จำนวนกลุ่มเสี่ยงของแต่ละสถานีด้านล่างแยกตามเกณฑ์ฝุ่นและความร้อน</p><button type="button" id="community-open-map" class="entry-btn entry-btn-small">ดูแผนที่การดูแล</button></div>`;
    const select=document.getElementById('community-risk-source');select.value=source;
    select.onchange=()=>{setMode(role.hospcode,select.value);filterPatients();};
    document.getElementById('community-open-map').onclick=()=>switchDashboardTab('care-map');
  }
  globalThis.LhsCommunityData=Object.freeze({mode,setMode,records,patients(role){return records(role.hospcode).map(r=>M.toPatient(r,role));},renderRiskSummary});
})();
