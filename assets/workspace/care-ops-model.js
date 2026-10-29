/* Planning data: reported population totals are separate from mapped sample records. */
(() => {
  'use strict';
  const baseline=Object.freeze({siteId:'usr_maechaem',people:6626,households:2353,villages:12,source:'ข้อมูลเบื้องต้นที่ผู้ใช้ระบุ',asOf:null});
  const coordinateStatus=r=>r.isDemo?'example-building':r.coordinateVerification==='roof-confirmed'&&r.coordinateSource&&LhsCareModel.validCoordinates(r)?'confirmed':'unverified';
  function forecast(source,site){
    const first=LhsForecast.day(source.issueDate,1),last=LhsForecast.day(source.issueDate,7);
    const pm=LhsForecast.series(source,'pm25',first,last,((site.basePM??20)-20)*.4);
    const temp=LhsForecast.series(source,'temp',first,last,((site.baseTemp??30.8)-30.8)*.4);
    return pm.map((row,i)=>({date:row.date,pm25:row,temp:temp[i],airLevel:LhsForecast.alertLevel(row,150),heatLevel:LhsForecast.alertLevel(temp[i],38)}));
  }
  function exposure(record,days,airFactors,heatFactors){
    if(!LhsCareModel.vulnerable(record))return {level:'general',dates:[],hazards:[]};
    const air=record.factors.some(k=>airFactors.includes(k)),heat=record.factors.some(k=>heatFactors.includes(k));
    const exceeded=days.filter(d=>air&&d.airLevel==='exceed'||heat&&d.heatLevel==='exceed');
    const watched=days.filter(d=>air&&d.airLevel==='watch'||heat&&d.heatLevel==='watch');
    const relevant=exceeded.length?exceeded:watched;
    const missing=days.some(d=>air&&d.airLevel==='missing'||heat&&d.heatLevel==='missing');
    const hazards=[];if(relevant.some(d=>air&&d.airLevel===(exceeded.length?'exceed':'watch')))hazards.push('pm25');if(relevant.some(d=>heat&&d.heatLevel===(exceeded.length?'exceed':'watch')))hazards.push('temp');
    return {level:exceeded.length?'exceed':watched.length?'watch':missing?'missing':'below',dates:relevant.map(d=>d.date),hazards};
  }
  function tasks(records,days,airFactors,heatFactors){
    const rows=records.map(record=>({record,alert:exposure(record,days,airFactors,heatFactors)})).filter(r=>r.alert.level==='exceed');
    const grouped=new Map();
    for(const row of rows){
      const r=row.record,key=r.householdId||`${r.siteId}:${r.moo||'unknown'}:${r.houseNo||r.id}`;
      if(!grouped.has(key))grouped.set(key,{key,moo:r.moo,houseNo:r.houseNo,lat:r.lat,lng:r.lng,records:[],dates:new Set(),hazards:new Set(),confirmed:true,isDemo:false});
      const task=grouped.get(key);task.records.push(r);row.alert.dates.forEach(d=>task.dates.add(d));row.alert.hazards.forEach(h=>task.hazards.add(h));task.confirmed=task.confirmed&&coordinateStatus(r)==='confirmed';task.isDemo=task.isDemo||!!r.isDemo;
    }
    return [...grouped.values()].map(t=>({...t,dates:[...t.dates].sort(),hazards:[...t.hazards]}));
  }
  function cluster(houses,project,size=44){
    const cells=new Map();
    for(const house of houses){const p=project(house.lat,house.lng),key=`${Math.floor(p.x/size)}:${Math.floor(p.y/size)}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(house);}
    return [...cells.entries()].map(([key,items])=>({key,houses:items,lat:items.reduce((n,h)=>n+h.lat,0)/items.length,lng:items.reduce((n,h)=>n+h.lng,0)/items.length}));
  }
  globalThis.LhsCareOpsModel=Object.freeze({baseline,coordinateStatus,forecast,exposure,tasks,cluster});
})();
