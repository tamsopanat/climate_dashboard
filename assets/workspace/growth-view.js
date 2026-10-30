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
        <div class="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border border-blue-400/30">
          <div class="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div class="absolute left-1/3 -top-10 w-48 h-48 bg-indigo-400/20 rounded-full blur-xl pointer-events-none"></div>

          <div class="relative z-10 space-y-2 max-w-2xl">
            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              กราฟติดตามการเจริญเติบโตรายปี
            </h1>
            <p class="text-blue-100/90 text-xs sm:text-sm font-medium leading-relaxed">
              วิเคราะห์น้ำหนักและส่วนสูงของนักเรียนเพื่อติดตามทิศทางการเจริญเติบโตอย่างใกล้ชิด)
            </p>
          </div>

          <div class="relative z-10 flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <div class="bg-white/12 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/25 text-left min-w-[130px] shadow-lg">
              <div class="text-[10px] text-blue-100 font-medium">นักเรียนในระบบ</div>
              <div class="text-lg font-black text-white">${allSchoolStudents.length} คน</div>
            </div>
            <button type="button" id="btn-open-add-measurement" class="px-4 py-2.5 rounded-2xl bg-white text-blue-900 font-bold text-xs sm:text-sm hover:bg-blue-50 transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95">
              <svg class="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>บันทึกการตรวจวัดประจำปี</span>
            </button>
          </div>
        </div>

        <!-- FILTER & STUDENT SELECTOR TOOLBAR -->
        <div class="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs space-y-4">
          <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            <!-- Class Filters -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs font-bold text-gray-500 whitespace-nowrap mr-1">ระดับชั้น:</span>
              <button type="button" data-filter="all" class="growth-filter-chip px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${classFilter === 'all'
        ? 'bg-blue-600 text-white shadow-xs'
        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      }">ทั้งหมด (${allSchoolStudents.length})</button>
              ${classes.map(c => {
        const count = allSchoolStudents.filter(s => s.gradeGroup === c).length;
        const active = classFilter === c;
        return `<button type="button" data-filter="${esc(c)}" class="growth-filter-chip px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${active
          ? 'bg-blue-600 text-white shadow-xs'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }">${esc(c)} (${count})</button>`;
      }).join('')}
            </div>

            <!-- Student Dropdown -->
            <div class="flex items-center gap-3 min-w-[280px] max-w-md w-full md:w-auto">
              <label for="student-growth-select" class="text-xs font-bold text-gray-700 whitespace-nowrap">เลือกนักเรียน:</label>
              <div class="relative w-full">
                <select id="student-growth-select" class="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition cursor-pointer shadow-2xs">
                  ${students.map(s => `
                    <option value="${esc(s.id)}" ${s.id === currentStudentId ? 'selected' : ''}>
                      ${esc(s.id)} - ${esc(s.name)} (${esc(s.gradeClass)})
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

    const mph = LhsGrowthData.calcMidParentalHeight(student.fatherHeight, student.motherHeight, student.gender);
    const heightAssess = latest ? LhsGrowthData.assessHeight(latest.height, latest.age, student.gender) : null;
    const weightAssess = latest ? LhsGrowthData.assessWeight(latest.weight, latest.age, student.gender) : null;
    const bmiAssess = latest ? LhsGrowthData.assessBmi(latest.height, latest.weight) : null;

    return `
      <!-- CLINICAL ASSESSMENT & SUMMARY CARDS -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        
        <!-- Profile Card (Left 4 cols) -->
        <div class="lg:col-span-4 bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between relative overflow-hidden">
          <div class="space-y-4">
            
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isGirl ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
                    ${isGirl ? 'นักเรียนหญิง' : 'นักเรียนชาย'}
                  </span>
                  <span class="text-xs text-gray-500 font-mono font-bold">รหัส ${esc(student.id)}</span>
                </div>
                <h2 class="text-lg sm:text-xl font-black text-gray-900 tracking-tight truncate">${esc(student.name)}</h2>
                <p class="text-xs text-gray-500 font-medium mt-0.5">ชั้น ${esc(student.gradeClass)} · ว.ด.ป. เกิด: ${esc(student.dob)}</p>
              </div>
              <div class="w-10 h-10 rounded-xl ${isGirl ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'} flex items-center justify-center shrink-0 shadow-2xs">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>

            <!-- Key Metrics Grid -->
            <div class="grid grid-cols-2 gap-2.5 pt-1">
              <div class="bg-blue-50/40 rounded-xl p-3 border border-blue-200/70">
                <div class="text-[11px] text-blue-900/80 font-bold">อายุปัจจุบัน</div>
                <div class="text-lg font-black text-blue-900 mt-0.5 leading-tight">${latest ? `${latest.age} ปี` : '--'}</div>
                <div class="text-[10px] text-blue-700/80 font-medium mt-0.5">พ.ศ. ${latest?.yearBe || '--'}</div>
              </div>

              <div class="bg-indigo-50/40 rounded-xl p-3 border border-indigo-200/70">
                <div class="text-[11px] text-indigo-900/80 font-bold">ความสูงเป้าหมาย (MPH)</div>
                <div class="text-base sm:text-lg font-black text-indigo-700 mt-0.5 leading-tight">${mph ? `${mph.rangeMin}–${mph.rangeMax} ซม.` : '--'}</div>
                <div class="text-[10px] text-indigo-700/80 font-medium mt-0.5">ช่วงความสูงตามพันธุกรรม</div>
              </div>

              <div class="bg-gray-50/80 rounded-xl p-3 border border-gray-200/80">
                <div class="text-[11px] text-gray-500 font-bold">ส่วนสูงบิดา</div>
                <div class="text-sm font-black text-gray-800 mt-0.5">${student.fatherHeight ? `${student.fatherHeight} ซม.` : 'ไม่ระบุ'}</div>
              </div>

              <div class="bg-gray-50/80 rounded-xl p-3 border border-gray-200/80">
                <div class="text-[11px] text-gray-500 font-bold">ส่วนสูงมารดา</div>
                <div class="text-sm font-black text-gray-800 mt-0.5">${student.motherHeight ? `${student.motherHeight} ซม.` : 'ไม่ระบุ'}</div>
              </div>
            </div>

          </div>

          <div class="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>บันทึกสะสม: <strong class="text-gray-800 font-bold">${records.length} ปีการศึกษา</strong></span>
            <span class="font-mono text-[11px] text-gray-600">ตรวจล่าสุด: ${latest?.date || '--'}</span>
          </div>
        </div>

        <!-- Clinical Indicator Cards (Right 8 cols) -->
        <div class="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          
          <!-- Height Assessment Card (Blue style like ข้อมูลนักเรียน Card 1) -->
          <div class="bg-blue-50/40 rounded-2xl p-5 border border-blue-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between h-full">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-blue-900 uppercase tracking-wider truncate">ส่วนสูงตามเกณฑ์อายุ</span>
              <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M12 2v20"></path>
                  <path d="m8 6 4-4 4 4"></path>
                  <path d="m8 18 4 4 4-4"></path>
                </svg>
              </div>
            </div>

            <div class="my-4 flex items-baseline gap-1.5">
              <span class="text-3xl font-black text-blue-900 tracking-tight leading-none">${latest ? latest.height : '--'}</span>
              ${latest ? '<span class="text-xs font-bold text-blue-700/90">ซม.</span>' : ''}
            </div>

            <div class="pt-3 border-t border-blue-200/60 flex items-center justify-between gap-2 text-xs">
              <span class="text-blue-800/80 font-medium">ผลการประเมิน:</span>
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${heightAssess ? heightAssess.color : 'bg-gray-100 text-gray-600'}">
                ${heightAssess ? heightAssess.label : '--'}
              </span>
            </div>
          </div>

          <!-- Weight Assessment Card (Emerald style like ข้อมูลนักเรียน Card 2) -->
          <div class="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between h-full">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-emerald-900 uppercase tracking-wider truncate">น้ำหนักตามเกณฑ์อายุ</span>
              <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <path d="M6 20h12"></path>
                  <path d="M12 3v17"></path>
                  <path d="M5 8h14"></path>
                  <path d="m5 8-2 5h4l-2-5Z"></path>
                  <path d="m19 8-2 5h4l-2-5Z"></path>
                </svg>
              </div>
            </div>

            <div class="my-4 flex items-baseline gap-1.5">
              <span class="text-3xl font-black text-emerald-700 tracking-tight leading-none">${latest ? latest.weight : '--'}</span>
              ${latest ? '<span class="text-xs font-bold text-emerald-700/90">กก.</span>' : ''}
            </div>

            <div class="pt-3 border-t border-emerald-200/60 flex items-center justify-between gap-2 text-xs">
              <span class="text-emerald-800/80 font-medium">ผลการประเมิน:</span>
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${weightAssess ? weightAssess.color : 'bg-gray-100 text-gray-600'}">
                ${weightAssess ? weightAssess.label : '--'}
              </span>
            </div>
          </div>

          <!-- BMI Assessment Card (Purple style like ข้อมูลนักเรียน Card 4) -->
          <div class="bg-purple-50/40 rounded-2xl p-5 border border-purple-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between h-full">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-purple-900 uppercase tracking-wider truncate">ดัชนีมวลกาย (BMI)</span>
              <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
            </div>

            <div class="my-4 flex items-center justify-between gap-2">
              <div class="flex items-baseline gap-1.5">
                <span class="text-3xl font-black text-purple-700 tracking-tight leading-none">${bmiAssess ? bmiAssess.bmi : '--'}</span>
                ${bmiAssess ? '<span class="text-xs font-bold text-purple-700/90">กก./ม.²</span>' : ''}
              </div>
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${bmiAssess ? bmiAssess.color : 'bg-gray-100 text-gray-600'}">
                ${bmiAssess ? bmiAssess.label : '--'}
              </span>
            </div>

            <div class="pt-3 border-t border-purple-200/60 flex items-center justify-between text-xs">
              <span class="text-purple-800/80 font-medium">เกณฑ์สมส่วน:</span>
              <span class="font-bold text-purple-900 whitespace-nowrap">18.5 – 22.9</span>
            </div>
          </div>

          <!-- Bottom Long Card: Growth Trajectory Clinical Insight -->
          <div class="sm:col-span-3 bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-4 sm:px-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 text-xs">
            <div class="flex items-center gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>
              <div>
                <span class="font-bold text-indigo-950 text-xs sm:text-sm block">การประเมินทิศทางการเจริญเติบโต</span>
                <p class="text-indigo-900/80 text-xs mt-0.5 leading-relaxed">
                  ${records.length >= 2
        ? `แนวโน้มการเจริญเติบโตของนักเรียนอยู่ในเกณฑ์ "${heightAssess?.label || 'ส่วนสูงตามเกณฑ์'}" และ "${weightAssess?.label || 'น้ำหนักตามเกณฑ์'}" บ่งชี้ภาวะโภชนาการและการเจริญเติบโตที่สมดุลตามวัย`
        : 'มีบันทึกตรวจวัด 1 ครั้ง แนะนำติดตามผลการตรวจวัดต่อเนื่องในรอบปีถัดไปเพื่อประเมินแนวโน้มการเจริญเติบโต'}
                </p>
              </div>
            </div>
            <button type="button" onclick="document.getElementById('growth-records-table-card').scrollIntoView({behavior: 'smooth'})" class="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/90 font-bold px-3.5 py-2 rounded-xl shadow-2xs transition whitespace-nowrap text-xs flex items-center gap-1.5 cursor-pointer shrink-0">
              <span>ดูประวัติทั้งหมด</span>
              <span>↓</span>
            </button>
          </div>

        </div>

      </div>

      <!-- MAIN TSPE CHART CONTAINER (OFFICIAL SHEET IMAGE WITH PLOTTED POINTS) -->
      <div class="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        
        <!-- Toolbar -->
        <div class="p-5 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full ${isGirl ? 'bg-pink-500' : 'bg-blue-600'}"></span>
              <h3 class="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                ${isGirl ? 'แบบบันทึกการเจริญเติบโตเด็กหญิงอายุ 2–19 ปี' : 'แบบบันทึกการเจริญเติบโตเด็กชายอายุ 2–19 ปี'}
              </h3>
            </div>
          </div>

          <!-- Controls & Toggles -->
          <div class="flex flex-wrap items-center gap-3">
            
            <div class="bg-gray-100 p-1 rounded-xl flex items-center text-xs font-bold">
              <button type="button" id="btn-view-official" class="px-3 py-1.5 rounded-lg transition cursor-pointer ${viewMode === 'official' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
      }">แผ่นชาร์ต TSPE</button>
              
              <button type="button" id="btn-view-vector" class="px-3 py-1.5 rounded-lg transition cursor-pointer ${viewMode === 'vector' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
      }">กราฟเวกเตอร์ขยายได้</button>
            </div>

            <!-- Plot Feature Toggles -->
            <label class="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
              <input type="checkbox" id="chk-show-height" ${showHeight ? 'checked' : ''} class="rounded text-blue-600 focus:ring-blue-500">
              <span class="font-bold">ส่วนสูง</span>
            </label>

            <label class="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none">
              <input type="checkbox" id="chk-show-weight" ${showWeight ? 'checked' : ''} class="rounded text-emerald-600 focus:ring-emerald-500">
              <span class="font-bold">น้ำหนัก</span>
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
        <div class="p-4 sm:p-6 bg-gray-50 border-t border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-gray-600">
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

          <button type="button" id="btn-export-official-sheet" class="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>บันทึกรูป</span>
          </button>
        </div>

      </div>

      <!-- LONGITUDINAL MEASUREMENTS TABLE -->
      <div id="growth-records-table-card" class="bg-white rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>📋</span>
              <span>บันทึกประวัติการตรวจวัดร่างกายรายปี</span>
            </h3>
            <p class="text-xs sm:text-sm text-gray-500 mt-0.5">
              ข้อมูลส่วนสูง น้ำหนัก และการประเมินทางคลินิกย้อนหลังของ <strong class="text-gray-900 font-bold">${esc(student.name)}</strong>
            </p>
          </div>

          <button type="button" id="btn-add-year-measurement" class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition flex items-center gap-2 cursor-pointer shrink-0">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
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
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${records.map((r, idx) => {
        const hEval = LhsGrowthData.assessHeight(r.height, r.age, student.gender);
        const wEval = LhsGrowthData.assessWeight(r.weight, r.age, student.gender);
        const bEval = LhsGrowthData.assessBmi(r.height, r.weight);
        const isLatest = idx === records.length - 1;

        return `
                  <tr class="hover:bg-blue-50/30 transition-colors duration-150 ${isLatest ? 'bg-blue-50/20 font-medium' : ''}">
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="font-bold text-gray-900">พ.ศ. ${esc(r.yearBe)}</span>
                      ${isLatest ? '<span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">ล่าสุด</span>' : ''}
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-medium text-gray-700">${esc(r.grade)}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap text-gray-500 font-mono">${esc(r.date)}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-bold text-gray-800">${r.age} ปี</td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-black text-sky-700">${r.height}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${hEval.color}">
                        ${hEval.label}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-black text-emerald-700">${r.weight}</td>
                    <td class="px-4 py-3.5 whitespace-nowrap">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${wEval.color}">
                        ${wEval.label}
                      </span>
                    </td>
                    <td class="px-4 py-3.5 whitespace-nowrap font-bold text-gray-800">
                      ${bEval.bmi} <span class="text-[10px] text-gray-400 font-normal">(${bEval.label})</span>
                    </td>
                  </tr>
                `;
      }).join('')}
            </tbody>
          </table>
        </div>
        <div class="px-6 py-3.5 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 font-medium flex items-center justify-between">
          <span>แสดงประวัติการตรวจวัดร่างกายรายปีของนักเรียนที่เลือก</span>
          <span class="font-bold text-gray-700">แสดงทั้งหมด ${records.length} รายการ</span>
        </div>
      </div>

      <!-- MODAL: ADD ANNUAL MEASUREMENT -->
      <div id="add-growth-modal" class="fixed inset-0 bg-gray-900/60 backdrop-blur-xs hidden flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-gray-100 max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          
          <div class="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <span class="text-[10px] uppercase tracking-wider font-bold text-blue-600">บันทึกตรวจวัดทางกายภาพ</span>
              <h3 class="text-lg font-black text-gray-900">บันทึกการตรวจวัดประจำปี</h3>
              <p class="text-xs text-gray-500 mt-0.5">${esc(student.name)} (${esc(student.id)})</p>
            </div>
            <button type="button" id="btn-close-growth-modal" class="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none p-1 cursor-pointer">&times;</button>
          </div>

          <form id="form-add-growth-measurement" class="space-y-4 pt-4">
            
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="growth-input-year" class="block text-xs font-bold text-gray-700 mb-1">ปีการศึกษา (พ.ศ.) *</label>
                <input type="number" id="growth-input-year" required min="2560" max="2575" value="${(latest?.yearBe || 2568) + 1}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500">
              </div>

              <div>
                <label for="growth-input-grade" class="block text-xs font-bold text-gray-700 mb-1">ระดับชั้น *</label>
                <input type="text" id="growth-input-grade" required value="${esc(student.gradeClass)}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="growth-input-date" class="block text-xs font-bold text-gray-700 mb-1">วันที่ตรวจวัด *</label>
                <input type="date" id="growth-input-date" required value="${new Date().toISOString().split('T')[0]}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500">
              </div>

              <div>
                <label for="growth-input-age" class="block text-xs font-bold text-gray-700 mb-1">อายุ ณ วันตรวจ (ปี) *</label>
                <input type="number" step="0.1" id="growth-input-age" required min="2" max="19" value="${latest ? (latest.age + 1.0).toFixed(1) : '10.0'}" class="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500">
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

            <div id="growth-calc-preview" class="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs space-y-1 text-blue-900 hidden">
              <div class="font-bold">ผลประเมินคำนวณอัตโนมัติ:</div>
              <div class="flex justify-between text-[11px]">
                <span>BMI: <strong id="preview-bmi">--</strong></span>
                <span>ส่วนสูง: <strong id="preview-height-p">--</strong></span>
                <span>น้ำหนัก: <strong id="preview-weight-p">--</strong></span>
              </div>
            </div>

            <div class="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
              <button type="button" id="btn-cancel-growth-modal" class="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer">ยกเลิก</button>
              <button type="submit" class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer">
                <span>บันทึกและพล็อตกราฟทันที</span>
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
          $('preview-height-p').textContent = `${hAssess.label}`;
          $('preview-weight-p').textContent = `${wAssess.label}`;
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
              text: `ส่วนสูง: <b>${r.height} ซม.</b> (${evalH.label})<br>น้ำหนัก: <b>${r.weight} กก.</b>`
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
              text: `น้ำหนัก: <b>${r.weight} กก.</b> (${evalW.label})<br>BMI: <b>${b.bmi}</b> (${b.label})`
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
      if (mph) ctx.fillText(`${mph.rangeMin}–${mph.rangeMax}`, cfg.header.mphX, cfg.header.mphY);

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
        ctx.fillText(`MPH ${mph.rangeMin}–${mph.rangeMax}`, x - 15, yH + 3);
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
