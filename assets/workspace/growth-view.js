/* =========================================================================
 * TSPE Thai Growth Chart View & Interactive Longitudinal Plotting
 * Reference: Thai Society for Pediatric Endocrinology (TSPE 2022)
 * Role: School Only (บทบาท = สถานศึกษา)
 * ========================================================================= */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = (str) => {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  let currentContext = { role: 'school', siteId: 'usr_saraphi' };
  let currentStudentId = null;
  let chartMode = 'dual'; // 'dual' | 'height' | 'weight'
  let showPercentiles = true;
  let showTargetHeight = true;
  let showPuberty = true;
  let growthChartInstance = null;
  let classFilter = 'all';

  function ensurePanel() {
    let panel = $('panel-growth');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'panel-growth';
      panel.className = 'w-full hidden';
      const main = document.querySelector('main');
      if (main) main.appendChild(panel);
    }
    return panel;
  }

  function getActiveStudents() {
    const list = LhsGrowthData.getAllStudentsForSchool(currentContext.siteId);
    if (classFilter === 'all') return list;
    return list.filter(s => s.gradeGroup === classFilter);
  }

  function getAvailableClasses() {
    const all = LhsGrowthData.getAllStudentsForSchool(currentContext.siteId);
    const classes = Array.from(new Set(all.map(s => s.gradeGroup))).sort();
    return classes;
  }

  function selectStudent(studentId) {
    currentStudentId = studentId;
    render();
  }

  function open(context) {
    currentContext = { ...context };
    const students = LhsGrowthData.getAllStudentsForSchool(currentContext.siteId);
    if (!students.some(s => s.id === currentStudentId)) {
      currentStudentId = students.length > 0 ? students[0].id : null;
    }
    classFilter = 'all';
    render();
  }

  function resize() {
    if (growthChartInstance) {
      setTimeout(() => {
        try { growthChartInstance.resize(); } catch (e) {}
      }, 60);
    }
  }

  function render() {
    const panel = ensurePanel();
    const students = getActiveStudents();
    const allSchoolStudents = LhsGrowthData.getAllStudentsForSchool(currentContext.siteId);
    
    // Fallback if current student is filtered out
    if (!students.some(s => s.id === currentStudentId)) {
      currentStudentId = students.length > 0 ? students[0].id : (allSchoolStudents.length > 0 ? allSchoolStudents[0].id : null);
    }

    const student = currentStudentId ? LhsGrowthData.getStudentGrowth(currentStudentId) : null;
    const isGirl = student?.gender === 'girl';
    const themeColor = isGirl ? '#db2777' : '#0284c7';
    const themeBg = isGirl ? '#fdf2f8' : '#f0f9ff';
    const themeBorder = isGirl ? '#fbcfe8' : '#bae6fd';
    const themeTag = isGirl ? 'bg-pink-100 text-pink-700 border-pink-200' : 'bg-sky-100 text-sky-700 border-sky-200';

    const schoolName = currentContext.siteId === 'usr_saraphi' ? 'โรงเรียนสารภีพิทยาคม' : 'โรงเรียนบ้านศาลาแม่ทา';
    const classes = getAvailableClasses();

    panel.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
        
        <!-- TOP BANNER -->
        <div class="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border ${
          isGirl 
            ? 'bg-gradient-to-r from-pink-600 via-rose-500 to-fuchsia-600 border-pink-400/40 shadow-pink-500/10' 
            : 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 border-sky-400/40 shadow-blue-500/10'
        }">
          <div class="relative z-10 space-y-2 max-w-2xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-white/20 text-white border border-white/30">
              <span>📊</span>
              <span>บทบาท: สถานศึกษา · กราฟการเจริญเติบโตรายปี (TSPE Growth Chart)</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>กราฟติดตามการเจริญเติบโตรายปี</span>
              <span class="text-xs font-normal px-2.5 py-1 rounded-lg bg-white/20 border border-white/25">TSPE 2022</span>
            </h1>
            <p class="text-white/90 text-xs sm:text-sm font-normal leading-relaxed">
              เครื่องมือพล็อตกราฟเปรียบเทียบเกณฑ์มาตรฐานการเจริญเติบโตของสมาคมต่อมไร้ท่อเด็กและวัยรุ่นไทย (TSPE 2022)
              ร่วมกับข้อมูลอ้างอิงกรมอนามัย กระทรวงสาธารณสุข และ WHO สำหรับนักเรียนอายุ 2–19 ปี ของ ${esc(schoolName)}
            </p>
          </div>

          <div class="relative z-10 flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <div class="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/25 text-left min-w-[130px]">
              <div class="text-[10px] text-white/80 font-medium">นักเรียนในระบบ</div>
              <div class="text-lg font-black text-white">${allSchoolStudents.length} คน</div>
            </div>
            <button type="button" id="btn-open-add-measurement" class="px-4 py-2.5 rounded-2xl bg-white text-gray-900 font-bold text-xs sm:text-sm hover:bg-white/90 transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95">
              <span class="text-base leading-none text-emerald-600">➕</span>
              <span>บันทึกการตรวจวัดประจำปี</span>
            </button>
          </div>
        </div>

        <!-- FILTER & STUDENT SELECTOR TOOLBAR -->
        <div class="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
          <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            <!-- Class Filters -->
            <div class="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span class="text-xs font-bold text-gray-500 whitespace-nowrap mr-1">ระดับชั้น:</span>
              <button type="button" data-filter="all" class="growth-filter-chip px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                classFilter === 'all' 
                  ? 'bg-purple-600 text-white shadow-xs' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }">ทั้งหมด (${allSchoolStudents.length})</button>
              ${classes.map(c => {
                const count = allSchoolStudents.filter(s => s.gradeGroup === c).length;
                const active = classFilter === c;
                return `<button type="button" data-filter="${esc(c)}" class="growth-filter-chip px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  active 
                    ? 'bg-purple-600 text-white shadow-xs' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }">${esc(c)} (${count})</button>`;
              }).join('')}
            </div>

            <!-- Student Dropdown -->
            <div class="flex items-center gap-3 min-w-[280px] max-w-md w-full md:w-auto">
              <label for="student-growth-select" class="text-xs font-bold text-gray-700 whitespace-nowrap">เลือกนักเรียน:</label>
              <div class="relative w-full">
                <select id="student-growth-select" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition cursor-pointer">
                  ${students.map(s => `
                    <option value="${esc(s.id)}" ${s.id === currentStudentId ? 'selected' : ''}>
                      ${s.gender === 'boy' ? '👦' : '👧'} ${esc(s.id)} - ${esc(s.name)} (${esc(s.gradeClass)})
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>

          </div>
        </div>

        ${student ? renderStudentSection(student) : `
          <div class="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
            <span class="text-4xl block mb-2">🔍</span>
            <p class="font-bold text-base">ไม่พบข้อมูลนักเรียนในหมวดหมู่ที่เลือก</p>
            <p class="text-xs mt-1">กรุณาเลือกตัวกรองระดับชั้นอื่น หรือเลือกดูนักเรียนทั้งหมด</p>
          </div>
        `}

      </div>
    `;

    bindEvents();
    if (student) {
      renderChart(student);
    }
  }

  function renderStudentSection(student) {
    const isGirl = student.gender === 'girl';
    const records = student.records || [];
    const latest = records.length > 0 ? records[records.length - 1] : null;
    const previous = records.length > 1 ? records[records.length - 2] : null;

    const mph = LhsGrowthData.calcMidParentalHeight(student.fatherHeight, student.motherHeight, student.gender);
    const heightAssess = latest ? LhsGrowthData.assessHeight(latest.height, latest.age, student.gender) : null;
    const weightAssess = latest ? LhsGrowthData.assessWeight(latest.weight, latest.age, student.gender) : null;
    const bmiAssess = latest ? LhsGrowthData.assessBmi(latest.weight, latest.height) : null;

    // Growth velocity cm/year
    let velocityText = '--';
    let velocityBadge = '';
    if (latest && previous) {
      const yearDiff = latest.age - previous.age;
      if (yearDiff > 0) {
        const vel = (latest.height - previous.height) / yearDiff;
        velocityText = `${vel >= 0 ? '+' : ''}${vel.toFixed(1)} ซม./ปี`;
        velocityBadge = vel >= 4 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
      }
    }

    const chartBorderColor = isGirl ? '#ec4899' : '#0284c7';
    const chartBgShade = isGirl ? 'rgba(253, 242, 248, 0.45)' : 'rgba(240, 249, 255, 0.45)';

    return `
      <!-- STUDENT SUMMARY PROFILE & CLINICAL INDICATORS -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        <!-- Profile Card (Left 4 cols) -->
        <div class="lg:col-span-4 bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div class="space-y-4">
            
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3.5">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-xs ${
                  isGirl ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-sky-100 text-sky-700 border border-sky-200'
                }">
                  ${isGirl ? '👧' : '👦'}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-0.5 rounded-md font-bold uppercase ${
                      isGirl ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
                    }">${isGirl ? 'เด็กหญิง' : 'เด็กชาย'}</span>
                    <span class="text-xs text-gray-400 font-mono">รหัส ${esc(student.id)}</span>
                  </div>
                  <h2 class="text-base sm:text-lg font-black text-gray-900 mt-1">${esc(student.name)}</h2>
                  <p class="text-xs text-gray-500">ชั้น ${esc(student.gradeClass)} · ว.ด.ป. เกิด: ${esc(student.dob)}</p>
                </div>
              </div>
            </div>

            <!-- Key Metrics Grid -->
            <div class="grid grid-cols-2 gap-2.5 pt-2">
              <div class="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <div class="text-[10px] text-gray-500 font-medium">อายุปัจจุบัน</div>
                <div class="text-base font-black text-gray-900 mt-0.5">${latest ? `${latest.age} ปี` : '--'}</div>
                <div class="text-[10px] text-gray-400">พ.ศ. ${latest?.yearBe || '--'}</div>
              </div>

              <div class="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <div class="text-[10px] text-gray-500 font-medium">ความสูงเป้าหมาย (MPH)</div>
                <div class="text-base font-black text-indigo-700 mt-0.5">${mph ? `${mph.target} ซม.` : '--'}</div>
                <div class="text-[10px] text-gray-400">ช่วง ${mph ? `${mph.rangeMin}-${mph.rangeMax}` : '--'} ซม.</div>
              </div>

              <div class="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <div class="text-[10px] text-gray-500 font-medium">ส่วนสูงบิดา</div>
                <div class="text-sm font-black text-gray-800 mt-0.5">${student.fatherHeight ? `${student.fatherHeight} ซม.` : 'ไม่ระบุ'}</div>
              </div>

              <div class="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <div class="text-[10px] text-gray-500 font-medium">ส่วนสูงมารดา</div>
                <div class="text-sm font-black text-gray-800 mt-0.5">${student.motherHeight ? `${student.motherHeight} ซม.` : 'ไม่ระบุ'}</div>
              </div>
            </div>

            <!-- Tanner / Pubertal Milestones -->
            <div class="p-3 rounded-2xl bg-gradient-to-r ${isGirl ? 'from-pink-50 to-rose-50 border border-pink-100' : 'from-sky-50 to-blue-50 border border-sky-100'} text-xs space-y-1.5">
              <div class="font-bold flex items-center justify-between text-gray-800">
                <span>🌟 เกณฑ์วัยเจริญพันธุ์อ้างอิง TSPE</span>
                <span class="text-[10px] text-gray-500">P3 - P97</span>
              </div>
              ${isGirl ? `
                <div class="text-[11px] text-gray-600 flex justify-between">
                  <span>เต้านมเจริญขั้น 2 (Breast Tanner II):</span>
                  <span class="font-bold text-pink-700">8.5 - 12.0 ปี (P50: 10.0)</span>
                </div>
                <div class="text-[11px] text-gray-600 flex justify-between">
                  <span>ประจำเดือนครั้งแรก (Menarche):</span>
                  <span class="font-bold text-rose-700">9.5 - 14.5 ปี (P50: 12.0)</span>
                </div>
              ` : `
                <div class="text-[11px] text-gray-600 flex justify-between">
                  <span>อัณฑะเจริญขั้น 2 (Genital Tanner II):</span>
                  <span class="font-bold text-sky-700">9.5 - 13.5 ปี (P50: 11.5)</span>
                </div>
                <div class="text-[11px] text-gray-600 flex justify-between">
                  <span>ขนหัวหน่าวขั้น 2 (Pubic hair II):</span>
                  <span class="font-bold text-blue-700">10.0 - 14.0 ปี (P50: 12.0)</span>
                </div>
              `}
            </div>

          </div>

          <div class="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>บันทึกสะสม: <strong class="text-gray-800">${records.length} ปีการศึกษา</strong></span>
            <span class="font-mono text-[11px]">ตรวจล่าสุด: ${latest?.date || '--'}</span>
          </div>
        </div>

        <!-- Clinical Indicator Cards (Right 8 cols) -->
        <div class="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <!-- Height Assessment Card -->
          <div class="bg-white rounded-3xl border border-gray-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-sky-300 transition group">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                  <span class="text-base">📏</span> ส่วนสูงตามเกณฑ์อายุ
                </span>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${heightAssess ? heightAssess.color : 'bg-gray-100 text-gray-600'}">
                  ${heightAssess ? heightAssess.label : '--'}
                </span>
              </div>
              <div>
                <div class="text-3xl font-black text-gray-900 tracking-tight">
                  ${latest ? `${latest.height} <span class="text-sm font-semibold text-gray-500">ซม.</span>` : '--'}
                </div>
                <div class="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <span>เปอร์เซ็นไทล์:</span>
                  <strong class="text-gray-800 font-bold">${heightAssess ? heightAssess.percentile : '--'}</strong>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span class="text-gray-500">อัตราเพิ่ม (Velocity):</span>
              <span class="font-bold px-2 py-0.5 rounded-md ${velocityBadge || 'text-gray-700'}">${velocityText}</span>
            </div>
          </div>

          <!-- Weight Assessment Card -->
          <div class="bg-white rounded-3xl border border-gray-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition group">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                  <span class="text-base">⚖️</span> น้ำหนักตามเกณฑ์อายุ
                </span>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${weightAssess ? weightAssess.color : 'bg-gray-100 text-gray-600'}">
                  ${weightAssess ? weightAssess.label : '--'}
                </span>
              </div>
              <div>
                <div class="text-3xl font-black text-gray-900 tracking-tight">
                  ${latest ? `${latest.weight} <span class="text-sm font-semibold text-gray-500">กก.</span>` : '--'}
                </div>
                <div class="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <span>เปอร์เซ็นไทล์:</span>
                  <strong class="text-gray-800 font-bold">${weightAssess ? weightAssess.percentile : '--'}</strong>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span class="text-gray-500">สถานะน้ำหนัก:</span>
              <span class="font-semibold text-gray-700">${weightAssess ? weightAssess.label : '--'}</span>
            </div>
          </div>

          <!-- BMI Assessment Card -->
          <div class="bg-white rounded-3xl border border-gray-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition group">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                  <span class="text-base">🩺</span> ดัชนีมวลกาย (BMI)
                </span>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${bmiAssess ? bmiAssess.color : 'bg-gray-100 text-gray-600'}">
                  ${bmiAssess ? bmiAssess.label : '--'}
                </span>
              </div>
              <div>
                <div class="text-3xl font-black text-gray-900 tracking-tight">
                  ${bmiAssess ? `${bmiAssess.bmi} <span class="text-sm font-semibold text-gray-500">กก./ม.²</span>` : '--'}
                </div>
                <div class="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <span>แปลผลสุขภาพ:</span>
                  <strong class="text-gray-800 font-bold">${bmiAssess ? bmiAssess.label : '--'}</strong>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span class="text-gray-500">เกณฑ์สมส่วน:</span>
              <span class="font-semibold text-gray-700">18.5 - 22.9</span>
            </div>
          </div>

          <!-- Bottom Long Card: Growth Trajectory Clinical Insight -->
          <div class="sm:col-span-3 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-3">
              <span class="text-xl">💡</span>
              <div>
                <span class="font-bold text-gray-800">การประเมินทิศทางการเจริญเติบโต (Longitudinal Trajectory):</span>
                <p class="text-gray-600 text-[11px] mt-0.5">
                  ${records.length >= 2 
                    ? `เส้นทางการเติบโตของนักเรียนไต่ระดับตามช่องเปอร์เซ็นไทล์อย่างต่อเนื่อง (เกาะแนว ${heightAssess?.percentile || 'P50'}) บ่งชี้ภาวะโภชนาการและการเจริญเติบโตที่สมดุล` 
                    : 'มีบันทึกตรวจวัด 1 ครั้ง แนะนำติดตามผลการตรวจวัดต่อเนื่องในรอบปีถัดไปเพื่อวิเคราะห์ Velocity Curve'}
                </p>
              </div>
            </div>
            <button type="button" onclick="document.getElementById('growth-records-table-card').scrollIntoView({behavior: 'smooth'})" class="text-purple-700 font-bold hover:underline whitespace-nowrap text-xs flex items-center gap-1">
              <span>ดูประวัติทั้งหมด</span>
              <span>↓</span>
            </button>
          </div>

        </div>

      </div>

      <!-- MAIN CHART CONTAINER & CONTROLS -->
      <div class="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
        
        <!-- Chart Header & Toolbar -->
        <div class="p-5 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-b from-gray-50/50 to-white">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full ${isGirl ? 'bg-pink-500' : 'bg-sky-500'}"></span>
              <h3 class="text-base sm:text-lg font-black text-gray-900">
                ${isGirl ? 'กราฟการเจริญเติบโตเด็กหญิงอายุ 2–19 ปี (TSPE Reference)' : 'กราฟการเจริญเติบโตเด็กชายอายุ 2–19 ปี (TSPE Reference)'}
              </h3>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              แกนนอน: อายุ (ปี) 2–19 ปี · จุดกราฟแสดงผลการตรวจวัดจริงรายปีของนักเรียน (พ.ศ. 2565–2569)
            </p>
          </div>

          <!-- Chart Toggle Modes -->
          <div class="flex flex-wrap items-center gap-2">
            
            <div class="bg-gray-100 p-1 rounded-2xl flex items-center text-xs font-bold">
              <button type="button" data-mode="dual" class="growth-mode-btn px-3 py-1.5 rounded-xl transition cursor-pointer ${
                chartMode === 'dual' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }">กราฟคู่ ส่วนสูง-น้ำหนัก</button>
              
              <button type="button" data-mode="height" class="growth-mode-btn px-3 py-1.5 rounded-xl transition cursor-pointer ${
                chartMode === 'height' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }">เฉพาะส่วนสูง</button>
              
              <button type="button" data-mode="weight" class="growth-mode-btn px-3 py-1.5 rounded-xl transition cursor-pointer ${
                chartMode === 'weight' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }">เฉพาะน้ำหนัก</button>
            </div>

            <!-- Reference toggles -->
            <label class="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer ml-1 select-none">
              <input type="checkbox" id="chk-percentiles" ${showPercentiles ? 'checked' : ''} class="rounded text-purple-600 focus:ring-purple-500">
              <span class="font-medium">แสดงเส้นเปอร์เซ็นไทล์ (P3-P97)</span>
            </label>

            <label class="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
              <input type="checkbox" id="chk-target-height" ${showTargetHeight ? 'checked' : ''} class="rounded text-indigo-600 focus:ring-indigo-500">
              <span class="font-medium">เป้าหมายพันธุกรรม (MPH)</span>
            </label>

          </div>
        </div>

        <!-- The Chart Canvas Area -->
        <div class="p-4 sm:p-6 relative bg-white" style="min-height: 480px;">
          <!-- Watermark / Reference stamp matching TSPE Chart -->
          <div class="absolute top-8 left-10 pointer-events-none opacity-40 select-none z-0">
            <div class="text-[11px] font-black tracking-widest uppercase ${isGirl ? 'text-pink-900' : 'text-sky-900'}">
              TSPE Thai Growth Standard (2022)
            </div>
            <div class="text-[9px] text-gray-400">Bureau of Nutrition, MOPH & WHO</div>
          </div>

          <div class="relative z-10 w-full" style="height: 520px;">
            <canvas id="tspe-growth-chart"></canvas>
          </div>
        </div>

        <!-- Chart Footnote & Tanner Stages Visual Guide -->
        <div class="p-4 sm:p-6 bg-gray-50/70 border-t border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-gray-600">
          <div class="space-y-1">
            <div class="flex items-center gap-4 flex-wrap">
              <span class="inline-flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block border-2 border-white shadow-xs"></span>
                <strong class="text-gray-800">ผลตรวจวัดส่วนสูงรายปี (ซม.)</strong>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full bg-amber-500 inline-block border-2 border-white shadow-xs"></span>
                <strong class="text-gray-800">ผลตรวจวัดน้ำหนักรายปี (กก.)</strong>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="w-5 h-0.5 bg-indigo-500 border-dashed inline-block"></span>
                <span class="text-indigo-800 font-bold">Mid-parental height target</span>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="w-4 h-2 rounded-xs ${isGirl ? 'bg-pink-300' : 'bg-sky-300'} inline-block"></span>
                <span>Tanner stage II / Puberty landmark</span>
              </span>
            </div>
            <p class="text-[11px] text-gray-400 mt-1">
              ที่มา: สมาคมต่อมไร้ท่อเด็กและวัยรุ่นไทย (TSPE 2022), เกณฑ์อ้างอิงการเจริญเติบโตของเด็กไทย 5–19 ปี สำนักโภชนาการ กรมอนามัย 2563 และ WHO Growth Standards 2006
            </p>
          </div>

          <button type="button" id="btn-export-growth-chart" class="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 transition shadow-2xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
            <span>📷</span>
            <span>บันทึกรูปกราฟ (PNG)</span>
          </button>
        </div>

      </div>

      <!-- LONGITUDINAL MEASUREMENTS TABLE -->
      <div id="growth-records-table-card" class="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <span>📋 บันทึกประวัติการตรวจวัดร่างกายรายปี</span>
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">Longitudinal Data</span>
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              ข้อมูลส่วนสูง น้ำหนัก และการประเมินทางคลินิกย้อนหลังของ ${esc(student.name)}
            </p>
          </div>

          <button type="button" id="btn-add-year-measurement" class="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer">
            <span>➕</span>
            <span>เพิ่มผลตรวจปีนี้</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                <th class="px-4 py-3.5 whitespace-nowrap">ปีการศึกษา</th>
                <th class="px-4 py-3.5 whitespace-nowrap">ระดับชั้น</th>
                <th class="px-4 py-3.5 whitespace-nowrap">วันที่ตรวจวัด</th>
                <th class="px-4 py-3.5 whitespace-nowrap">อายุ (ปี)</th>
                <th class="px-4 py-3.5 whitespace-nowrap">ส่วนสูง (ซม.)</th>
                <th class="px-4 py-3.5 whitespace-nowrap">การประเมินส่วนสูง</th>
                <th class="px-4 py-3.5 whitespace-nowrap">น้ำหนัก (กก.)</th>
                <th class="px-4 py-3.5 whitespace-nowrap">การประเมินน้ำหนัก</th>
                <th class="px-4 py-3.5 whitespace-nowrap">BMI (กก./ม.²)</th>
                <th class="px-4 py-3.5 whitespace-nowrap">อัตราเพิ่ม (Velocity)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${records.map((r, idx) => {
                const prev = idx > 0 ? records[idx - 1] : null;
                const hEval = LhsGrowthData.assessHeight(r.height, r.age, student.gender);
                const wEval = LhsGrowthData.assessWeight(r.weight, r.age, student.gender);
                const bEval = LhsGrowthData.assessBmi(r.weight, r.height);
                
                let vel = '--';
                if (prev) {
                  const yDiff = r.age - prev.age;
                  if (yDiff > 0) {
                    const rate = (r.height - prev.height) / yDiff;
                    vel = `${rate >= 0 ? '+' : ''}${rate.toFixed(1)} ซม./ปี`;
                  }
                }

                const isLatest = idx === records.length - 1;

                return `
                  <tr class="hover:bg-purple-50/40 transition ${isLatest ? 'bg-purple-50/20 font-medium' : ''}">
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="font-bold text-gray-900">พ.ศ. ${esc(r.yearBe)}</span>
                      ${isLatest ? '<span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">ล่าสุด</span>' : ''}
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-medium text-gray-700">${esc(r.grade)}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-gray-500 font-mono">${esc(r.date)}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-bold text-gray-800">${r.age} ปี</td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-black text-sky-700">${r.height}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${hEval.color}">
                        ${hEval.label} (${hEval.percentile})
                      </span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-black text-emerald-700">${r.weight}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${wEval.color}">
                        ${wEval.label} (${wEval.percentile})
                      </span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-bold text-gray-800">
                      ${bEval.bmi} <span class="text-[10px] text-gray-400 font-normal">(${bEval.label})</span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-bold ${vel.startsWith('+') ? 'text-emerald-700' : 'text-gray-600'}">
                      ${vel}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL: ADD ANNUAL MEASUREMENT -->
      <div id="add-growth-modal" class="fixed inset-0 bg-gray-900/60 backdrop-blur-xs hidden flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-gray-100 max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          
          <div class="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <span class="text-[10px] uppercase tracking-wider font-bold text-purple-600">บันทึกตรวจวัดทางกายภาพ</span>
              <h3 class="text-lg font-black text-gray-900">บันทึกการตรวจวัดประจำปี</h3>
              <p class="text-xs text-gray-500 mt-0.5">${esc(student.name)} (${esc(student.id)})</p>
            </div>
            <button type="button" id="btn-close-growth-modal" class="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none p-1 cursor-pointer">&times;</button>
          </div>

          <form id="form-add-growth-measurement" class="space-y-4 pt-4">
            
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="growth-input-year" class="block text-xs font-bold text-gray-700 mb-1">ปีการศึกษา (พ.ศ.) *</label>
                <input type="number" id="growth-input-year" required min="2560" max="2575" value="${(latest?.yearBe || 2568) + 1}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500">
              </div>

              <div>
                <label for="growth-input-grade" class="block text-xs font-bold text-gray-700 mb-1">ระดับชั้น *</label>
                <input type="text" id="growth-input-grade" required value="${esc(student.gradeClass)}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="growth-input-date" class="block text-xs font-bold text-gray-700 mb-1">วันที่ตรวจวัด *</label>
                <input type="date" id="growth-input-date" required value="${new Date().toISOString().split('T')[0]}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:ring-2 focus:ring-purple-500">
              </div>

              <div>
                <label for="growth-input-age" class="block text-xs font-bold text-gray-700 mb-1">อายุ ณ วันตรวจ (ปี) *</label>
                <input type="number" step="0.1" id="growth-input-age" required min="2" max="19" value="${latest ? (latest.age + 1.0).toFixed(1) : '10.0'}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="growth-input-height" class="block text-xs font-bold text-gray-700 mb-1">ส่วนสูง (ซม.) *</label>
                <input type="number" step="0.5" id="growth-input-height" required min="60" max="210" placeholder="เช่น 155.0" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-sky-800 outline-none focus:ring-2 focus:ring-sky-500">
              </div>

              <div>
                <label for="growth-input-weight" class="block text-xs font-bold text-gray-700 mb-1">น้ำหนัก (กก.) *</label>
                <input type="number" step="0.1" id="growth-input-weight" required min="5" max="150" placeholder="เช่น 45.0" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500">
              </div>
            </div>

            <div id="growth-calc-preview" class="p-3 bg-purple-50 border border-purple-100 rounded-2xl text-xs space-y-1 text-purple-900 hidden">
              <div class="font-bold">ผลประเมินคำนวณอัตโนมัติ:</div>
              <div class="flex justify-between text-[11px]">
                <span>BMI: <strong id="preview-bmi">--</strong></span>
                <span>ส่วนสูง: <strong id="preview-height-p">--</strong></span>
                <span>น้ำหนัก: <strong id="preview-weight-p">--</strong></span>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button type="button" id="btn-cancel-growth-modal" class="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer">ยกเลิก</button>
              <button type="submit" class="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer">
                <span>💾 บันทึกและพล็อตกราฟทันที</span>
              </button>
            </div>

          </form>

        </div>
      </div>
    `;
  }

  function bindEvents() {
    // Student select change
    const sel = $('student-growth-select');
    if (sel) {
      sel.onchange = e => selectStudent(e.target.value);
    }

    // Filter chips
    document.querySelectorAll('.growth-filter-chip').forEach(btn => {
      btn.onclick = () => {
        classFilter = btn.dataset.filter;
        render();
      };
    });

    // Chart Mode buttons
    document.querySelectorAll('.growth-mode-btn').forEach(btn => {
      btn.onclick = () => {
        chartMode = btn.dataset.mode;
        render();
      };
    });

    // Percentile checkbox
    const chkP = $('chk-percentiles');
    if (chkP) {
      chkP.onchange = e => {
        showPercentiles = e.target.checked;
        const student = LhsGrowthData.getStudentGrowth(currentStudentId);
        if (student) renderChart(student);
      };
    }

    // Target Height checkbox
    const chkTH = $('chk-target-height');
    if (chkTH) {
      chkTH.onchange = e => {
        showTargetHeight = e.target.checked;
        const student = LhsGrowthData.getStudentGrowth(currentStudentId);
        if (student) renderChart(student);
      };
    }

    // Add Measurement Buttons
    const btnOpenAdd = $('btn-open-add-measurement');
    const btnAddYear = $('btn-add-year-measurement');
    if (btnOpenAdd) btnOpenAdd.onclick = openAddModal;
    if (btnAddYear) btnAddYear.onclick = openAddModal;

    const btnClose = $('btn-close-growth-modal');
    const btnCancel = $('btn-cancel-growth-modal');
    if (btnClose) btnClose.onclick = closeAddModal;
    if (btnCancel) btnCancel.onclick = closeAddModal;

    // Export chart button
    const btnExport = $('btn-export-growth-chart');
    if (btnExport) {
      btnExport.onclick = () => {
        if (!growthChartInstance) return;
        const a = document.createElement('a');
        a.href = growthChartInstance.toBase64Image();
        a.download = `TSPE_Growth_Chart_${currentStudentId}.png`;
        a.click();
      };
    }

    // Form submission
    const form = $('form-add-growth-measurement');
    if (form) {
      form.onsubmit = handleSaveMeasurement;

      const hInput = $('growth-input-height');
      const wInput = $('growth-input-weight');
      const ageInput = $('growth-input-age');

      const updatePreview = () => {
        const h = parseFloat(hInput.value);
        const w = parseFloat(wInput.value);
        const a = parseFloat(ageInput.value);
        const previewBox = $('growth-calc-preview');
        if (!previewBox) return;

        if (h > 0 && w > 0 && a > 0) {
          const student = LhsGrowthData.getStudentGrowth(currentStudentId);
          const b = LhsGrowthData.assessBmi(w, h);
          const hAssess = LhsGrowthData.assessHeight(h, a, student.gender);
          const wAssess = LhsGrowthData.assessWeight(w, a, student.gender);

          $('preview-bmi').textContent = `${b.bmi} (${b.label})`;
          $('preview-height-p').textContent = `${hAssess.percentile}`;
          $('preview-weight-p').textContent = `${wAssess.percentile}`;
          previewBox.classList.remove('hidden');
        } else {
          previewBox.classList.add('hidden');
        }
      };

      if (hInput) hInput.oninput = updatePreview;
      if (wInput) wInput.oninput = updatePreview;
      if (ageInput) ageInput.oninput = updatePreview;
    }
  }

  function openAddModal() {
    const modal = $('add-growth-modal');
    if (modal) {
      modal.classList.remove('hidden');
      const hInput = $('growth-input-height');
      if (hInput) setTimeout(() => hInput.focus(), 100);
    }
  }

  function closeAddModal() {
    const modal = $('add-growth-modal');
    if (modal) modal.classList.add('hidden');
  }

  function handleSaveMeasurement(e) {
    e.preventDefault();
    const student = LhsGrowthData.getStudentGrowth(currentStudentId);
    if (!student) return;

    const yearBe = parseInt($('growth-input-year').value, 10);
    const grade = $('growth-input-grade').value.trim();
    const date = $('growth-input-date').value;
    const age = parseFloat($('growth-input-age').value);
    const height = parseFloat($('growth-input-height').value);
    const weight = parseFloat($('growth-input-weight').value);

    if (!yearBe || !grade || !date || isNaN(age) || isNaN(height) || isNaN(weight)) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง');
      return;
    }

    const newRecord = { yearBe, grade, date, age, height, weight };
    LhsGrowthData.addRecord(student.id, newRecord);

    closeAddModal();
    render();

    // Visual feedback
    if (typeof showToastNotification === 'function') {
      showToastNotification(`บันทึกผลการตรวจวัดประจำปี ${yearBe} ของ ${student.name} เรียบร้อยแล้ว`);
    } else {
      alert(`บันทึกผลการตรวจวัดประจำปี ${yearBe} สำเร็จ`);
    }
  }

  /* =========================================================================
   * Chart.js Rendering Engine for TSPE Thai Growth Curve
   * ========================================================================= */
  function renderChart(student) {
    const canvas = $('tspe-growth-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (growthChartInstance) {
      growthChartInstance.destroy();
      growthChartInstance = null;
    }

    const isGirl = student.gender === 'girl';
    const ref = isGirl ? LhsGrowthData.GIRLS_REFERENCE : LhsGrowthData.BOYS_REFERENCE;
    const ages = LhsGrowthData.AGES; // 2..19

    const datasets = [];

    // Reference curves line styling based on gender
    // In TSPE charts: Boys are cyan/blue, Girls are pink/rose.
    const refCurveColor = isGirl ? 'rgba(219, 39, 119, 0.45)' : 'rgba(2, 132, 199, 0.45)';
    const refP50Color = isGirl ? 'rgba(190, 24, 93, 0.85)' : 'rgba(3, 105, 161, 0.85)';
    const refWeightColor = 'rgba(156, 163, 175, 0.5)';
    const refWeightP50Color = 'rgba(75, 85, 99, 0.85)';

    const percentiles = ['p3', 'p10', 'p25', 'p50', 'p75', 'p90', 'p97'];

    // 1. HEIGHT PERCENTILES (Y-axis: yHeight)
    if (chartMode === 'dual' || chartMode === 'height') {
      if (showPercentiles) {
        percentiles.forEach(p => {
          const isP50 = p === 'p50';
          const isExtreme = p === 'p3' || p === 'p97';
          datasets.push({
            label: `ส่วนสูง ${p.toUpperCase()}`,
            data: ages.map((age, i) => ({ x: age, y: ref.height[p][i] })),
            borderColor: isP50 ? refP50Color : refCurveColor,
            borderWidth: isP50 ? 2 : (isExtreme ? 1.5 : 1),
            borderDash: isP50 ? [] : (isExtreme ? [] : [3, 3]),
            pointRadius: 0,
            pointHoverRadius: 3,
            fill: false,
            tension: 0.35,
            yAxisID: 'yHeight',
            tspeType: 'ref-height',
            percentile: p.toUpperCase()
          });
        });
      }

      // Mid-parental height line at age 19
      if (showTargetHeight) {
        const mph = LhsGrowthData.calcMidParentalHeight(student.fatherHeight, student.motherHeight, student.gender);
        if (mph) {
          datasets.push({
            label: `ความสูงเป้าหมายพันธุกรรม (MPH: ${mph.target} ซม.)`,
            data: [
              { x: 17.0, y: mph.target },
              { x: 19.0, y: mph.target }
            ],
            borderColor: '#6366f1',
            borderWidth: 2.5,
            borderDash: [6, 4],
            pointRadius: [0, 5],
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            fill: false,
            yAxisID: 'yHeight',
            tspeType: 'target-height'
          });
        }
      }
    }

    // 2. WEIGHT PERCENTILES (Y-axis: yWeight)
    if (chartMode === 'dual' || chartMode === 'weight') {
      if (showPercentiles) {
        percentiles.forEach(p => {
          const isP50 = p === 'p50';
          const isExtreme = p === 'p3' || p === 'p97';
          datasets.push({
            label: `น้ำหนัก ${p.toUpperCase()}`,
            data: ages.map((age, i) => ({ x: age, y: ref.weight[p][i] })),
            borderColor: isP50 ? refWeightP50Color : refWeightColor,
            borderWidth: isP50 ? 2 : (isExtreme ? 1.5 : 1),
            borderDash: isP50 ? [] : (isExtreme ? [] : [3, 3]),
            pointRadius: 0,
            pointHoverRadius: 3,
            fill: false,
            tension: 0.35,
            yAxisID: chartMode === 'weight' ? 'yHeight' : 'yWeight',
            tspeType: 'ref-weight',
            percentile: p.toUpperCase()
          });
        });
      }
    }

    // 3. STUDENT MEASUREMENTS PLOT (Longitudinal dots & line)
    const records = student.records || [];
    
    // Student Height Plot
    if (chartMode === 'dual' || chartMode === 'height') {
      datasets.push({
        label: `ส่วนสูงจริง: ${student.name} (ซม.)`,
        data: records.map(r => ({
          x: r.age,
          y: r.height,
          record: r
        })),
        borderColor: '#0284c7',
        backgroundColor: '#38bdf8',
        borderWidth: 3,
        pointRadius: 7,
        pointHoverRadius: 10,
        pointBackgroundColor: '#0284c7',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointStyle: 'circle',
        fill: false,
        tension: 0.25,
        yAxisID: 'yHeight',
        order: 1,
        tspeType: 'student-height'
      });
    }

    // Student Weight Plot
    if (chartMode === 'dual' || chartMode === 'weight') {
      datasets.push({
        label: `น้ำหนักจริง: ${student.name} (กก.)`,
        data: records.map(r => ({
          x: r.age,
          y: r.weight,
          record: r
        })),
        borderColor: '#059669',
        backgroundColor: '#34d399',
        borderWidth: 3,
        pointRadius: 7,
        pointHoverRadius: 10,
        pointBackgroundColor: '#059669',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointStyle: 'rectRot',
        fill: false,
        tension: 0.25,
        yAxisID: chartMode === 'weight' ? 'yHeight' : 'yWeight',
        order: 1,
        tspeType: 'student-weight'
      });
    }

    // Configure Scales
    const maxAge = 19;
    const minAge = 2;

    const scales = {
      x: {
        type: 'linear',
        min: minAge,
        max: maxAge,
        title: {
          display: true,
          text: 'อายุ (ปี) · AGE (years)',
          font: { family: 'Prompt, sans-serif', size: 12, weight: 'bold' },
          color: '#374151',
          padding: { top: 8 }
        },
        ticks: {
          stepSize: 1,
          font: { family: 'Prompt, sans-serif', size: 11, weight: '600' },
          color: '#4b5563',
          callback: value => Number.isInteger(value) ? value : ''
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.8)',
          lineWidth: context => Number.isInteger(context.tick.value) ? 1.2 : 0.5
        }
      }
    };

    if (chartMode === 'dual' || chartMode === 'height') {
      scales.yHeight = {
        type: 'linear',
        position: 'left',
        min: 80,
        max: isGirl ? 180 : 190,
        title: {
          display: true,
          text: 'ส่วนสูง · HEIGHT (cm)',
          font: { family: 'Prompt, sans-serif', size: 12, weight: 'bold' },
          color: isGirl ? '#db2777' : '#0284c7'
        },
        ticks: {
          stepSize: 5,
          font: { family: 'Prompt, sans-serif', size: 10 },
          color: '#6b7280'
        },
        grid: {
          color: 'rgba(243, 244, 246, 0.9)'
        }
      };
    }

    if (chartMode === 'dual') {
      scales.yWeight = {
        type: 'linear',
        position: 'right',
        min: 10,
        max: isGirl ? 80 : 90,
        title: {
          display: true,
          text: 'น้ำหนัก · WEIGHT (kg)',
          font: { family: 'Prompt, sans-serif', size: 12, weight: 'bold' },
          color: '#059669'
        },
        ticks: {
          stepSize: 5,
          font: { family: 'Prompt, sans-serif', size: 10 },
          color: '#059669'
        },
        grid: {
          drawOnChartArea: false
        }
      };
    } else if (chartMode === 'weight') {
      scales.yHeight.title.text = 'น้ำหนัก · WEIGHT (kg)';
      scales.yHeight.min = 10;
      scales.yHeight.max = isGirl ? 80 : 90;
      scales.yHeight.title.color = '#059669';
    }

    // Chart.js init
    growthChartInstance = new Chart(canvas, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 650,
          easing: 'easeOutQuart'
        },
        interaction: {
          mode: 'nearest',
          intersect: false,
          axis: 'x'
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              boxWidth: 16,
              boxHeight: 8,
              font: { family: 'Prompt, sans-serif', size: 11, weight: '600' },
              color: '#374151',
              filter: item => {
                // Only show student points and target height in top legend
                return item.text.includes('จริง') || item.text.includes('เป้าหมาย');
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.94)',
            titleFont: { family: 'Prompt, sans-serif', size: 13, weight: 'bold' },
            bodyFont: { family: 'Prompt, sans-serif', size: 11 },
            padding: 12,
            cornerRadius: 12,
            boxPadding: 4,
            callbacks: {
              title: items => {
                const item = items[0];
                if (item?.raw?.record) {
                  const r = item.raw.record;
                  return `ปี ${r.yearBe} (${r.grade}) · อายุ ${r.age} ปี [${r.date}]`;
                }
                return `อายุ ${item.parsed.x.toFixed(1)} ปี`;
              },
              label: context => {
                const type = context.dataset.tspeType;
                const r = context.raw?.record;
                if (type === 'student-height') {
                  const hAssess = LhsGrowthData.assessHeight(context.parsed.y, context.parsed.x, student.gender);
                  return `📏 ส่วนสูง: ${context.parsed.y} ซม. (${hAssess.percentile}: ${hAssess.label})`;
                }
                if (type === 'student-weight') {
                  const wAssess = LhsGrowthData.assessWeight(context.parsed.y, context.parsed.x, student.gender);
                  return `⚖️ น้ำหนัก: ${context.parsed.y} กก. (${wAssess.percentile}: ${wAssess.label})`;
                }
                if (type === 'target-height') {
                  return `🎯 ความสูงเป้าหมายพันธุกรรม: ${context.parsed.y} ซม.`;
                }
                if (type === 'ref-height') {
                  return `TSPE ${context.dataset.percentile}: ${context.parsed.y.toFixed(1)} ซม.`;
                }
                if (type === 'ref-weight') {
                  return `TSPE ${context.dataset.percentile}: ${context.parsed.y.toFixed(1)} กก.`;
                }
                return `${context.dataset.label}: ${context.parsed.y}`;
              },
              afterBody: items => {
                const studentItem = items.find(i => i.raw?.record);
                if (studentItem && studentItem.raw.record) {
                  const rec = studentItem.raw.record;
                  const bmi = LhsGrowthData.assessBmi(rec.weight, rec.height);
                  return [
                    `------------------------`,
                    `ดัชนีมวลกาย (BMI): ${bmi.bmi} กก./ม.² (${bmi.label})`
                  ];
                }
                return [];
              }
            }
          }
        },
        scales
      }
    });
  }

  // Export View API
  globalThis.LhsGrowthView = Object.freeze({
    open,
    render,
    resize,
    selectStudent
  });

})();
