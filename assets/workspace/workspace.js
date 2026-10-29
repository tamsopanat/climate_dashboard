/* Page access and active unit are controlled here, never by individual form routes. */
(() => {
  'use strict';
  const P=LhsPolicy,$=id=>document.getElementById(id),esc=entryEscape;
  const initialHash=location.hash || '#env',CONTEXT_KEY='lhs_workspace_context_v2';
  const legacySwitch=window.switchDashboardTab,legacyVisibility=window.updateSchoolStudentTabVisibility;
  const context={role:'school',siteId:'usr_saraphi',page:'env',form:null};
  let booting=true,changingContext=false;
  const paths={air:'<path d="M12 3v3M4 12h3m10 0h3M7 15a5 5 0 0 1 10 0M3 18h18M6 22h12"/>',heart:'<path d="M20 5a5 5 0 0 0-7 0l-1 1-1-1a5 5 0 0 0-7 7l8 8 8-8a5 5 0 0 0 0-7zM5 12h4l2-4 2 8 2-4h4"/>',school:'<path d="m2 9 10-5 10 5-10 5zM6 11v7c4 3 8 3 12 0v-7M22 9v7"/>',growth:'<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-7 7"/><circle cx="19" cy="9" r="1.5"/><circle cx="14" cy="14" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="3" cy="17" r="1.5"/>',edit:'<path d="m16 3 5 5M4 20l4-1L21 6l-5-5L3 14l-1 7z"/>',map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>'};
  const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  function currentSite(){return userSites.find(s=>s.id===context.siteId);}
  function notice(text){const el=$('workspace-notice');el.hidden=!text;el.textContent=text || '';}
  function nav(){
    const buttons=(mobile=false)=>P.roles[context.role].pages.map(page=>`<button type="button" class="workspace-nav sidebar-tab-btn${mobile?' workspace-nav-mobile':''}" id="nav-tab-${page}${mobile?'-mobile':''}" data-page="${page}"${context.page===page?' aria-current="page"':''} title="${P.pages[page].label}">${icon(P.pages[page].icon)}<span class="${mobile?'':'sidebar-text'}">${mobile&&page==='care-map'?'แผนที่การดูแล':P.pages[page].label}</span></button>`).join('');
    $('climate-tabs-container').querySelector('nav').innerHTML=buttons();
    $('mobile-tabs-container').innerHTML=buttons(true);
    $('mobile-tabs-container').style.gridTemplateColumns=`repeat(${P.roles[context.role].pages.length},minmax(0,1fr))`;
    for(const root of [$('climate-tabs-container'),$('mobile-tabs-container')])root.onclick=e=>{const b=e.target.closest('[data-page]');if(b)navigate(b.dataset.page);};
  }
  function updateHeader(){
    $('workspace-role').value=context.role;
    $('workspace-unit').innerHTML=userSites.filter(s=>P.roleForSite(s)===context.role).map(s=>`<option value="${s.id}"${s.id===context.siteId?' selected':''}>${esc(s.name)}</option>`).join('');
    $('workspace-breadcrumb').innerHTML=`<span>${P.roles[context.role].label}</span><span aria-hidden="true">/</span><span>${esc(currentSite()?.name)}</span><span aria-hidden="true">/</span><strong>${P.pages[context.page].label}</strong>`;
  }
  function normalizeRoute(page,form){return page==='input'?(context.role==='gov'?'#input-gov':form==='student'?'#input-student':'#input-infirmary'):'#'+page;}
  function navigate(page,form=null,{denied=false}={}){
    if(booting){legacySwitch(page==='input'||page==='care-map'||page==='growth'?'env':page);return;}
    if(changingContext)return;
    LhsEntry.capture();
    if(!P.canAccess(context.role,page)){page='env';form=null;denied=true;}
    if(page==='input'&&context.role==='school'&&form==='citizen'){page='env';denied=true;}
    if(page==='input'&&context.role==='gov'&&form&&form!=='citizen'){page='env';denied=true;}
    const previousPage=context.page;context.page=page;context.form=form;
    ['env','risk','student','growth','input','care-map'].forEach(id=>$('panel-'+id)?.classList.add('hidden'));
    if(['env','risk','student'].includes(page))legacySwitch(page);
    else if(page==='growth')LhsGrowthView.open({...context});
    else if(page==='input')LhsEntry.open({...context},form);
    else if(page==='care-map')LhsCareMap.open({...context});
    $('panel-'+page).classList.remove('hidden');
    nav();updateHeader();history.replaceState(null,'',normalizeRoute(page,context.form));
    notice(denied?'หน้านี้ไม่อยู่ในบทบาทที่เลือก จึงแสดงหน้าคุณภาพอากาศ โดยคงบทบาทและหน่วยงานเดิมไว้':'');
    if(page==='input')setTimeout(()=>window.dispatchEvent(new Event('resize')),80);
    if(page==='growth')LhsGrowthView.resize();
    if(page==='care-map')LhsCareMap.resize();
    if(previousPage!==page)window.scrollTo({top:0,left:0,behavior:'instant'});
  }
  function setContext(siteId,{announce=false}={}){
    const site=userSites.find(s=>s.id===siteId);if(!site)return;
    LhsEntry.capture();
    const previousRole=context.role,previousPage=context.page;
    context.role=P.roleForSite(site);context.siteId=site.id;
    if(previousRole==='gov'&&context.role!=='gov')LhsCareMap.close();
    const permitted=P.canAccess(context.role,previousPage);
    changingContext=true;
    const hospital=HOSPITAL_ROLES.find(h=>h.id===site.id||h.hospcode===site.id);
    onHospitalChanged(hospital.hospcode,false);onUserChanged(site.id,false,false);
    currentStudentSearchQuery='';currentStudentClassFilter='all';currentStudentStatusFilter='all';
    const search=$('student-search-input');if(search)search.value='';
    const patientSearch=$('patient-search');if(patientSearch)patientSearch.value='';
    const comparison=$('location-select');if(comparison)comparison.value='';
    LhsForecastView.resetComparison();
    setDefaultDateRange();fetchDashboardData();
    changingContext=false;
    try{localStorage.setItem(CONTEXT_KEY,JSON.stringify({siteId:site.id}));}catch{}
    navigate(permitted?previousPage:'env',previousRole===context.role?context.form:null);
    if(announce&&!permitted)notice('เปลี่ยนบทบาทแล้ว เมนูและหน้าที่แสดงปรับตามบทบาทใหม่');
  }
  function route(hash){const r=P.resolve(context.role,hash);navigate(r.page,r.form,{denied:r.denied});}
  function addQuickActions(){
    for(const [selector,label,form] of [['#panel-student > div','เพิ่ม / แก้ไขข้อมูลนักเรียน','student'],['#panel-student > div','บันทึกการใช้ห้องพยาบาล','infirmary'],['#panel-risk > div','บันทึกข้อมูล',null]]){
      const root=document.querySelector(selector);if(!root)continue;
      let bar=root.querySelector('.entry-quick-actions');if(!bar){bar=document.createElement('div');bar.className='entry-quick-actions';root.prepend(bar);}
      const button=document.createElement('button');button.type='button';button.className='entry-btn entry-btn-small';button.textContent=label;button.dataset.entryShortcut='true';button.onclick=()=>navigate('input',form);bar.appendChild(button);
    }
  }
  function refreshShortcuts(){document.querySelectorAll('[data-entry-shortcut]').forEach(b=>b.hidden=!P.canAccess(context.role,'input'));}
  const main=document.querySelector('main');
  const shell=document.createElement('div');shell.innerHTML=`<header class="workspace-context" aria-label="บทบาทและหน่วยงานที่กำลังใช้งาน"><div class="workspace-selectors"><div class="workspace-control"><label for="workspace-role">บทบาท · กำหนดเมนูที่มองเห็น</label><select id="workspace-role">${Object.entries(P.roles).map(([key,r])=>`<option value="${key}">${r.label}</option>`).join('')}</select></div><div class="workspace-control"><label for="workspace-unit">หน่วยงาน · กำหนดขอบเขตและค่าเริ่มต้นของข้อมูล</label><select id="workspace-unit"></select></div></div><div id="workspace-breadcrumb" class="workspace-breadcrumb" aria-live="polite"></div></header><div id="workspace-notice" class="workspace-notice" role="status" hidden></div>`;
  main.prepend(shell);
  // Legacy inputs remain hidden for the original chart and patient code to use internally.
  for(const id of ['user-select','hospital-user-select'])$(id)?.closest('header')?.setAttribute('hidden','');
  const schoolSwitcher=$('student-school-switcher');if(schoolSwitcher)schoolSwitcher.hidden=true;
  // Its selector styling can vary, so hide the enclosing scope card by a stable DOM relationship.
  if(schoolSwitcher)schoolSwitcher.parentElement.parentElement.hidden=true;
  window.switchDashboardTab=(page)=>navigate(page);
  window.updateSidebarNavVisuals=()=>{if(!booting){nav();refreshShortcuts();}};
  window.updateSchoolStudentTabVisibility=function(roleCode){if(booting)legacyVisibility(roleCode);else if(!changingContext){nav();refreshShortcuts();}};
  $('workspace-role').addEventListener('change',e=>{const site=userSites.find(s=>P.roleForSite(s)===e.target.value);setContext(site.id,{announce:true});refreshShortcuts();});
  $('workspace-unit').addEventListener('change',e=>{setContext(e.target.value);refreshShortcuts();});
  window.openDataEntry=form=>navigate('input',form);
  window.LhsWorkspace=Object.freeze({
    context:()=>({...context}),
    entryChanged(form){if(context.page==='input'){context.form=form;history.replaceState(null,'',normalizeRoute('input',form));}},
    editCitizen(id){if(context.role!=='gov')return;navigate('input','citizen');LhsEntry.edit(id);},
  });
  window.addEventListener('hashchange',()=>{if(!booting)route(location.hash);});
  document.addEventListener('lhs:records-changed',()=>{if(context.page==='care-map')LhsCareMap.open({...context});});
  window.addEventListener('DOMContentLoaded',()=>{
    booting=false;addQuickActions();
    let siteId='usr_saraphi';try{const saved=JSON.parse(localStorage.getItem(CONTEXT_KEY)||'null');if(userSites.some(s=>s.id===saved?.siteId))siteId=saved.siteId;}catch{}
    setContext(siteId);route(initialHash);refreshShortcuts();
  });
})();
