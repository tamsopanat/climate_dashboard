(() => {
  'use strict';
  const $=id=>document.getElementById(id),esc=entryEscape,M=LhsCareModel,OM=LhsCareOpsModel;
  let context=null,map=null,layer=null,village='all',factor='all',population='all',lastSourceMode=null;
  let records=[],markers=new Map(),activeHouses=[],search='',searchTimer=null,selectedHouse=null,listLimit=50,alertCache=new Map();
  let baseMapName='ภาพถ่ายดาวเทียม + ถนน (Satellite)',footprintLayer=null,boundaryLayer=null,selectedDate='all',actionOnly=true,planDays=[];
  const center=()=>{const r=LhsBuildingSamples.referencePlace;return [r.lat,r.lng];};
  const selectedDays=()=>selectedDate==='all'?planDays:planDays.filter(d=>d.date===selectedDate);
  const alert=r=>{if(!alertCache.has(r))alertCache.set(r,OM.exposure(r,selectedDays(),AIR_RISK_FACTORS,TEMP_RISK_FACTORS));return alertCache.get(r);};
  const fullName=r=>[r.prefix,r.firstName,r.lastName].filter(Boolean).join(' ');
  function visibleRecords(){return records.filter(r=>
    (!actionOnly||alert(r).level==='exceed')&&
    (!search||[fullName(r),r.houseNo,r.code].some(v=>String(v??'').toLocaleLowerCase('th').includes(search)))&&
    (village==='all'||(village==='unknown'?LhsPolicy.village(r.moo)===null:LhsPolicy.village(r.moo)===Number(village)))&&
    (population==='all'||(population==='vulnerable'?M.vulnerable(r):!M.vulnerable(r)))&&
    (factor==='all'||factor==='air'&&r.factors.some(k=>AIR_RISK_FACTORS.includes(k))||factor==='heat'&&r.factors.some(k=>TEMP_RISK_FACTORS.includes(k))||factor==='both'&&r.factors.some(k=>AIR_RISK_FACTORS.includes(k))&&r.factors.some(k=>TEMP_RISK_FACTORS.includes(k))));}
  function fit(){if(!map)return;if(LhsCommunityData.mode(context.siteId)==='demo'&&village==='all'&&!search&&population==='all'&&factor==='all'&&boundaryLayer){map.fitBounds(boundaryLayer.getBounds(),{padding:[22,22],maxZoom:13});return;}if(activeHouses.length>1)map.fitBounds(activeHouses.map(h=>[h.lat,h.lng]),{padding:[35,35],maxZoom:17});else if(activeHouses.length===1)map.setView([activeHouses[0].lat,activeHouses[0].lng],15);else map.setView(center(),15);}
  function selectHouse(key){selectedHouse=key;const index=activeHouses.findIndex(h=>h.key===key);if(index>=listLimit){listLimit=Math.ceil((index+1)/50)*50;renderHouseList();}document.querySelectorAll('#care-house-list [data-house]').forEach(b=>{b.classList.toggle('is-selected',b.dataset.house===key);if(b.dataset.house===key)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});}
  function drawPins(){
    if(!map||!layer)return;layer.clearLayers();markers.clear();
    const groups=map.getZoom()<17?OM.cluster(activeHouses,(lat,lng)=>map.project([lat,lng],map.getZoom())):activeHouses.map(h=>({houses:[h],lat:h.lat,lng:h.lng}));
    for(const group of groups){
      if(group.houses.length>1){
        const villageNumbers=[...new Set(group.houses.map(h=>LhsPolicy.village(h.records[0].moo)).filter(n=>n!==null))];
        const villageText=villageNumbers.length===1?`ม.${villageNumbers[0]}`:villageNumbers.length?`${villageNumbers.length} หมู่`:'จุด';
        const icon=L.divIcon({className:'care-cluster-marker'+(group.houses.some(h=>h.records.some(r=>alert(r).level==='exceed'))?' is-priority':''),html:`<span>${group.houses.length}<small>${villageText}</small></span>`,iconSize:[42,42],iconAnchor:[21,21]});
        L.marker([group.lat,group.lng],{icon,title:`กลุ่มอาคาร ${group.houses.length} จุด · ${villageNumbers.map(M.villageLabel).join(', ')} · ซูมเข้าเพื่อดูแต่ละหลัง`}).addTo(layer).on('click',()=>map.fitBounds(group.houses.map(h=>[h.lat,h.lng]),{padding:[50,50],maxZoom:19,animate:false}));continue;
      }
      const house=group.houses[0];
      const first=house.records[0],count=house.records.length,hasVulnerable=house.records.some(M.vulnerable),hasGeneral=house.records.some(r=>!M.vulnerable(r));
      const levels=house.records.map(r=>alert(r).level),level=levels.includes('exceed')?'exceed':levels.includes('watch')?'watch':levels.includes('missing')?'missing':hasVulnerable?'below':'general';
      const pin=L.divIcon({className:'care-roof-marker',html:`<span class="care-roof-dot status-${level}" aria-hidden="true"></span>`,iconSize:[28,28],iconAnchor:[14,14]});
      const popup=document.createElement('div');popup.className='care-popup';
      popup.innerHTML=`<strong>บ้านเลขที่ ${esc(first.houseNo||'ยังไม่ระบุ')}</strong><small>${esc(M.villageLabel(first.moo))}${first.isDemo?' (หมู่สมมุติ)':''} · ${count} คน</small><div class="care-location-status">${first.isDemo?'อาคารอ้างอิงสาธารณะ · ยังไม่ยืนยันครัวเรือน':'พิกัดจากทะเบียน · รอตรวจสอบตำแหน่งหลังคา'}${first.buildingSourceUrl?`<br><a href="${esc(first.buildingSourceUrl)}" target="_blank" rel="noopener noreferrer">แหล่งอ้างอิง ${esc(first.buildingId)}</a>`:''}</div>${house.records.map(r=>`<p><b>${esc(fullName(r))}</b><small>${r.age!=null?`อายุ ${r.age} ปี · `:''}${M.vulnerable(r)?'กลุ่มเปราะบาง':'กลุ่มทั่วไป'}</small><small>${M.vulnerable(r)?esc(r.factors.map(k=>VULNERABILITY_DEF[k]?.th||k).join(', ')):'ไม่พบปัจจัยเปราะบางตามรายการประเมิน'}</small>${r.phone?`<small>ติดต่อ ${esc(r.phone)}</small>`:''}${!r.isDemo?`<button type="button" data-edit="${esc(r.id)}">ดู / แก้ไขทะเบียน</button>`:'<small>บุคคลและการจับคู่ครัวเรือนสมมุติ</small>'}</p>`).join('')}`;
      popup.addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)LhsWorkspace.editCitizen(b.dataset.edit);});
      const marker=L.marker([house.lat,house.lng],{icon:pin,title:`บ้านเลขที่ ${first.houseNo||'ยังไม่ระบุ'} ${M.villageLabel(first.moo)} จำนวน ${count} คน`}).addTo(layer).bindPopup(popup);
      marker.on('popupopen',()=>selectHouse(house.key));
      markers.set(house.key,marker);
    }
  }
  function focusHouse(key){const house=activeHouses.find(h=>h.key===key);if(!house)return;selectHouse(key);map.setView([house.lat,house.lng],19,{animate:false});drawPins();markers.get(key)?.openPopup();const side=document.querySelector('#panel-care-map .care-side'),main=document.querySelector('#panel-care-map .care-main');if(side.getBoundingClientRect().top>main.getBoundingClientRect().top+100)$('care-map-canvas').scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  function draw(){
    if(!map)return;
    records=LhsCommunityData.records(context.siteId);
    alertCache.clear();listLimit=50;
    const sourceMode=LhsCommunityData.mode(context.siteId),visible=visibleRecords(),stats=M.summarize(visible);
    lastSourceMode=sourceMode;
    activeHouses=M.households(visible,{includeGeneral:true});layer.clearLayers();markers.clear();
    for(const [id,value] of Object.entries({people:stats.total,vulnerable:stats.vulnerable,general:stats.general,houses:stats.houses,villages:stats.villages}))$('care-stat-'+id).textContent=value;
    $('care-data-badge').textContent=sourceMode==='demo'?'อาคารอ้างอิงสาธารณะ · บุคคลสมมุติ · ยังไม่ยืนยันครัวเรือน':'ข้อมูลจากทะเบียน · รอยืนยันตำแหน่งหลังคา';
    $('care-baseline-confirmed').textContent=M.households(records.filter(r=>OM.coordinateStatus(r)==='confirmed'),{includeGeneral:true}).length;
    LhsCareOpsView.render({days:planDays,selectedDate,actionOnly,records,visible,onDate:value=>{selectedDate=value;draw();document.querySelector(`#care-ops-board [data-plan-day="${value}"]`)?.focus({preventScroll:true});},onAction:value=>{actionOnly=value;draw();$('care-action-only').focus({preventScroll:true});}});
    $('care-data-source').value=sourceMode;$('care-factor').value=factor;$('care-population').value=population;
    $('care-factor').disabled=population==='general';
    $('care-village-select').innerHTML='<option value="all">ทุกหมู่บ้าน</option>'+M.villages.map(v=>`<option value="${v.number}">${esc(M.villageLabel(v.number))}</option>`).join('')+(records.some(r=>LhsPolicy.village(r.moo)===null)||village==='unknown'?'<option value="unknown">ยังไม่ระบุหมู่บ้าน</option>':'');
    $('care-village-select').value=village;
    $('care-results-count').textContent=`${visible.length} คน · ${activeHouses.length} หลัง`;
    $('care-filter-state').textContent=[population==='vulnerable'?'กลุ่มเปราะบาง':population==='general'?'กลุ่มทั่วไป':'',factor==='air'?'ตามเกณฑ์ฝุ่น':factor==='heat'?'ตามเกณฑ์ความร้อน':factor==='both'?'ทั้งฝุ่นและความร้อน':'',search?`ค้นหา “${search}”`:'',actionOnly?'เฉพาะจุดที่ควรเตรียมดูแล':''].filter(Boolean).join(' · ')||'แสดงข้อมูลทุกกลุ่ม';
    $('care-reset').hidden=!(search||village!=='all'||population!=='all'||factor!=='all'||actionOnly||selectedDate!=='all');
    $('care-toolbar-source').textContent=sourceMode==='demo'?'ข้อมูลสมมุติ 12 หมู่บ้าน':'ทะเบียนของหน่วยงาน';
    $('care-fit').textContent=sourceMode==='demo'&&village==='all'&&!search&&population==='all'&&factor==='all'?'ดูทั้งตำบล':'แสดงหมุดทั้งหมด';
    $('care-villages').innerHTML=M.villages.map(v=>{const rows=records.filter(r=>LhsPolicy.village(r.moo)===v.number),n=rows.filter(M.vulnerable).length;return `<button type="button" data-village="${v.number}" aria-pressed="${village===String(v.number)}"${v.note?` title="${esc(v.note)}"`:''}><span><small>หมู่ที่ ${v.number}</small>${esc(v.name)}</span><b>${rows.length}<small>คน</small></b><em>เปราะบาง ${n} · ทั่วไป ${rows.length-n}</em></button>`;}).join('');
    const unknown=records.filter(r=>LhsPolicy.village(r.moo)===null).length;
    $('care-village-summary').innerHTML=`จำนวนบนปุ่มคือประชากรทั้งหมดในชุดข้อมูล ก่อนใช้ตัวกรอง${unknown?`<br><button type="button" class="entry-link" data-village="unknown">ยังไม่ระบุหมู่บ้าน ${unknown} ราย</button>`:''}`;
    $('care-view-heading').textContent=village==='all'?'ทุกหมู่บ้าน':M.villageLabel(village);
    const missing=visible.filter(r=>!M.validCoordinates(r)).length;
    $('care-coordinates-note').textContent=missing?`ยังมี ${missing} รายที่พิกัดไม่ครบหรือไม่ถูกต้อง จึงยังไม่แสดงหมุด`:'บุคคลที่อยู่พิกัดเดียวกันแสดงเป็นหมุดบ้านเดียว ตัวเลขบนหมุดคือจำนวนคนในมุมมองนี้';
    footprintLayer.clearLayers();
    for(const h of activeHouses){const ring=h.records[0].buildingFootprint;if(ring)L.polygon(ring.map(([lng,lat])=>[lat,lng]),{color:'#55cbd3',weight:1.3,fillOpacity:.09,interactive:false}).addTo(footprintLayer);}
    drawPins();
    renderHouseList();
    $('care-show-all').setAttribute('aria-pressed',String(village==='all'));
    if(!activeHouses.some(h=>h.key===selectedHouse))selectedHouse=null;
    selectHouse(selectedHouse);fit();
  }
  function renderHouseList(){
    $('care-house-list').innerHTML=activeHouses.length?activeHouses.slice(0,listLimit).map(h=>{const r=h.records[0],v=h.records.filter(M.vulnerable).length;return `<button type="button" data-house="${h.key}"><b>บ้านเลขที่ ${esc(r.houseNo||'ยังไม่ระบุ')}</b><small>${esc(M.villageLabel(r.moo))}${r.isDemo?' · หมู่สมมุติ':''}</small><span>${esc(h.records.map(fullName).join(' · '))}</span><small class="care-house-alert">${h.records.some(r=>alert(r).level==='exceed')?'! ควรเตรียมดูแลตามพยากรณ์':h.records.some(r=>alert(r).level==='watch')?'△ เฝ้าระวังขอบเขตบน':'ติดตามตามปกติ'}</small><small class="care-house-groups"><span>เปราะบาง ${v}</span><span>ทั่วไป ${h.records.length-v}</span></small></button>`;}).join('')+(activeHouses.length>listLimit?`<div class="care-list-more"><small>แสดง ${Math.min(listLimit,activeHouses.length)} จาก ${activeHouses.length} หลัง · หมุดบนแผนที่แสดงครบ</small><button type="button" id="care-load-more" class="entry-btn entry-btn-small">แสดงเพิ่มอีก ${Math.min(50,activeHouses.length-listLimit)} หลัง</button></div>`:''):`<div class="care-empty">${LhsCommunityData.mode(context.siteId)==='registry'?'ยังไม่มีบ้านที่เข้าเงื่อนไข เพิ่มทะเบียนประชาชนพร้อมพิกัด หรือปรับตัวกรอง':'ไม่มีบ้านสมมุติตามตัวกรองนี้'}</div>`;
  }
  function open(next){
    if(next.role!=='gov')return;
    if(context?.siteId!==next.siteId||lastSourceMode!==LhsCommunityData.mode(next.siteId)){village='all';factor='all';population='all';search='';selectedHouse=null;selectedDate='all';actionOnly=true;}
    clearTimeout(searchTimer);
    context={...next};
    planDays=OM.forecast(forecastConfig,userSites.find(s=>s.id===next.siteId));
    if(map){map.remove();map=null;}
    let panel=$('panel-care-map');if(!panel){panel=document.createElement('div');panel.id='panel-care-map';panel.className='w-full hidden';document.querySelector('main').appendChild(panel);}
    panel.innerHTML=`<div class="care-heading"><div><div class="entry-eyebrow">วางแผนล่วงหน้า · อบต.กองแขก</div><h2>แผนที่การดูแลกลุ่มเปราะบาง</h2><p>พยากรณ์ 7 วัน → เตรียมรายการกลุ่มเปราะบาง → ประสานอาสาสมัคร</p></div><button type="button" id="care-add" class="entry-btn entry-btn-primary"><span aria-hidden="true">＋</span>เพิ่มทะเบียนประชาชน</button></div>
      <div class="care-overview care-baseline"><div><span>ประชากรทั้งตำบล</span><strong>6,626<small> คน</small></strong></div><div><span>ครัวเรือนทั้งตำบล</span><strong>2,353<small> ครัวเรือน</small></strong></div><div><span>หมู่บ้านในพื้นที่</span><strong>12<small> หมู่บ้าน</small></strong></div><div><span>ครัวเรือนที่ยืนยันตำแหน่งจริง</span><strong id="care-baseline-confirmed">0</strong></div></div><p class="care-baseline-note">ยอดรวมเบื้องต้นทั้งตำบลตามข้อมูลที่ระบุ แยกจากระเบียนตัวอย่างและผลตามตัวกรอง</p>
      <section id="care-ops-board" class="care-ops-board" aria-label="เตรียมการดูแลจากพยากรณ์ 7 วัน"></section>
      <div class="care-toolbar" aria-label="กรองข้อมูลบนแผนที่"><div class="care-toolbar-label"><span>มุมมองการดูแล</span><strong id="care-toolbar-source"></strong></div><div class="care-toolbar-main"><div class="care-village-filter"><label for="care-village-select">หมู่บ้าน</label><select id="care-village-select"></select></div><div><label for="care-population">กลุ่มประชากร</label><select id="care-population"><option value="all">ทุกกลุ่ม</option><option value="vulnerable">กลุ่มเปราะบาง</option><option value="general">กลุ่มทั่วไป</option></select></div><button type="button" id="care-more-filters" class="entry-btn" aria-expanded="false" aria-controls="care-extra-filters">ตัวกรองเพิ่มเติม <span aria-hidden="true">⌄</span></button></div><div id="care-extra-filters" hidden><div><label for="care-data-source">ชุดข้อมูล</label><select id="care-data-source"><option value="demo">ข้อมูลสมมุติ 12 หมู่บ้าน</option><option value="registry">ทะเบียนของหน่วยงาน</option></select></div><div><label for="care-factor">ปัจจัยเปราะบาง</label><select id="care-factor"><option value="all">ทั้งหมด</option><option value="air">ตามเกณฑ์ฝุ่น PM2.5</option><option value="heat">ตามเกณฑ์ความร้อน</option><option value="both">เข้าเกณฑ์ทั้งสองด้าน</option></select></div></div></div>
      <div class="care-view-counts"><span>ในมุมมองนี้ <b id="care-stat-people">0</b> คน</span><span>เปราะบาง <b id="care-stat-vulnerable">0</b></span><span>ทั่วไป <b id="care-stat-general">0</b></span><span>จุดบ้าน <b id="care-stat-houses">0</b></span><span>หมู่จากชุดข้อมูล <b id="care-stat-villages">0</b></span></div><div class="care-layout"><section class="care-main" aria-label="แผนที่บ้านประชากรในพื้นที่"><div class="care-map-caption"><div><strong id="care-view-heading">ทุกหมู่บ้าน</strong><span id="care-filter-state"></span></div><button type="button" id="care-reset" class="entry-btn entry-btn-small" hidden>ล้างตัวกรอง</button><button type="button" id="care-fit" class="entry-btn entry-btn-small">แสดงหมุดทั้งหมด</button></div><div id="care-map-canvas" class="care-map-canvas" role="region" aria-label="ตำแหน่งบ้านของกลุ่มเปราะบางและกลุ่มทั่วไป"></div><div class="care-pin-legend"><span><i class="priority"></i>ควรเตรียมดูแล</span><span><i class="watch"></i>เฝ้าระวังขอบเขตบน</span><span><i class="general"></i>กลุ่มทั่วไป</span><span>กรอบสีฟ้า = อาคารอ้างอิง · เส้นประ = ขอบเขตตำบลอ้างอิง</span></div></section>
      <aside class="care-side" aria-label="ค้นหาบ้านและรายชื่อ"><div class="care-side-head"><h3>บ้านและประชากร</h3><p id="care-results-count" role="status" aria-live="polite" aria-atomic="true"></p><label for="care-search">ค้นหาในมุมมองนี้</label><input id="care-search" type="search" value="${esc(search)}" placeholder="ชื่อบุคคล หรือบ้านเลขที่" autocomplete="off"></div><div id="care-house-list" class="care-house-list"></div></aside></div>
      <details class="care-village-directory"><summary>ภาพรวมรายชื่อทั้ง 12 หมู่บ้าน<span>จำนวนประชากรแยกตามกลุ่ม</span></summary><div class="care-directory-content"><button type="button" id="care-show-all" class="entry-btn entry-btn-small">ทุกหมู่บ้าน</button><div id="care-villages" class="care-villages"></div><div id="care-village-summary" class="care-side-summary"></div></div></details>
      <div class="care-footnote"><strong id="care-data-badge"></strong><span>ใช้ข้อมูลชุดเดียวกับหน้ากลุ่มเสี่ยงของหน่วยงาน</span><details><summary>เกี่ยวกับข้อมูลและตำแหน่งบ้าน</summary><p id="care-coordinates-note"></p><p>ครัวเรือนตัวอย่างกระจายหมู่บ้านละ 55 จุดภายในขอบเขตตำบลอ้างอิง GISTDA/DOPA ใช้ตำแหน่งหมู่บ้านจาก GeoNames เพื่อเลือกแนวอาคารจากภาพดาวเทียมของ Microsoft ซึ่งอาจคลาดเคลื่อนหรือล้าสมัย ไม่รับรองว่าเป็นบ้านพักหรือมีผู้อยู่อาศัยจริง หมู่บ้านและบุคคลในระเบียนเป็นข้อมูลสมมุติ ไม่มีการจับคู่กับทะเบียนครัวเรือนจริง <a href="https://github.com/microsoft/GlobalMLBuildingFootprints" target="_blank" rel="noopener noreferrer">Microsoft Global ML Building Footprints</a> · <a href="assets/workspace/CDLA-Permissive-2.0.txt">CDLA Permissive 2.0</a> · <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer">GeoNames · CC BY 4.0</a> · <a href="assets/workspace/kong-khaek-boundary.geojson" download>ขอบเขตอ้างอิง GISTDA/DOPA</a> · <a href="assets/workspace/building-samples.geojson" download>ข้อมูลอาคารอ้างอิง</a></p></details></div><dialog id="care-mission-dialog" class="care-mission-dialog"></dialog>`;
    map=L.map('care-map-canvas',{scrollWheelZoom:false}).setView(center(),16);
    const tiles=(service,attribution='Tiles © Esri and contributors',maxNativeZoom=19)=>L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`,{attribution,maxZoom:19,maxNativeZoom});
    const baseMaps={
      'แผนที่ถนน Esri (แนะนำ)':tiles('World_Street_Map','© Esri, HERE, Garmin, OpenStreetMap'),
      'ภาพถ่ายดาวเทียม + ถนน (Satellite)':L.layerGroup([tiles('World_Imagery','Tiles © Esri and contributors',18),tiles('Reference/World_Transportation','© Esri',18),tiles('Reference/World_Boundaries_and_Places','© Esri',18)]),
      'แผนที่ภูมิประเทศ (Topo)':tiles('World_Topo_Map'),
      'แผนที่โทนสว่าง (Light Gray)':tiles('Canvas/World_Light_Gray_Base','Tiles © Esri, HERE, Garmin',16),
    };
    baseMaps[baseMapName].addTo(map);
    const baseMapControl=L.control.layers(baseMaps,null,{position:'topleft',collapsed:true}).addTo(map);
    const baseMapToggle=baseMapControl.getContainer().querySelector('.leaflet-control-layers-toggle');
    baseMapToggle.title='เลือกแผนที่ฐาน';baseMapToggle.setAttribute('aria-label','เลือกแผนที่ฐาน');
    map.on('baselayerchange',e=>{baseMapName=e.name;});
    boundaryLayer=L.geoJSON(LhsBuildingSamples.boundary,{style:{color:'#d0ecf1',weight:2,dashArray:'7 5',fillColor:'#55cbd3',fillOpacity:.025},interactive:false}).addTo(map);
    footprintLayer=L.layerGroup().addTo(map);layer=L.layerGroup().addTo(map);map.on('zoomend',drawPins);
    map.attributionControl.addAttribution('ขอบเขต GISTDA/DOPA · หมู่บ้าน GeoNames · อาคาร <a href="https://github.com/microsoft/GlobalMLBuildingFootprints" target="_blank" rel="noopener noreferrer">Microsoft</a>');
    $('care-more-filters').onclick=()=>{const expanded=$('care-more-filters').getAttribute('aria-expanded')!=='true';$('care-more-filters').setAttribute('aria-expanded',String(expanded));$('care-extra-filters').hidden=!expanded;};
    $('care-village-select').addEventListener('change',e=>{village=e.target.value;draw();});
    $('care-search').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('th');clearTimeout(searchTimer);searchTimer=setTimeout(draw,180);});
    $('care-reset').onclick=()=>{village='all';population='all';factor='all';search='';actionOnly=false;selectedDate='all';$('care-search').value='';clearTimeout(searchTimer);draw();};
    $('care-fit').onclick=fit;
    $('care-data-source').addEventListener('change',e=>{LhsCommunityData.setMode(context.siteId,e.target.value);village='all';filterPatients();draw();});
    $('care-population').addEventListener('change',e=>{population=e.target.value;if(population==='general'){factor='all';actionOnly=false;}draw();});
    $('care-factor').addEventListener('change',e=>{factor=e.target.value;if(factor!=='all')population='vulnerable';draw();});
    $('care-show-all').onclick=()=>{village='all';draw();};
    $('care-add').onclick=()=>window.openDataEntry('citizen');
    panel.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='care-load-more'){const previous=listLimit;listLimit+=50;renderHouseList();selectHouse(selectedHouse);$('care-house-list').querySelectorAll('[data-house]')[previous]?.focus({preventScroll:true});}if(b.dataset.village){village=village===b.dataset.village?'all':b.dataset.village;draw();}if(b.dataset.house)focusHouse(b.dataset.house);};
    draw();
  }
  function close(){clearTimeout(searchTimer);if(map){map.remove();map=null;}if($('panel-care-map'))$('panel-care-map').innerHTML='';}
  globalThis.LhsCareMap=Object.freeze({open,close,resize(){setTimeout(()=>{if(map){map.invalidateSize();fit();}},100);}});
})();
