/* =========================================================================
 * TSPE Thai Growth Chart View & Official Image Longitudinal Plotting
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
  let viewMode = 'official'; // 'official' (Official TSPE Image Sheet) | 'vector' (Vector Chart.js)
  let showHeight = true;
  let showWeight = true;
  let showTargetHeight = true;
  let showYearTags = false;
  let classFilter = 'all';
  let growthChartInstance = null;

  // Cached image objects
  const imageCache = {
    boy: null,
    girl: null
  };

  // Official TSPE Chart Sheet Coordinate Configuration (724 x 1024 px)
  const TSPE_SHEET = Object.freeze({
    boy: {
      src: 'assets/images/tspe-boys-growth-chart.jpg',
      width: 724,
      height: 1024,
      ageMin: 2.0,
      ageMax: 19.0,
      xMin: 69.5,
      xMax: 654.5,
      // Height scale: 190 cm at y=138.5, 80 cm at y=838.5
      hMin: 80.0,
      hMax: 190.0,
      yHMax: 138.5,
      yHMin: 838.5,
      // Weight scale: 90 kg at y=422.5, 10 kg at y=934.5
      wMin: 10.0,
      wMax: 90.0,
      yWMax: 422.5,
      yWMin: 934.5,
      hColor: '#0284c7', // vibrant cyan/blue
      hLineColor: '#0284c7',
      wColor: '#059669', // vibrant emerald
      wLineColor: '#059669',
      mphColor: '#6366f1',
      // Text positions on top header blank lines
      header: {
        nameX: 190, nameY: 73,
        dobX: 445, dobY: 73,
        hnX: 575, hnY: 73,
        fHeightX: 238, fHeightY: 100,
        mHeightX: 412, mHeightY: 100,
        mphX: 608, mphY: 100
      }
    },
    girl: {
      src: 'assets/images/tspe-girls-growth-chart.jpg',
      width: 724,
      height: 1024,
      ageMin: 2.0,
      ageMax: 19.0,
      xMin: 69.5,
      xMax: 654.5,
      // Height scale: 180 cm at y=138.5, 80 cm at y=826.0
      hMin: 80.0,
      hMax: 180.0,
      yHMax: 138.5,
      yHMin: 826.0,
      // Weight scale: 80 kg at y=447.0, 10 kg at y=930.0
      wMin: 10.0,
      wMax: 80.0,
      yWMax: 447.0,
      yWMin: 930.0,
      hColor: '#db2777', // vibrant pink
      hLineColor: '#db2777',
      wColor: '#0d9488', // vibrant teal
      wLineColor: '#0d9488',
      mphColor: '#8b5cf6',
      header: {
        nameX: 190, nameY: 73,
        dobX: 445, dobY: 73,
        hnX: 575, hnY: 73,
        fHeightX: 238, fHeightY: 100,
        mHeightX: 412, mHeightY: 100,
        mphX: 608, mphY: 100
      }
    }
  });

  function getCoordinates(gender, age, height, weight) {
    const cfg = gender === 'girl' ? TSPE_SHEET.girl : TSPE_SHEET.boy;
    const x = cfg.xMin + ((age - cfg.ageMin) / (cfg.ageMax - cfg.ageMin)) * (cfg.xMax - cfg.xMin);
    const yH = cfg.yHMax + ((cfg.hMax - height) / (cfg.hMax - cfg.hMin)) * (cfg.yHMin - cfg.yHMax);
    const yW = cfg.yWMax + ((cfg.wMax - weight) / (cfg.wMax - cfg.wMin)) * (cfg.yWMin - cfg.yWMax);
    return { x, yH, yW };
  }

  function preloadImages() {
    if (!imageCache.boy) {
      imageCache.boy = new Image();
      imageCache.boy.src = TSPE_SHEET.boy.src;
    }
    if (!imageCache.girl) {
      imageCache.girl = new Image();
      imageCache.girl.src = TSPE_SHEET.girl.src;
    }
  }

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
    return Array.from(new Set(all.map(s => s.gradeGroup))).sort();
  }

  function selectStudent(studentId) {
    currentStudentId = studentId;
    render();
  }

  function open(context) {
    currentContext = { ...context };
    preloadImages();
    const students = LhsGrowthData.getAllStudentsForSchool(currentContext.siteId);
    if (!students.some(s => s.id === currentStudentId)) {
      currentStudentId = students.length > 0 ? students[0].id : null;
    }
    classFilter = 'all';
    render();
  }

  function resize() {
    drawOfficialSheet();
    if (growthChartInstance) {
      setTimeout(() => {
        try { growthChartInstance.resize(); } catch (e) { }
      }, 60);
    }
  }

  function render() {
    const panel = ensurePanel();
    const students = getActiveStudents();
    const allSchoolStudents = LhsGrowthData.getAllStudentsForSchool(currentContext.siteId);

    if (!students.some(s => s.id === currentStudentId)) {
      currentStudentId = students.length > 0 ? students[0].id : (allSchoolStudents.length > 0 ? allSchoolStudents[0].id : null);
    }

    const student = currentStudentId ? LhsGrowthData.getStudentGrowth(currentStudentId) : null;
    const isGirl = student?.gender === 'girl';
    const schoolName = currentContext.siteId === 'usr_saraphi' ? 'โรงเรียนสารภีพิทยาคม' : 'โรงเรียนบ้านศาลาแม่ทา';
    const classes = getAvailableClasses();

    panel.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
        
        <!-- TOP BANNER -->
        <div class="rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 border-sky-400/40 shadow-blue-500/10">
          <div class="relative z-10 space-y-2 max-w-2xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-white/20 text-white border border-white/30">
              <span>📊</span>
              <span>บทบาท: สถานศึกษา · กราฟการเจริญเติบโตรายปี (TSPE Growth Chart)</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <span>กราฟติดตามการเจริญเติบโตรายปี</span>
              <span class="text-xs font-normal px-2.5 py-1 rounded-lg bg-white/20 border border-white/25">TSPE Official Sheet</span>
            </h1>
            <p class="text-white/90 text-xs sm:text-sm font-normal leading-relaxed">
              พล็อตค่าน้ำหนักและส่วนสูงจริงของนักเรียนลงบนแผ่นชาร์ตมาตรฐานสมาคมต่อมไร้ท่อเด็กและวัยรุ่นไทย (TSPE 2022)
              อ้างอิงกรมอนามัย กระทรวงสาธารณสุข และ WHO 2006 สำหรับ ${esc(schoolName)}
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
              <button type="button" data-filter="all" class="growth-filter-chip px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${classFilter === 'all'
        ? 'bg-purple-600 text-white shadow-xs'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }">ทั้งหมด (${allSchoolStudents.length})</button>
              ${classes.map(c => {
        const count = allSchoolStudents.filter(s => s.gradeGroup === c).length;
        const active = classFilter === c;
        return `<button type="button" data-filter="${esc(c)}" class="growth-filter-chip px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${active
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
      if (viewMode === 'official') {
        drawOfficialSheet();
      } else {
        renderVectorChart(student);
      }
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
    const bmiAssess = latest ? LhsGrowthData.assessBmi(latest.height, latest.weight) : null;

    // Growth velocity
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

    return `
      <!-- CLINICAL ASSESSMENT & SUMMARY CARDS -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        <!-- Profile Card (Left 4 cols) -->
        <div class="lg:col-span-4 bg-white rounded-3xl border border-gray-200/90 p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div class="space-y-4">
            
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3.5">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-xs ${isGirl ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-sky-100 text-sky-700 border border-sky-200'
      }">
                  ${isGirl ? '👧' : '👦'}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-0.5 rounded-md font-bold uppercase ${isGirl ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-sky-50 text-sky-700 border border-sky-200'
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

            <!-- Pubertal reference -->
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

      <!-- MAIN TSPE CHART CONTAINER (OFFICIAL SHEET IMAGE WITH PLOTTED POINTS) -->
      <div class="bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden">
        
        <!-- Toolbar -->
        <div class="p-5 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-b from-gray-50/50 to-white">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full ${isGirl ? 'bg-pink-500' : 'bg-sky-500'}"></span>
              <h3 class="text-base sm:text-lg font-black text-gray-900">
                ${isGirl ? 'แบบบันทึกการเจริญเติบโตเด็กหญิงอายุ 2–19 ปี (TSPE Official Growth Chart)' : 'แบบบันทึกการเจริญเติบโตเด็กชายอายุ 2–19 ปี (TSPE Official Growth Chart)'}
              </h3>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              พล็อตค่าน้ำหนักและส่วนสูงจริงลงบนแผ่นชาร์ตต้นฉบับสมาคมต่อมไร้ท่อเด็กและวัยรุ่นไทย (TSPE 2022)
            </p>
          </div>

          <!-- Controls & Toggles -->
          <div class="flex flex-wrap items-center gap-3">
            
            <div class="bg-gray-100 p-1 rounded-2xl flex items-center text-xs font-bold">
              <button type="button" id="btn-view-official" class="px-3 py-1.5 rounded-xl transition cursor-pointer ${viewMode === 'official' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
      }">📋 แผ่นชาร์ต TSPE (ต้นฉบับ)</button>
              
              <button type="button" id="btn-view-vector" class="px-3 py-1.5 rounded-xl transition cursor-pointer ${viewMode === 'vector' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
      }">📈 กราฟเวกเตอร์ขยายได้</button>
            </div>

            <!-- Plot Feature Toggles -->
            <label class="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
              <input type="checkbox" id="chk-show-height" ${showHeight ? 'checked' : ''} class="rounded text-sky-600 focus:ring-sky-500">
              <span class="font-medium">ส่วนสูง</span>
            </label>

            <label class="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
              <input type="checkbox" id="chk-show-weight" ${showWeight ? 'checked' : ''} class="rounded text-emerald-600 focus:ring-emerald-500">
              <span class="font-medium">น้ำหนัก</span>
            </label>

          </div>
        </div>

        <!-- Sheet Display Body -->
        <div class="p-4 sm:p-6 bg-slate-100/60 flex flex-col items-center justify-center relative min-h-[550px]">
          
          ${viewMode === 'official' ? `
            <!-- OFFICIAL TSPE CANVAS CONTAINER -->
            <div class="relative max-w-[760px] w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-300">
              <canvas id="tspe-official-canvas" width="724" height="1024" class="w-full h-auto block select-none cursor-crosshair"></canvas>
              
              <!-- Floating Tooltip -->
              <div id="tspe-canvas-tooltip" class="absolute pointer-events-none hidden bg-gray-950/95 text-white text-xs px-3 py-2.5 rounded-xl shadow-2xl border border-gray-700 z-30 space-y-1">
                <div id="tooltip-title" class="font-bold text-sky-300">--</div>
                <div id="tooltip-body" class="text-[11px] text-gray-200">--</div>
              </div>
            </div>
          ` : `
            <!-- VECTOR CHART CANVAS -->
            <div class="w-full bg-white rounded-2xl shadow-sm p-4 relative" style="height: 540px;">
              <canvas id="tspe-growth-chart"></canvas>
            </div>
          `}

        </div>

        <!-- Chart Footnote & Actions -->
        <div class="p-4 sm:p-6 bg-gray-50/80 border-t border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-gray-600">
          <div class="space-y-1">
            <div class="flex items-center gap-4 flex-wrap">
              <span class="inline-flex items-center gap-1.5">
                <span class="w-3.5 h-3.5 rounded-full ${isGirl ? 'bg-pink-600' : 'bg-sky-600'} inline-block border-2 border-white shadow-xs"></span>
                <strong class="text-gray-900">ส่วนสูงจริง (Height Plot)</strong>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="w-3.5 h-3.5 rounded-full ${isGirl ? 'bg-teal-600' : 'bg-emerald-600'} inline-block border-2 border-white shadow-xs"></span>
                <strong class="text-gray-900">น้ำหนักจริง (Weight Plot)</strong>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="w-5 h-0.5 bg-indigo-500 border-dashed inline-block"></span>
                <span class="text-indigo-800 font-bold">Mid-parental height target</span>
              </span>
            </div>
            <p class="text-[11px] text-gray-400 mt-1">
              ที่มา: สมาคมต่อมไร้ท่อเด็กและวัยรุ่นไทย (TSPE 2022) / สำนักโภชนาการ กรมอนามัย และ WHO Growth Standards 2006
            </p>
          </div>

          <button type="button" id="btn-export-official-sheet" class="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition shadow-xs flex items-center gap-2 whitespace-nowrap cursor-pointer">
            <span>📷</span>
            <span>บันทึกรูปชาร์ต TSPE (PNG)</span>
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
        const bEval = LhsGrowthData.assessBmi(r.height, r.weight);

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
    const sel = $('student-growth-select');
    if (sel) {
      sel.onchange = e => selectStudent(e.target.value);
    }

    document.querySelectorAll('.growth-filter-chip').forEach(btn => {
      btn.onclick = () => {
        classFilter = btn.dataset.filter;
        render();
      };
    });

    const btnOfficial = $('btn-view-official');
    const btnVector = $('btn-view-vector');
    if (btnOfficial) btnOfficial.onclick = () => { viewMode = 'official'; render(); };
    if (btnVector) btnVector.onclick = () => { viewMode = 'vector'; render(); };

    const chkH = $('chk-show-height');
    if (chkH) chkH.onchange = e => { showHeight = e.target.checked; if (viewMode === 'official') drawOfficialSheet(); else renderVectorChart(LhsGrowthData.getStudentGrowth(currentStudentId)); };

    const chkW = $('chk-show-weight');
    if (chkW) chkW.onchange = e => { showWeight = e.target.checked; if (viewMode === 'official') drawOfficialSheet(); else renderVectorChart(LhsGrowthData.getStudentGrowth(currentStudentId)); };

    const btnOpenAdd = $('btn-open-add-measurement');
    const btnAddYear = $('btn-add-year-measurement');
    if (btnOpenAdd) btnOpenAdd.onclick = openAddModal;
    if (btnAddYear) btnAddYear.onclick = openAddModal;

    const btnClose = $('btn-close-growth-modal');
    const btnCancel = $('btn-cancel-growth-modal');
    if (btnClose) btnClose.onclick = closeAddModal;
    if (btnCancel) btnCancel.onclick = closeAddModal;

    const btnExport = $('btn-export-official-sheet');
    if (btnExport) {
      btnExport.onclick = () => {
        const canvas = $('tspe-official-canvas') || $('tspe-growth-chart');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `TSPE_Growth_Chart_${currentStudentId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
    }

    // Modal form logic
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
          const b = LhsGrowthData.assessBmi(h, w);
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

    // Setup interactive mouse hover on canvas
    setupCanvasHover();
  }

  function setupCanvasHover() {
    const canvas = $('tspe-official-canvas');
    const tooltip = $('tspe-canvas-tooltip');
    if (!canvas || !tooltip) return;

    canvas.onmousemove = e => {
      const student = LhsGrowthData.getStudentGrowth(currentStudentId);
      if (!student) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = 724 / rect.width;
      const scaleY = 1024 / rect.height;

      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const records = student.records || [];
      let found = null;
      let minDistance = 16; // hover radius in canvas pixels

      records.forEach(r => {
        const { x, yH, yW } = getCoordinates(student.gender, r.age, r.height, r.weight);
        if (showHeight) {
          const dH = Math.hypot(mouseX - x, mouseY - yH);
          if (dH < minDistance) {
            minDistance = dH;
            const evalH = LhsGrowthData.assessHeight(r.height, r.age, student.gender);
            found = {
              x: (x / scaleX),
              y: (yH / scaleY),
              title: `ปี พ.ศ. ${r.yearBe} (${r.grade}) · อายุ ${r.age} ปี`,
              text: `📏 ส่วนสูง: <b>${r.height} ซม.</b> (${evalH.percentile} - ${evalH.label})<br>⚖️ น้ำหนัก: <b>${r.weight} กก.</b>`
            };
          }
        }
        if (showWeight) {
          const dW = Math.hypot(mouseX - x, mouseY - yW);
          if (dW < minDistance) {
            minDistance = dW;
            const evalW = LhsGrowthData.assessWeight(r.weight, r.age, student.gender);
            const b = LhsGrowthData.assessBmi(r.height, r.weight);
            found = {
              x: (x / scaleX),
              y: (yW / scaleY),
              title: `ปี พ.ศ. ${r.yearBe} (${r.grade}) · อายุ ${r.age} ปี`,
              text: `⚖️ น้ำหนัก: <b>${r.weight} กก.</b> (${evalW.percentile} - ${evalW.label})<br>🩺 BMI: <b>${b.bmi}</b> (${b.label})`
            };
          }
        }
      });

      if (found) {
        $('tooltip-title').innerHTML = found.title;
        $('tooltip-body').innerHTML = found.text;
        tooltip.style.left = `${Math.min(rect.width - 220, Math.max(10, found.x + 12))}px`;
        tooltip.style.top = `${Math.max(10, found.y - 45)}px`;
        tooltip.classList.remove('hidden');
      } else {
        tooltip.classList.add('hidden');
      }
    };

    canvas.onmouseleave = () => {
      tooltip.classList.add('hidden');
    };
  }

  /* =========================================================================
   * Official TSPE Sheet Canvas Drawing
   * ========================================================================= */
  function drawOfficialSheet() {
    const canvas = $('tspe-official-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const student = LhsGrowthData.getStudentGrowth(currentStudentId);
    if (!student) return;

    const isGirl = student.gender === 'girl';
    const cfg = isGirl ? TSPE_SHEET.girl : TSPE_SHEET.boy;
    const img = isGirl ? imageCache.girl : imageCache.boy;

    const doDraw = (imageObj) => {
      // 1. Draw base TSPE background sheet
      ctx.clearRect(0, 0, 724, 1024);
      ctx.drawImage(imageObj, 0, 0, 724, 1024);

      // 2. Render student header details on top blank lines
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px Prompt, sans-serif';

      // Name
      ctx.fillText(student.name, cfg.header.nameX, cfg.header.nameY);
      // DOB
      ctx.fillText(student.dob, cfg.header.dobX, cfg.header.dobY);
      // HN / Student ID
      ctx.fillText(student.id, cfg.header.hnX, cfg.header.hnY);
      // Father's height
      if (student.fatherHeight) ctx.fillText(`${student.fatherHeight}`, cfg.header.fHeightX, cfg.header.fHeightY);
      // Mother's height
      if (student.motherHeight) ctx.fillText(`${student.motherHeight}`, cfg.header.mHeightX, cfg.header.mHeightY);
      // Mid-parental height
      const mph = LhsGrowthData.calcMidParentalHeight(student.fatherHeight, student.motherHeight, student.gender);
      if (mph) ctx.fillText(`${mph.target}`, cfg.header.mphX, cfg.header.mphY);

      const records = student.records || [];
      if (records.length === 0) return;

      // 3. Draw Height Trajectory and Points
      if (showHeight) {
        const heightColor = cfg.hColor;

        // Line
        ctx.beginPath();
        ctx.strokeStyle = heightColor;
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        records.forEach((r, idx) => {
          const { x, yH } = getCoordinates(student.gender, r.age, r.height, r.weight);
          if (idx === 0) ctx.moveTo(x, yH);
          else ctx.lineTo(x, yH);
        });
        ctx.stroke();

        // Points & Labels
        records.forEach(r => {
          const { x, yH } = getCoordinates(student.gender, r.age, r.height, r.weight);

          // Outer halo
          ctx.beginPath();
          ctx.arc(x, yH, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = heightColor;
          ctx.stroke();

          // Inner solid dot
          ctx.beginPath();
          ctx.arc(x, yH, 4, 0, Math.PI * 2);
          ctx.fillStyle = heightColor;
          ctx.fill();

          // Year Tag
          if (showYearTags) {
            ctx.font = 'bold 10px Prompt, sans-serif';
            ctx.fillStyle = '#0f172a';
            ctx.textAlign = 'center';
            ctx.fillText(`${r.yearBe}`, x, yH - 10);
          }
        });
      }

      // 4. Draw Weight Trajectory and Points
      if (showWeight) {
        const weightColor = cfg.wColor;

        // Line
        ctx.beginPath();
        ctx.strokeStyle = weightColor;
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        records.forEach((r, idx) => {
          const { x, yW } = getCoordinates(student.gender, r.age, r.height, r.weight);
          if (idx === 0) ctx.moveTo(x, yW);
          else ctx.lineTo(x, yW);
        });
        ctx.stroke();

        // Points & Labels
        records.forEach(r => {
          const { x, yW } = getCoordinates(student.gender, r.age, r.height, r.weight);

          // Outer halo
          ctx.beginPath();
          ctx.arc(x, yW, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = weightColor;
          ctx.stroke();

          // Inner solid dot
          ctx.beginPath();
          ctx.arc(x, yW, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = weightColor;
          ctx.fill();

          // Year Tag
          if (showYearTags) {
            ctx.font = 'bold 10px Prompt, sans-serif';
            ctx.fillStyle = '#065f46';
            ctx.textAlign = 'center';
            ctx.fillText(`${r.yearBe}`, x, yW + 16);
          }
        });
      }

      // 5. Draw Mid-parental Target Height crosshair at Age 19
      if (mph && showTargetHeight && showHeight) {
        const { x, yH } = getCoordinates(student.gender, 19, mph.target, 50);

        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = cfg.mphColor;
        ctx.lineWidth = 2;

        // Horizontal target range bar at age 19
        const { yH: yMin } = getCoordinates(student.gender, 19, mph.rangeMin, 50);
        const { yH: yMax } = getCoordinates(student.gender, 19, mph.rangeMax, 50);

        ctx.beginPath();
        ctx.moveTo(x - 12, yH);
        ctx.lineTo(x + 12, yH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, yMin);
        ctx.lineTo(x, yMax);
        ctx.stroke();

        // Target center circle
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, yH, 4, 0, Math.PI * 2);
        ctx.fillStyle = cfg.mphColor;
        ctx.fill();

        ctx.font = 'bold 9px Prompt, sans-serif';
        ctx.fillStyle = cfg.mphColor;
        ctx.textAlign = 'right';
        ctx.fillText(`MPH ${mph.target}`, x - 15, yH + 3);
        ctx.restore();
      }
    };

    if (img && img.complete && img.naturalWidth !== 0) {
      doDraw(img);
    } else {
      const newImg = new Image();
      newImg.src = cfg.src;
      newImg.onload = () => {
        if (isGirl) imageCache.girl = newImg;
        else imageCache.boy = newImg;
        doDraw(newImg);
      };
    }
  }

  /* =========================================================================
   * Vector Chart.js Engine (Secondary View)
   * ========================================================================= */
  function renderVectorChart(student) {
    const canvas = $('tspe-growth-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (growthChartInstance) {
      growthChartInstance.destroy();
      growthChartInstance = null;
    }

    const isGirl = student.gender === 'girl';
    const ref = isGirl ? LhsGrowthData.GIRLS_REFERENCE : LhsGrowthData.BOYS_REFERENCE;
    const ages = LhsGrowthData.AGES;
    const datasets = [];

    const refCurveColor = isGirl ? 'rgba(219, 39, 119, 0.45)' : 'rgba(2, 132, 199, 0.45)';
    const refP50Color = isGirl ? 'rgba(190, 24, 93, 0.85)' : 'rgba(3, 105, 161, 0.85)';
    const refWeightColor = 'rgba(156, 163, 175, 0.5)';
    const refWeightP50Color = 'rgba(75, 85, 99, 0.85)';
    const percentiles = ['p3', 'p10', 'p25', 'p50', 'p75', 'p90', 'p97'];

    // Height curves
    if (showHeight) {
      percentiles.forEach(p => {
        const isP50 = p === 'p50';
        datasets.push({
          label: `ส่วนสูง ${p.toUpperCase()}`,
          data: ages.map((age, i) => ({ x: age, y: ref.height[p][i] })),
          borderColor: isP50 ? refP50Color : refCurveColor,
          borderWidth: isP50 ? 2 : 1,
          borderDash: isP50 ? [] : [3, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.35,
          yAxisID: 'yHeight'
        });
      });
    }

    // Weight curves
    if (showWeight) {
      percentiles.forEach(p => {
        const isP50 = p === 'p50';
        datasets.push({
          label: `น้ำหนัก ${p.toUpperCase()}`,
          data: ages.map((age, i) => ({ x: age, y: ref.weight[p][i] })),
          borderColor: isP50 ? refWeightP50Color : refWeightColor,
          borderWidth: isP50 ? 2 : 1,
          borderDash: isP50 ? [] : [3, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.35,
          yAxisID: 'yWeight'
        });
      });
    }

    const records = student.records || [];

    // Student Height Plot
    if (showHeight) {
      datasets.push({
        label: `ส่วนสูงจริง: ${student.name} (ซม.)`,
        data: records.map(r => ({ x: r.age, y: r.height, record: r })),
        borderColor: '#0284c7',
        backgroundColor: '#38bdf8',
        borderWidth: 3,
        pointRadius: 7,
        pointHoverRadius: 10,
        pointBackgroundColor: '#0284c7',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        fill: false,
        tension: 0.25,
        yAxisID: 'yHeight',
        order: 1
      });
    }

    // Student Weight Plot
    if (showWeight) {
      datasets.push({
        label: `น้ำหนักจริง: ${student.name} (กก.)`,
        data: records.map(r => ({ x: r.age, y: r.weight, record: r })),
        borderColor: '#059669',
        backgroundColor: '#34d399',
        borderWidth: 3,
        pointRadius: 7,
        pointHoverRadius: 10,
        pointBackgroundColor: '#059669',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        fill: false,
        tension: 0.25,
        yAxisID: 'yWeight',
        order: 1
      });
    }

    const scales = {
      x: {
        type: 'linear',
        min: 2,
        max: 19,
        title: { display: true, text: 'อายุ (ปี) · AGE (years)', font: { family: 'Prompt, sans-serif', size: 12, weight: 'bold' } },
        ticks: { stepSize: 1, callback: v => Number.isInteger(v) ? v : '' }
      },
      yHeight: {
        type: 'linear',
        position: 'left',
        min: 80,
        max: isGirl ? 180 : 190,
        title: { display: true, text: 'ส่วนสูง · HEIGHT (cm)', font: { family: 'Prompt, sans-serif', size: 12, weight: 'bold' }, color: isGirl ? '#db2777' : '#0284c7' }
      },
      yWeight: {
        type: 'linear',
        position: 'right',
        min: 10,
        max: isGirl ? 80 : 90,
        title: { display: true, text: 'น้ำหนัก · WEIGHT (kg)', font: { family: 'Prompt, sans-serif', size: 12, weight: 'bold' }, color: '#059669' },
        grid: { drawOnChartArea: false }
      }
    };

    growthChartInstance = new Chart(canvas, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              filter: item => item.text.includes('จริง')
            }
          }
        },
        scales
      }
    });
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

    if (typeof showToastNotification === 'function') {
      showToastNotification(`บันทึกผลการตรวจวัดประจำปี ${yearBe} ของ ${student.name} เรียบร้อยแล้ว`);
    } else {
      alert(`บันทึกผลการตรวจวัดประจำปี ${yearBe} สำเร็จ`);
    }
  }

  // Export View API
  globalThis.LhsGrowthView = Object.freeze({
    open,
    render,
    resize,
    selectStudent,
    drawOfficialSheet
  });

})();
