/* Single source of truth for prototype roles, routes, and unit scope. */
(() => {
  'use strict';
  const roles = Object.freeze({
    gov: Object.freeze({label:'หน่วยงานรัฐ / อปท.',type:'Gov Office',pages:Object.freeze(['env','risk','care-map','input'])}),
    school: Object.freeze({label:'สถานศึกษา',type:'School',pages:Object.freeze(['env','risk','student','input'])}),
    hospital: Object.freeze({label:'สถานพยาบาล',type:'Hospital',pages:Object.freeze(['env','risk'])}),
  });
  const pages = Object.freeze({
    env:{label:'คุณภาพอากาศ',icon:'air'},risk:{label:'กลุ่มเสี่ยง',icon:'heart'},student:{label:'ข้อมูลนักเรียน',icon:'school'},input:{label:'บันทึกข้อมูล',icon:'edit'},'care-map':{label:'แผนที่การดูแลกลุ่มเปราะบาง',icon:'map'},
  });
  const roleForSite = site => Object.keys(roles).find(key=>roles[key].type===site?.type) || null;
  const canAccess = (role,page) => roles[role]?.pages.includes(page) || false;
  function route(hash){
    const value=String(hash || '#env').replace(/^#/,'');
    if(value==='input-student')return {page:'input',form:'student',requiredRole:'school'};
    if(value==='input-infirmary')return {page:'input',form:'infirmary',requiredRole:'school'};
    if(value==='input-gov')return {page:'input',form:'citizen',requiredRole:'gov'};
    return {page:pages[value]?value:'env',form:null,requiredRole:null};
  }
  function resolve(role,hash){const parsed=route(hash);return canAccess(role,parsed.page)&&(!parsed.requiredRole||parsed.requiredRole===role)?{...parsed,denied:false}:{page:'env',form:null,denied:true};}
  function village(value){const v=String(value??'').trim().replace(/^(หมู่ที่|หมู่|ม\.)\s*/,'');const n=Number(v);return /^\d+$/.test(v)&&Number.isInteger(n)&&n>=1&&n<=12?n:null;}
  globalThis.LhsPolicy=Object.freeze({roles,pages,roleForSite,canAccess,route,resolve,village});
})();
