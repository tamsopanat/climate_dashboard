/* Browser-local data entry prototype. Uses the dashboard's existing scopes and risk factors. */
(() => {
  'use strict';
  const STORAGE_KEY = 'lhs_data_entry_v1';
  const $ = (s, root = document) => root.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.entryEscape = esc;
  const icon = (name, size = 19) => {
    const paths = {
      edit:'<path d="m16 3 5 5M4 20l4-1L21 6l-5-5L3 14l-1 7z"/>',
      school:'<path d="m2 9 10-5 10 5-10 5zM6 11v7c4 3 8 3 12 0v-7M22 9v7"/>',
      gov:'<path d="m3 8 9-5 9 5H3zM5 10v9m7-9v9m7-9v9M3 21h18"/>',
      heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/><path d="M5 12h4l2-4 2 8 2-4h4"/>',
      person:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
      check:'<path d="m5 12 4 4L19 6"/>',
      arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
      save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2zM7 3v6h10V3M7 21v-8h10v8"/>',
      pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
      list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.edit}</svg>`;
  };
  const dateNow = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const timeNow = () => new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  const displayDate = d => d ? new Intl.DateTimeFormat('th-TH', {dateStyle:'medium',timeZone:'Asia/Bangkok'}).format(new Date(`${d}T12:00:00+07:00`)) : '—';
  const uid = prefix => `${prefix}-${crypto.randomUUID().slice(0,12)}`;
  let storageError = false;
  let state = {students:[], citizens:[], visits:[], drafts:{}};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      for (const key of ['students','citizens','visits']) if (!Array.isArray(parsed[key])) throw Error('Invalid saved data');
      state = {...state, ...parsed, drafts:parsed.drafts || {}};
    }
  } catch { storageError = true; }
  let scope = 'school', kind = 'infirmary', siteId = 'usr_saraphi', map = null, marker = null;
  let pendingFocus = false, layoutObserver=null;
  const attendanceBaseline = new Map(studentAttendanceDb.map(s=>[`${s.schoolId}:${s.id}`,{status:s.status,statusDetail:{...s.statusDetail}}]));
  const key = () => `${scope}:${kind}:${siteId}`;
  const entryRoute = () => scope==='gov'?'#input-gov':kind==='student'?'#input-student':'#input-infirmary';
  const getDraft = () => state.drafts[key()] || {};
  const activeSite = () => userSites.find(s => s.id === siteId);
  const localStudents = () => studentAttendanceDb.filter(s => s.schoolId === siteId);
  const field = (name, label, o = {}) => {
    const id = `entry-${name}`;
    const req = o.required ? ' required' : '';
    const attrs = `id="${id}" name="${name}"${req}${o.readonly ? ' readonly' : ''}${o.min != null ? ` min="${esc(o.min)}"` : ''}${o.max != null ? ` max="${esc(o.max)}"` : ''}${o.step ? ` step="${o.step}"` : ''}${o.pattern ? ` pattern="${esc(o.pattern)}"` : ''}${o.autocomplete ? ` autocomplete="${o.autocomplete}"` : ''} maxlength="${o.maxlength || 250}" aria-describedby="${id}-help"`;
    let control;
    if (o.options) control = `<select ${attrs}>${o.options.map(x => `<option value="${esc(Array.isArray(x) ? x[0] : x)}">${esc(Array.isArray(x) ? x[1] : x)}</option>`).join('')}</select>`;
    else if (o.area) control = `<textarea ${attrs} rows="3" placeholder="${esc(o.placeholder || '')}"></textarea>`;
    else control = `<input ${attrs} type="${o.type || 'text'}" placeholder="${esc(o.placeholder || '')}"${o.inputmode ? ` inputmode="${o.inputmode}"` : ''}>`;
    return `<div class="entry-field${o.wide ? ' wide' : ''}"><label for="${id}"><span>${label}${o.required ? '<em aria-hidden="true">*</em>' : ''}</span>${!o.required ? '<span class="entry-optional">ไม่บังคับ</span>' : ''}</label>${control}<small id="${id}-help">${o.help || ''}</small></div>`;
  };
  const section = (n, title, content) => `<section class="entry-form-section" aria-labelledby="entry-section-${n}"><h4 id="entry-section-${n}" class="entry-section-title" tabindex="-1"><b aria-hidden="true">${n}</b>${title}</h4>${content}</section>`;
  const grid = content => `<div class="entry-form-grid">${content}</div>`;
  const phoneOptions = {type:'tel',inputmode:'tel',pattern:'[0-9+\\(\\) \\-]{9,20}',maxlength:20,placeholder:'เช่น 081-234-5678',help:'กรอก 9–20 ตัวอักษร ใช้ตัวเลข + - และวงเล็บได้'};
  const prefixes = [['','ไม่ระบุ'],'ด.ช.','ด.ญ.','นาย','นาง','น.ส.'];
  const genderOptions = [['','เลือกเพศ'],['M','ชาย'],['F','หญิง'],['X','ไม่ระบุ']];
  const groups = [
    ['กลุ่มอายุและสรีรวิทยา',['newborn','child_5','athlete','obesity','underweight']],
    ['โรคประจำตัวและประวัติสุขภาพ',['bpd','rti','asthma','ar','chd','kidney','neuro']],
    ['ประวัติการใช้ยา',['beta_blocker','antihistamine','diuretic']],
  ];
  function clinicalSection(n) {
    return section(n, 'การประเมินปัจจัยเปราะบางทางคลินิก', `<p class="entry-muted" style="font-size:12px;margin:-4px 0 14px">เลือกรายการตามข้อมูลที่ได้รับ ใช้เกณฑ์เดียวกับหน้ากลุ่มเสี่ยง</p><fieldset><legend class="entry-label" style="font-size:12px;font-weight:600;margin-bottom:9px">ผลการซักประวัติ <em style="color:#b64155">*</em></legend><div class="entry-factor-options"><label class="entry-check"><input type="radio" name="assessment" value="none" required>ไม่พบปัจจัยตามรายการ</label><label class="entry-check"><input type="radio" name="assessment" value="has" required>พบปัจจัยเปราะบาง</label></div></fieldset><div id="entry-factor-fields" hidden>${groups.map(([name, keys]) => `<fieldset class="entry-factor-group"><legend><h4>${name}</h4></legend><div class="entry-check-grid">${keys.map(k => `<label class="entry-check"><input type="checkbox" name="factors" value="${k}">${esc(VULNERABILITY_DEF[k].th)}</label>`).join('')}</div></fieldset>`).join('')}</div><div style="margin-top:18px">${grid(field('medicalNote','ประวัติสุขภาพเพิ่มเติม',{area:true,wide:true,placeholder:'เช่น โรคประจำตัว ยาที่ใช้ หรือรายละเอียดประกอบการประเมิน',maxlength:1500})+field('allergies','ประวัติแพ้ยา / อาหาร',{placeholder:'ระบุรายการที่แพ้ หรือไม่ทราบ'})+field('medicines','ยาที่ใช้ประจำ',{placeholder:'ชื่อยาและข้อมูลที่ได้รับ'}))}</div>`);
  }
  function identityFields(isStudent) {
    return field('code',isStudent ? 'รหัสนักเรียน' : 'รหัสบุคคล / เลขอ้างอิง',{required:isStudent,readonly:!!getDraft().editing,placeholder:isStudent ? 'เช่น SP-690001' : 'เว้นว่างเพื่อสร้างรหัสอัตโนมัติ',pattern:'[A-Za-z0-9_\\-]{2,40}',maxlength:40,help:'ใช้ตัวอักษรอังกฤษ ตัวเลข - หรือ _'})+
      field('prefix','คำนำหน้าชื่อ',{options:prefixes})+
      field('firstName','ชื่อ',{required:true,autocomplete:'given-name',placeholder:'ชื่อจริง'})+
      field('lastName','นามสกุล',{required:true,autocomplete:'family-name',placeholder:'นามสกุล'})+
      field('dob','วันเดือนปีเกิด',{required:true,type:'date',min:'1900-01-01',max:dateNow(),help:'ใช้คำนวณอายุเมื่อแสดงในหน้ากลุ่มเสี่ยง'})+
      field('gender','เพศ',{required:true,options:genderOptions});
  }
  function studentForm() {
    return section(1,'ข้อมูลนักเรียน',grid(field('existingStudent','เลือกนักเรียนเพื่อแก้ไข หรือเพิ่มคนใหม่',{wide:true,options:[['','เพิ่มนักเรียนใหม่'],...localStudents().map(s => [s.id,`${s.id} · ${s.name} · ${s.gradeClass}`])],help:'รหัสเดิมจะอัปเดตข้อมูลคนเดิม โดยไม่เพิ่มรายชื่อซ้ำ'})+identityFields(true)+field('grade','ระดับชั้น',{required:true,options:[['','เลือกระดับชั้น'],'อนุบาล 1','อนุบาล 2','อนุบาล 3','ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6']})+field('room','ห้อง',{required:true,type:'number',min:1,max:99,step:1,placeholder:'เช่น 2'})+field('height','ส่วนสูง (ซม.)',{type:'number',min:30,max:250,step:0.1,placeholder:'เช่น 145.5'})+field('weight','น้ำหนัก (กก.)',{type:'number',min:1,max:400,step:0.1,placeholder:'เช่น 38.2'})+field('measurementDate','วันที่ชั่งน้ำหนัก / วัดส่วนสูง',{type:'date',max:dateNow(),wide:true,help:'บันทึกค่าที่วัดได้ พร้อมวันที่วัด'})))+
      section(2,'ข้อมูลผู้ปกครองและการติดต่อ',grid(field('guardianName','ชื่อ–นามสกุลผู้ปกครอง',{required:true,placeholder:'ชื่อผู้ติดต่อหลัก'})+field('relation','ความสัมพันธ์',{required:true,options:[['','เลือกความสัมพันธ์'],'บิดา','มารดา','ญาติ','ผู้ดูแล','อื่น ๆ']})+field('phone','เบอร์ติดต่อผู้ปกครอง',{...phoneOptions,required:true})+field('email','อีเมล',{type:'email',autocomplete:'email',placeholder:'name@example.com'})))+
      clinicalSection(3)+section(4,'ข้อมูลการบันทึก',grid(field('assessedDate','วันที่ประเมิน',{type:'date',required:true,max:dateNow()})+field('recorder','ชื่ออาจารย์ผู้บันทึก',{required:true,placeholder:'ชื่อ–นามสกุลผู้บันทึก'})));
  }
  function infirmaryForm() {
    return section(1,'นักเรียนที่เข้าใช้บริการ',grid(field('studentId','เลือกนักเรียน',{required:true,wide:true,options:[['','ค้นหาจากชื่อ รหัสนักเรียน หรือชั้นเรียน'],...localStudents().map(s => [s.id,`${s.id} · ${s.name} · ${s.gradeClass}`])],help:'หากยังไม่มีรายชื่อ ให้เพิ่มในแท็บทะเบียนนักเรียนก่อน'})+'<div id="entry-student-preview" class="entry-student-info"><div class="entry-avatar">—</div><div><strong>เลือกนักเรียนเพื่อดูข้อมูลประกอบ</strong><p>ชั้นเรียน ประวัติสุขภาพ และเบอร์ติดต่อผู้ปกครอง</p></div></div>'+field('visitDate','วันที่เข้าใช้บริการ',{type:'date',required:true,max:dateNow()})+field('arrival','เวลาเข้า',{type:'time',required:true})))+
      section(2,'อาการและการดูแล',`<fieldset><legend style="font-size:12px;font-weight:600;margin-bottom:12px">อาการเบื้องต้น (เลือกได้มากกว่า 1 ข้อ)</legend><div class="entry-check-grid">${['ไอ / เจ็บคอ','หายใจลำบาก / แน่นหน้าอก','ปวดศีรษะ / เวียนศีรษะ','มีไข้ / อ่อนเพลีย','คลื่นไส้ / ปวดท้อง','บาดเจ็บ / อุบัติเหตุ'].map(s => `<label class="entry-check"><input type="checkbox" name="symptoms" value="${s}">${s}</label>`).join('')}</div></fieldset><div style="margin-top:18px">${grid(field('reason','รายละเอียดอาการ / เหตุผลที่เข้าใช้บริการ',{required:true,area:true,wide:true,maxlength:1500,placeholder:'ระบุอาการที่พบ ช่วงเวลาที่เริ่มมีอาการ หรือเหตุผลในการเข้าห้องพยาบาล'})+field('bodyTemp','อุณหภูมิร่างกาย (°C)',{type:'number',min:30,max:45,step:0.1,placeholder:'เช่น 37.5',help:'กรอกเมื่อมีการวัดอุณหภูมิ'})+field('medicine','ยา / การดูแลที่ได้รับ',{placeholder:'ระบุตามที่ให้การดูแลจริง'})+field('care','การดูแลและการดำเนินการ',{required:true,area:true,wide:true,maxlength:1500,placeholder:'บันทึกการดูแล การประสานงาน หรือการส่งต่อที่ดำเนินการแล้ว'}))}</div>`)+
      section(3,'ผลการดูแลและผู้บันทึก',grid(field('outcome','สถานะหลังรับบริการ',{required:true,options:[['infirmary','ยังพักในห้องพยาบาล'],['class','กลับเข้าห้องเรียน'],['home','ผู้ปกครองรับกลับบ้าน'],['referral','ส่งต่อสถานพยาบาล']]})+field('departure','เวลาออก',{type:'time',help:'ต้องระบุเมื่อสิ้นสุดการใช้บริการ'})+field('recorder','ชื่อผู้บันทึก / ผู้ดูแล',{required:true,placeholder:'ชื่อ–นามสกุล'})+field('guardianNotice','การติดต่อผู้ปกครอง',{required:true,options:[['','เลือกสถานะการติดต่อ'],'ยังไม่ได้ติดต่อ','ติดต่อแล้ว','ติดต่อไม่สำเร็จ','ไม่จำเป็นต้องติดต่อ']})))+
      `<div class="entry-form-section" style="padding-top:14px;padding-bottom:14px"><p class="entry-muted" style="font-size:11px;margin:0">บันทึกของวันนี้จะอัปเดตสถานะในหน้าข้อมูลนักเรียน ประวัติวันอื่นเก็บในรายการใช้ห้องพยาบาล</p></div>`;
  }
  function govForm() {
    return section(1,'ข้อมูลประชาชนและการติดต่อ',grid(identityFields(false)+field('phone','เบอร์โทรศัพท์',{...phoneOptions,required:true})+field('contactName','ชื่อผู้ติดต่อสำรอง / ผู้ดูแล',{placeholder:'ชื่อ–นามสกุล'})+field('contactPhone','เบอร์โทรศัพท์สำรอง',phoneOptions)+field('email','อีเมล',{type:'email',placeholder:'name@example.com'})))+
      section(2,'ที่อยู่และตำแหน่งบ้าน',grid(field('houseNo','บ้านเลขที่',{required:true,placeholder:'เช่น 125/4'})+field('moo','หมู่บ้านในตำบลกองแขก',{required:true,options:[['','เลือกหมู่บ้าน'],...LhsCareModel.villages.map(v=>[String(v.number),LhsCareModel.villageLabel(v.number)])],help:'เลือกหมู่ที่ 1–12 เพื่อจัดกลุ่มในแผนที่การดูแล'})+field('road','ถนน / ซอย',{placeholder:'ถนนหรือซอย (ถ้ามี)'})+field('tambon','ตำบล / แขวง',{required:true,placeholder:'เช่น กองแขก'})+field('amphoe','อำเภอ / เขต',{required:true,placeholder:'เช่น แม่แจ่ม'})+field('province','จังหวัด',{required:true,placeholder:'เช่น เชียงใหม่'})+field('postcode','รหัสไปรษณีย์',{pattern:'[0-9]{5}',maxlength:5,inputmode:'numeric',placeholder:'เช่น 50270'})+field('landmark','จุดสังเกต / รายละเอียดที่อยู่',{placeholder:'เช่น บ้านใกล้วัด ทางเข้าฝั่งทิศเหนือ'})+field('lat','ละติจูด',{required:true,type:'number',min:-90,max:90,step:'any',placeholder:'เช่น 18.520400',help:'ค่าระหว่าง -90 ถึง 90'})+field('lng','ลองจิจูด',{required:true,type:'number',min:-180,max:180,step:'any',placeholder:'เช่น 98.420300',help:'ค่าระหว่าง -180 ถึง 180'}))+`<div id="entry-location-map" class="entry-map" role="region" aria-label="แผนที่เลือกตำแหน่งบ้าน"></div><p class="entry-map-help">${icon('pin',15)}คลิกแผนที่หรือกรอกพิกัดเพื่อระบุตำแหน่งบ้าน ปรับตำแหน่งได้ด้วยการลากหมุด</p>`)+
      clinicalSection(3)+section(4,'ข้อมูลการประเมิน',grid(field('assessedDate','วันที่ประเมิน',{type:'date',required:true,max:dateNow()})+field('recorder','ชื่อเจ้าหน้าที่ผู้บันทึก',{required:true,placeholder:'ชื่อ–นามสกุล'})));
  }
  function capture() {
    const form = $('#entry-form');
    if (!form) return {};
    const data = {...getDraft()};
    for (const el of form.elements) {
      if (!el.name || ['factors','symptoms'].includes(el.name) || el.type === 'radio') continue;
      data[el.name] = el.value.trim();
    }
    data.assessment = $('input[name=assessment]:checked',form)?.value || '';
    data.factors = [...form.querySelectorAll('input[name=factors]:checked')].map(e => e.value);
    data.symptoms = [...form.querySelectorAll('input[name=symptoms]:checked')].map(e => e.value);
    state.drafts[key()] = data;
    return data;
  }
  function fill(data) {
    const form = $('#entry-form');
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'radio') el.checked = data[el.name] === el.value;
      else if (el.type === 'checkbox') el.checked = (data[el.name] || []).includes(el.value);
      else if(el.name==='moo') el.value=String(LhsPolicy.village(data.moo) || '');
      else el.value = data[el.name] ?? '';
    }
    if ($('#entry-factor-fields')) $('#entry-factor-fields').hidden = data.assessment !== 'has';
    if ($('#entry-departure')) updateDeparture((data.outcome || 'infirmary') !== 'infirmary');
    updateStudentPreview(); updateSummary();
  }
  function alertMessage(message, type = 'success', actions = '') {
    const box = $('#entry-feedback');
    box.dataset.kind = type; box.innerHTML = `${esc(message)}${actions ? `<div>${actions}</div>` : ''}`; box.hidden = false;
    box.focus({preventScroll:true}); box.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function persist() {
    if (storageError) {alertMessage('ไม่สามารถอ่านข้อมูลที่เก็บไว้ได้ จึงยังไม่เขียนทับข้อมูลเดิม กรุณาใช้เบราว์เซอร์ที่เปิดการจัดเก็บข้อมูลไว้','error');return false;}
    try {state.lastContext={scope,kind,siteId};localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}
    catch {alertMessage('ยังบันทึกไม่ได้ พื้นที่จัดเก็บของเบราว์เซอร์อาจเต็มหรือถูกปิดไว้ กรุณาเปิดการจัดเก็บข้อมูลแล้วลองอีกครั้ง ข้อมูลในฟอร์มยังอยู่','error');return false;}
  }
  function updateStudentPreview() {
    const box = $('#entry-student-preview'); if (!box) return;
    const student = studentAttendanceDb.find(s => s.schoolId === siteId && s.id === $('#entry-studentId')?.value);
    if (!student) return;
    box.innerHTML = `<div class="entry-avatar">${esc(student.name.replace(/^(ด\.ช\.|ด\.ญ\.|นาย|นาง|น\.ส\.)\s*/,'').slice(0,1))}</div><div><strong>${esc(student.name)}</strong><p>${esc(student.gradeClass)} · รหัส ${esc(student.id)} · ผู้ปกครอง ${esc(student.guardianContact || 'ยังไม่ระบุ')}</p><p>ประวัติสุขภาพ: ${esc(student.healthNote === 'None' ? 'ไม่พบข้อมูลในประวัติ' : student.healthNote || 'ยังไม่ระบุ')}</p></div>`;
  }
  function updateDeparture(required) {
    const departure=$('#entry-departure');if(!departure)return;
    departure.required=required;
    const label=departure.previousElementSibling;
    label.innerHTML=`<span>เวลาออก${required?'<em aria-hidden="true">*</em>':''}</span>${required?'':'<span class="entry-optional">ไม่บังคับ</span>'}`;
  }
  function updateSummary() {
    const f = $('#entry-form'); if (!f) return;
    const value = n => f.elements.namedItem(n)?.value || '';
    const student = studentAttendanceDb.find(s => s.schoolId === siteId && s.id === value('studentId'));
    const name = kind === 'infirmary' ? student?.name : [value('prefix'),value('firstName'),value('lastName')].filter(Boolean).join(' ');
    $('#entry-summary-name').textContent = name || 'ยังไม่ระบุชื่อ';
    $('#entry-summary-scope').textContent = activeSite()?.name || '';
    $('#entry-summary-code').textContent = value(kind === 'infirmary' ? 'studentId' : 'code') || 'สร้างเมื่อบันทึก';
    $('#entry-summary-date').textContent = displayDate(value(kind === 'infirmary' ? 'visitDate' : 'assessedDate'));
    const count = f.querySelectorAll('input[name=factors]:checked').length;
    $('#entry-summary-factors').textContent = kind === 'infirmary' ? (value('outcome') === 'infirmary' ? 'พักในห้องพยาบาล' : 'สิ้นสุดการใช้บริการ') : value('assessment') === 'none' ? 'ไม่พบปัจจัยตามรายการ' : value('assessment') === 'has' ? `${count} ปัจจัยที่ระบุ` : 'รอการซักประวัติ';
  }
  function initMap() {
    if (kind !== 'citizen' || typeof L === 'undefined') return;
    const site = activeSite(); const draft = getDraft();
    const coords = draft.lat && draft.lng ? [Number(draft.lat),Number(draft.lng)] : [site?.lat || 18.52,site?.lng || 98.42];
    map = L.map('entry-location-map',{scrollWheelZoom:false}).setView(coords,14);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Tiles © Esri',maxZoom:19}).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
    const pin = pos => {
      if (marker) marker.setLatLng(pos);
      else {marker=L.marker(pos,{draggable:true}).addTo(map);marker.on('dragend',()=>setPoint(marker.getLatLng()));}
    };
    function setPoint(pos) {
      $('#entry-lat').value=Number(pos.lat).toFixed(6); $('#entry-lng').value=Number(pos.lng).toFixed(6);
      pin([pos.lat,pos.lng]); capture(); updateSummary();
    }
    map.on('click',e=>setPoint(e.latlng));
    if (draft.lat && draft.lng) pin(coords);
    for (const name of ['lat','lng']) $(`#entry-${name}`).addEventListener('change',()=>{
      const lat=$('#entry-lat'),lng=$('#entry-lng');
      if (lat.value && lng.value && lat.checkValidity() && lng.checkValidity()) {pin([Number(lat.value),Number(lng.value)]);map.setView([Number(lat.value),Number(lng.value)],map.getZoom());}
    });
    setTimeout(()=>map?.invalidateSize(),100);
  }
  function updateEntryOffsets(){
    const panel=$('#panel-input'),nav=$('.entry-section-nav',panel);if(!nav)return;
    const mobile=$('#mobile-tabs-container')?.parentElement;
    const top=matchMedia('(max-width:767px)').matches?(mobile?.getBoundingClientRect().height||0)+8:12;
    panel.style.setProperty('--entry-sticky-top',top+'px');
    panel.style.setProperty('--entry-section-offset',(top+nav.getBoundingClientRect().height+20)+'px');
  }
  window.addEventListener('resize',updateEntryOffsets);
  function render() {
    if (map) {map.remove();map=null;marker=null;}
    const isVisit = kind === 'infirmary', isCitizen = kind === 'citizen';
    const title = isVisit ? 'บันทึกการใช้ห้องพยาบาล' : isCitizen ? 'ทะเบียนประชาชนและปัจจัยเปราะบาง' : 'ทะเบียนนักเรียนและข้อมูลสุขภาพ';
    const desc = isVisit ? 'ระบุนักเรียน อาการ และการดูแลในแต่ละครั้งที่เข้าใช้บริการ' : isCitizen ? 'เก็บข้อมูลติดต่อ ตำแหน่งบ้าน และประวัติ เพื่อปรับยอดเฝ้าระวังตามสถานีในพื้นที่' : 'บันทึกครั้งเดียว เชื่อมข้อมูลไปยังหน้าข้อมูลนักเรียนและหน้ากลุ่มเสี่ยง';
    const draft = getDraft();
    const sectionLabels=isVisit?['นักเรียนและเวลา','อาการและการดูแล','ผลการดูแล']:isCitizen?['ข้อมูลประชาชน','ที่อยู่และพิกัด','ปัจจัยเปราะบาง','ผู้บันทึก']:['ข้อมูลนักเรียน','ผู้ปกครอง','ข้อมูลสุขภาพ','ผู้บันทึก'];
    $('#panel-input').dataset.entryKind=kind;
    $('#panel-input').innerHTML = `<div class="entry-heading"><div><div class="entry-eyebrow">${isCitizen?'งานทะเบียนประชาชน':'งานดูแลนักเรียน'}</div><h2>บันทึกข้อมูล</h2><p>${isCitizen?'ข้อมูลประชาชน สุขภาพ และตำแหน่งบ้านในพื้นที่ดูแล':'บันทึกการใช้ห้องพยาบาล หรือจัดการทะเบียนและสุขภาพนักเรียน'}</p></div><button type="button" class="entry-btn" data-action="history">${icon('list')}รายการที่บันทึก</button></div>
      ${scope==='school'?`<div class="entry-tabs" role="tablist" aria-label="แบบฟอร์มสถานศึกษา"><button id="entry-tab-infirmary" type="button" role="tab" aria-controls="entry-form-card" data-kind="infirmary" aria-selected="${isVisit}">${icon('heart',24)}<span><strong>บันทึกห้องพยาบาล</strong><small>อาการ การดูแล และผลการใช้บริการ</small></span></button><button id="entry-tab-student" type="button" role="tab" aria-controls="entry-form-card" data-kind="student" aria-selected="${!isVisit}">${icon('person',24)}<span><strong>ทะเบียนนักเรียนและสุขภาพ</strong><small>ข้อมูลนักเรียน ผู้ปกครอง และประวัติสุขภาพ</small></span></button></div>`:''}
      <div id="entry-feedback" class="entry-alert" role="status" tabindex="-1" hidden></div><div class="entry-layout"><div><div class="entry-card" id="entry-form-card"${scope==='school'?` role="tabpanel" aria-labelledby="entry-tab-${kind}"`:''}>
      <div class="entry-card-top"><div><h3>${draft.editing?'แก้ไข · ':''}${title}</h3><p>${desc}</p></div><div class="entry-type-icon">${icon(isVisit?'heart':isCitizen?'gov':'person',23)}</div></div>
      <nav class="entry-section-nav" aria-label="ไปยังหมวดในแบบฟอร์ม">${sectionLabels.map((label,i)=>`<button type="button" data-section="${i+1}"><b>${i+1}</b><span>${label}</span></button>`).join('')}</nav>
      <form id="entry-form"><input type="hidden" name="editing" value="${esc(draft.editing || '')}">${isVisit?infirmaryForm():isCitizen?govForm():studentForm()}<div class="entry-form-footer"><span class="entry-footer-note"><strong>ตรวจข้อมูลก่อนบันทึก</strong><span>ช่องที่มี * จำเป็นต้องกรอก</span></span><div class="entry-footer-actions"><button type="button" class="entry-btn" data-action="draft">เก็บแบบร่าง</button><button type="submit" class="entry-btn entry-btn-primary">${icon('save',16)}${draft.editing?'บันทึกการแก้ไข':isVisit?'บันทึกการใช้บริการ':isCitizen?'บันทึกข้อมูลประชาชน':'บันทึกข้อมูลนักเรียน'}</button></div></div></form></div></div>
      <aside class="entry-aside"><div class="entry-card"><h4>สรุปข้อมูลที่กำลังบันทึก</h4><span class="entry-summary-label">${isVisit?'นักเรียนที่เข้าใช้บริการ':isCitizen?'ชื่อประชาชน':'ชื่อนักเรียน'}</span><div class="entry-summary-name" id="entry-summary-name">ยังไม่ระบุชื่อ</div><p id="entry-summary-scope"></p><div class="entry-summary-row"><span>รหัสอ้างอิง</span><strong id="entry-summary-code"></strong></div><div class="entry-summary-row"><span>${isVisit?'วันที่ใช้บริการ':'วันที่ประเมิน'}</span><strong id="entry-summary-date"></strong></div><div class="entry-summary-row"><span>${isVisit?'ผลการดูแล':'ประวัติสุขภาพ'}</span><strong id="entry-summary-factors"></strong></div><button type="button" data-action="new" class="entry-link" style="margin:10px 0 0;display:block">เริ่มรายการใหม่</button></div>
      <details class="entry-card entry-help"><summary>เปิดหน้าข้อมูลที่เกี่ยวข้อง</summary><div class="entry-help-content">${!isCitizen?`<div class="entry-flow">${icon('school')}<div>หน้าข้อมูลนักเรียน<small>${isVisit?'อัปเดตสถานะวันนี้และประวัติการดูแล':'เพิ่มรายชื่อ ชั้นเรียน และผู้ปกครอง'}</small></div></div>`:''}${!isVisit?`<div class="entry-flow">${icon('heart')}<div>หน้ากลุ่มเสี่ยง<small>${isCitizen?'ปรับยอดกลุ่มเปราะบางตามสถานีใกล้พิกัดบ้าน':'แสดงในกลุ่มเสี่ยงเมื่อเข้าเกณฑ์เดิมของระบบ'}</small></div></div>`:''}<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${!isCitizen?'<button class="entry-btn entry-btn-small" type="button" data-action="view-student">ดูข้อมูลนักเรียน</button>':''}<button class="entry-btn entry-btn-small" type="button" data-action="view-risk">ดูกลุ่มเสี่ยง</button>${isCitizen?'<button class="entry-btn entry-btn-small" type="button" data-action="view-care">ดูแผนที่การดูแล</button>':''}</div></div></details>
      <details class="entry-card entry-help"><summary>ข้อมูลตัวอย่างและการจัดเก็บ</summary><div class="entry-help-content"><button type="button" data-action="sample" class="entry-btn entry-btn-small">เติมข้อมูลตัวอย่าง</button><p style="margin-top:12px">ข้อมูลเก็บเฉพาะเบราว์เซอร์นี้ ยังไม่ซิงก์ไปยังอุปกรณ์หรือผู้ใช้อื่น และไม่มีการส่งข้อความจริง</p></div></details></aside></div><div id="entry-history" class="entry-card entry-history"></div>`;
    const defaults = {visitDate:dateNow(),arrival:timeNow(),outcome:'infirmary',assessedDate:dateNow(),...draft};
    fill(defaults); capture();
    $('#entry-form').addEventListener('submit',submit);
    $('#entry-form').addEventListener('input',()=>{capture();updateSummary();});
    $('#entry-form').addEventListener('change',e=>{
      if(e.target.name==='assessment') {
        $('#entry-factor-fields').hidden=e.target.value!=='has';
        if(e.target.value==='none') $('#entry-form').querySelectorAll('[name=factors]').forEach(c=>c.checked=false);
      }
      if(e.target.name==='outcome') updateDeparture(e.target.value!=='infirmary');
      if(e.target.name==='studentId') updateStudentPreview();
      if(e.target.name==='existingStudent') {loadStudent(e.target.value);return;}
      capture();updateSummary();
    });
    const panel=$('#panel-input');
    panel.onclick = e => {
      const button=e.target.closest('button');if(!button)return;
      if(button.dataset.section){updateEntryOffsets();const heading=$(`#entry-section-${button.dataset.section}`);heading?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});heading?.focus({preventScroll:true});}
      if(button.dataset.kind){capture();kind=button.dataset.kind;render();}
      if(button.dataset.action) action(button.dataset.action,button.dataset.id);
    };
    panel.querySelectorAll('[role=tab]').forEach(tab=>{tab.tabIndex=tab.getAttribute('aria-selected')==='true'?0:-1;tab.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();capture();kind=kind==='infirmary'?'student':'infirmary';render();$(`[data-kind="${kind}"]`)?.focus();}});});
    renderHistory();initMap();
    layoutObserver?.disconnect();layoutObserver=new ResizeObserver(updateEntryOffsets);
    layoutObserver.observe($('.entry-section-nav'));const mobile=$('#mobile-tabs-container')?.parentElement;if(mobile)layoutObserver.observe(mobile);
    requestAnimationFrame(updateEntryOffsets);
    if(!$('#panel-input').classList.contains('hidden'))window.LhsWorkspace?.entryChanged(kind);
    if(storageError) alertMessage('ไม่สามารถอ่านข้อมูลที่เก็บในเบราว์เซอร์ได้ ขณะนี้ยังดูแบบฟอร์มได้ แต่ยังบันทึกทับข้อมูลเดิมไม่ได้','error');
    if(pendingFocus){pendingFocus=false;$('#entry-form-card').scrollIntoView({behavior:'smooth',block:'start'});}
  }
  function age(dob) {const [y,m,d]=dob.split('-').map(Number),[ty,tm,td]=dateNow().split('-').map(Number);return Math.max(0,ty-y-((tm<m||(tm===m&&td<d))?1:0));}
  const fullName = r => [r.prefix,r.firstName,r.lastName].filter(Boolean).join(' ');
  function applyPerson(r,isStudent) {
    const schoolId=r.siteId;
    const hospital=HOSPITAL_ROLES.find(h=>h.hospcode===schoolId);
    const name=fullName(r), conditions=r.factors.map(k=>VULNERABILITY_DEF[k]?.th || k).join(', ');
    const patient={cid:r.code,name,gender_age:`${r.gender}/${age(r.dob)}`,hosp:schoolId,hosp_name:hospital?.name || '',tambon:hospital?.tambon || '',pm25:hospital?.pm25 || 0,temp:hospital?.temp || 0,conditions,factors:r.factors,assessment_date:r.assessedDate,moo:r.moo,phone:r.phone,contactName:r.contactName,contactPhone:r.contactPhone,address:r.address || [r.houseNo,r.moo,r.road,r.tambon,r.amphoe,r.province,r.postcode].filter(Boolean).join(' '),lat:r.lat?Number(r.lat):hospital?.lat,lng:r.lng?Number(r.lng):hospital?.lng,entryManaged:true,station_name:null,_nearestStation:null,...(isStudent?{isStudent:true,classroom:`${r.grade}/${r.room}`}:{})};
    let existing=allPatientsDb.find(p=>p.hosp===schoolId && (p.cid===r.code || (r.originalRiskCid && p.cid===r.originalRiskCid)));
    if(existing)Object.assign(existing,patient);else allPatientsDb.push(patient);
    if(isStudent){
      const previous=studentAttendanceDb.find(s=>s.id===r.code && s.schoolId===schoolId);
      const student={id:r.code,name,schoolId,schoolName:hospital?.name || '',gradeClass:`${r.grade}/${r.room}`,gradeGroup:r.grade,height:r.height?Number(r.height):null,weight:r.weight?Number(r.weight):null,measurementDate:r.measurementDate || '',dob:displayDate(r.dob),guardianContact:r.phone,healthNote:[conditions,r.medicalNote,r.allergies?`แพ้ยา/อาหาร: ${r.allergies}`:''].filter(Boolean).join(' · ') || 'ไม่มีปัจจัยตามรายการ',status:previous?.status || 'มา',statusDetail:previous?.statusDetail || {reason:'เพิ่มข้อมูลทะเบียนนักเรียน',time:'—',recordedBy:r.recorder,actionTaken:'บันทึกข้อมูลนักเรียนและประวัติสุขภาพ'}};
      if(previous)Object.assign(previous,student);else studentAttendanceDb.push(student);
      if(!attendanceBaseline.has(`${schoolId}:${r.code}`))attendanceBaseline.set(`${schoolId}:${r.code}`,{status:student.status,statusDetail:{...student.statusDetail}});
    }
  }
  function applyVisits() {
    // Rebuild only visit-derived status so editing a date/outcome also removes its old effect.
    for(const visit of state.visits){
      const student=studentAttendanceDb.find(s=>s.id===visit.studentId && s.schoolId===visit.siteId);
      const baseline=attendanceBaseline.get(`${visit.siteId}:${visit.studentId}`);
      if(student&&baseline){student.status=baseline.status;student.statusDetail={...baseline.statusDetail};}
    }
    for(let i=studentDailyLogsDb.length-1;i>=0;i--)if(studentDailyLogsDb[i].id.startsWith('ENTRY-'))studentDailyLogsDb.splice(i,1);
    const today=state.visits.filter(v=>v.visitDate===dateNow()).sort((a,b)=>a.arrival.localeCompare(b.arrival)||a.updatedAt.localeCompare(b.updatedAt));
    for(const visit of today){
      const student=studentAttendanceDb.find(s=>s.id===visit.studentId && s.schoolId===visit.siteId);if(!student)continue;
      const status=visit.outcome==='infirmary'?'ห้องพยาบาล':visit.outcome==='class'?'มา':'ลา';
      const detail={reason:[...visit.symptoms,visit.reason].filter(Boolean).join(' · '),time:`${visit.arrival} น.`,recordedBy:visit.recorder,actionTaken:[visit.care,visit.medicine,visit.guardianNotice].filter(Boolean).join(' · ')};
      student.status=status;student.statusDetail=detail;
      const log={id:`ENTRY-${visit.id}`,studentId:student.id,studentName:student.name,schoolId:visit.siteId,gradeClass:student.gradeClass,status,...detail};
      const i=studentDailyLogsDb.findIndex(l=>l.id===log.id);if(i>=0)studentDailyLogsDb[i]=log;else studentDailyLogsDb.unshift(log);
    }
  }
  function syncModels(){state.students.forEach(r=>applyPerson(r,true));state.citizens.forEach(r=>applyPerson(r,false));applyVisits();renderStudentInfoDashboard();filterPatients();}
  function submit(e) {
    e.preventDefault();const form=e.currentTarget;const d=capture();
    for(const el of form.querySelectorAll('input[required],textarea[required]')){
      if(['radio','checkbox','hidden'].includes(el.type))continue;
      el.setCustomValidity(el.value.trim()?'':'กรุณากรอกข้อมูลในช่องนี้');
      el.addEventListener('input',()=>el.setCustomValidity(''),{once:true});
    }
    if(!form.reportValidity())return;
    if(kind!=='infirmary' && d.assessment==='has' && !d.factors.length){alertMessage('ยังไม่ได้เลือกปัจจัยเปราะบาง กรุณาเลือกอย่างน้อย 1 ข้อ หรือเลือก “ไม่พบปัจจัยตามรายการ”','error');return;}
    if(kind==='infirmary' && d.outcome!=='infirmary' && d.departure<d.arrival){alertMessage('เวลาออกอยู่ก่อนเวลาเข้า กรุณาตรวจและแก้ไขเวลาก่อนบันทึก','error');$('#entry-departure').focus();return;}
    if(kind==='infirmary' && d.outcome==='infirmary' && d.departure){alertMessage('มีเวลาออกแต่ยังเลือกสถานะพักในห้องพยาบาล กรุณาเลือกผลการดูแลหลังออก หรือเว้นเวลาออกไว้','error');return;}
    if(kind!=='infirmary' && (!d.firstName.trim() || !d.lastName.trim()))return;
    const before=JSON.stringify(state);
    const collection=kind==='infirmary'?'visits':kind==='student'?'students':'citizens';
    if(kind!=='infirmary') {
      d.code=d.code || uid('GOV');
      const inOtherSchool=kind==='student' && studentAttendanceDb.find(s=>s.id===d.code && s.schoolId!==siteId);
      if(inOtherSchool){alertMessage('รหัสนักเรียนนี้มีอยู่ในสถานศึกษาอื่น กรุณาใช้รหัสที่ไม่ซ้ำเพื่อให้เชื่อมข้อมูลถูกคน','error');return;}
      const duplicate=kind==='student'?studentAttendanceDb.find(s=>s.id===d.code && s.schoolId===siteId):allPatientsDb.find(p=>p.cid===d.code);
      if(duplicate && !d.editing){alertMessage('รหัสนี้มีอยู่แล้ว กรุณาเลือกแก้ไขรายการเดิม หรือเปลี่ยนรหัสก่อนบันทึก','error');return;}
    }
    const record={...d,id:d.editing || uid(kind==='infirmary'?'VISIT':kind==='student'?'STU':'CIT'),siteId,updatedAt:new Date().toISOString()};
    const index=state[collection].findIndex(r=>r.id===record.id);
    if(index>=0)state[collection][index]=record;else state[collection].unshift(record);
    state.drafts[key()]={};
    if(!persist()){state=JSON.parse(before);return;}
    syncModels();document.dispatchEvent(new CustomEvent('lhs:records-changed',{detail:{siteId,type:kind}}));render();
    const student=studentAttendanceDb.find(s=>s.schoolId===siteId && s.id===d.studentId);
    alertMessage(`${index>=0?'อัปเดต':'บันทึก'}${kind==='infirmary'?`การใช้ห้องพยาบาลของ ${student?.name || ''}`:`ข้อมูล ${fullName(d)}`} เรียบร้อยแล้ว`, 'success', `${kind==='citizen'?'':`<button class="entry-btn entry-btn-small" type="button" data-action="view-student">ดูข้อมูลนักเรียน ${icon('arrow',14)}</button>`}<button class="entry-btn entry-btn-small" type="button" data-action="view-risk">ดูหน้ากลุ่มเสี่ยง ${icon('arrow',14)}</button>`);
  }
  function renderHistory() {
    const visit=kind==='infirmary',coll=visit?state.visits:kind==='student'?state.students:state.citizens;
    const records=coll.filter(r=>r.siteId===siteId);
    $('#entry-history').innerHTML=`<div class="entry-history-title"><h3>${visit?'รายการใช้ห้องพยาบาล':'ข้อมูลที่บันทึกจากแบบฟอร์มนี้'}<span class="entry-count">${records.length} รายการ</span></h3><span class="entry-summary-label">เฉพาะหน่วยงานที่เลือก</span></div>${!records.length?`<div class="entry-empty">${icon(visit?'heart':'list',25)}<strong style="margin-top:9px">${visit?'ยังไม่มีบันทึกการใช้บริการจากแบบฟอร์มนี้':'ยังไม่มีรายการที่บันทึก'}</strong>${visit?'เลือกนักเรียนและกรอกข้อมูลการใช้บริการเพื่อเริ่มบันทึก':'กรอกข้อมูลให้ครบแล้วกดบันทึก รายการจะแสดงที่นี่'}</div>`:`<div class="entry-history-scroll"><table><caption class="sr-only">${visit?'รายการใช้ห้องพยาบาล':'ข้อมูลที่บันทึก'}</caption><thead><tr><th scope="col">${visit?'นักเรียน':'ชื่อ–นามสกุล'}</th><th scope="col">${visit?'วันที่ / เวลา':'รหัสอ้างอิง'}</th><th scope="col">${visit?'ผลการดูแล':'ปัจจัยเปราะบาง'}</th><th scope="col">ผู้บันทึก</th><th scope="col">จัดการ</th></tr></thead><tbody>${records.map(r=>{const student=studentAttendanceDb.find(s=>s.id===r.studentId&&s.schoolId===siteId);return `<tr><td>${esc(visit?student?.name || r.studentId:fullName(r))}<small>${esc(visit?student?.gradeClass || '':kind==='student'?`${r.grade}/${r.room}`:[r.houseNo,r.tambon].filter(Boolean).join(' · '))}</small></td><td>${esc(visit?displayDate(r.visitDate):r.code)}${visit?`<small>${r.arrival}${r.departure?' – '+r.departure:''} น.</small>`:''}</td><td>${esc(visit?({infirmary:'พักในห้องพยาบาล',class:'กลับเข้าห้องเรียน',home:'กลับบ้าน',referral:'ส่งต่อสถานพยาบาล'}[r.outcome]):r.factors.length?`${r.factors.length} ปัจจัย`:'ไม่พบตามรายการ')}</td><td>${esc(r.recorder)}</td><td><button type="button" class="entry-btn entry-btn-small" data-action="edit" data-id="${esc(r.id)}">แก้ไข</button></td></tr>`;}).join('')}</tbody></table></div>`}`;
  }
  function loadStudent(studentId) {
    if(!studentId){state.drafts[key()]={};render();return;}
    const saved=state.students.find(s=>s.siteId===siteId&&s.code===studentId);
    if(saved){state.drafts[key()]={...saved,editing:saved.id,existingStudent:studentId};render();return;}
    const student=localStudents().find(s=>s.id===studentId);if(!student)return;
    const patient=allPatientsDb.find(p=>p.hosp===siteId&&(p.cid===student.id||p.name===student.name));
    const parts=student.name.trim().split(/\s+/),prefix=prefixes.find(p=>typeof p==='string'&&parts[0]===p) || '';
    if(prefix)parts.shift();const name=parts.shift() || '';
    const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const [day,month,year]=student.dob.split(' ');
    const dob=months.includes(month)?`${Number(year)-543}-${String(months.indexOf(month)+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`:'';
    state.drafts[key()]={editing:uid('STU'),originalRiskCid:patient?.cid || '',existingStudent:studentId,code:student.id,prefix,firstName:name,lastName:parts.join(' '),dob,gender:patient?.gender_age?.split('/')[0] || '',grade:student.gradeGroup,room:student.gradeClass.split('/')[1],phone:student.guardianContact,assessment:patient?.factors?.length?'has':'',factors:patient?.factors || [],medicalNote:student.healthNote==='None'?'':student.healthNote,height:student.height || '',weight:student.weight || '',measurementDate:student.measurementDate || '',assessedDate:dateNow()};
    render();
  }
  function action(name,id) {
    if(name==='history'){$('#entry-history').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});$('#entry-history').setAttribute('tabindex','-1');$('#entry-history').focus({preventScroll:true});}
    if(name==='draft'){capture();if(persist())alertMessage('เก็บแบบร่างแล้ว เปิดหน้านี้อีกครั้งในเบราว์เซอร์เดิมเพื่อกรอกต่อได้');}
    if(name==='new'){state.drafts[key()]={};render();}
    if(name==='view-student'){onHospitalChanged(siteId);currentStudentStatusFilter='all';currentStudentSearchQuery='';currentStudentClassFilter='all';const s=$('#student-search-input');if(s)s.value='';switchDashboardTab('student');}
    if(name==='view-care'){switchDashboardTab('care-map');}
    if(name==='view-risk'){onHospitalChanged(siteId);const s=$('#patient-search');if(s)s.value='';switchDashboardTab('risk');}
    if(name==='edit'){const record=(kind==='infirmary'?state.visits:kind==='student'?state.students:state.citizens).find(r=>r.id===id&&r.siteId===siteId);if(record){state.drafts[key()]={...record,editing:record.id};pendingFocus=true;render();}}
    if(name==='sample'){
      const base={prefix:kind==='student'?'ด.ญ.':'นาง',firstName:'ตัวอย่าง',lastName:'ทดสอบระบบ',dob:kind==='student'?'2013-05-10':'1960-03-12',gender:'F',code:kind==='student'?`DEMO-${Date.now().toString().slice(-6)}`:'',grade:'ม.1',room:'2',height:'145.5',weight:'38.2',measurementDate:dateNow(),guardianName:'ผู้ปกครอง ตัวอย่าง',relation:'มารดา',phone:'080-000-0000',assessment:'has',factors:['asthma','ar'],medicalNote:'ข้อมูลตัวอย่างสำหรับทดลองแบบฟอร์ม',allergies:'ไม่ทราบ',assessedDate:dateNow(),recorder:'เจ้าหน้าที่ ทดสอบ',houseNo:'125/4',moo:'3',tambon:'กองแขก',amphoe:'แม่แจ่ม',province:'เชียงใหม่',postcode:'50270',lat:'18.520400',lng:'98.420300'};
      const visit={studentId:localStudents()[0]?.id || '',visitDate:dateNow(),arrival:'10:00',departure:'',symptoms:['ไอ / เจ็บคอ'],reason:'ข้อมูลตัวอย่าง: ไอและระคายคอหลังทำกิจกรรมกลางแจ้ง',bodyTemp:'37.2',care:'บันทึกตัวอย่างการดูแลและสังเกตอาการ',outcome:'infirmary',recorder:'ครู ทดสอบระบบ',guardianNotice:'ติดต่อแล้ว'};
      state.drafts[key()]=kind==='infirmary'?visit:base;render();
    }
  }
  function mount() {
    const panel=document.createElement('div');panel.id='panel-input';panel.className='w-full hidden';document.querySelector('main').appendChild(panel);
    window.LhsEntry=Object.freeze({
      open(context,requestedKind){
        if(!['school','gov'].includes(context.role))return false;
        capture();
        const next=context.role==='gov'?'citizen':['infirmary','student'].includes(requestedKind)?requestedKind:(scope==='school'&&kind!=='citizen'?kind:'infirmary');
        scope=context.role;siteId=context.siteId;kind=next;render();return true;
      },
      capture,
      getCitizens(unitId){return state.citizens.filter(r=>r.siteId===unitId).map(r=>({...r,factors:[...r.factors]}));},
      edit(id){action('edit',id);},
    });
    if(state.students.length||state.citizens.length||state.visits.length)syncModels();
  }
  mount();
})();
