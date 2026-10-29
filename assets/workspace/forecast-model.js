/* Explicit demo data, with no asserted probability coverage. Real bounds must come from a model. */
(() => {
  'use strict';
  const day=(iso,delta)=>{const d=new Date(`${iso}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);};
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function triple(mean,lower,upper){if(![mean,lower,upper].every(Number.isFinite)||lower>mean||mean>upper)throw Error('Forecast requires lower <= mean <= upper');return {mean,lower,upper};}
  const thresholds=Object.freeze({pm25:150,temp:38});
  function createDemoSource(issueDate=today()){
    const obs=[
      [71.3,32.6],[78.5,33.1],[67.9,32.9],[84.1,34],[92.6,34.4],[106.8,34.2],[98.4,35.1],
      [112.7,35.5],[124.5,34.9],[138.2,36],[146.3,35.6],[132.6,35],[121.9,34.7],[117.4,35.4],
    ];
    const prediction=[
      [[128,112,146],[35.8,34.9,36.9]],[[147,127,169],[36.9,35.7,38.3]],
      [[163,138,192],[38.5,36.8,40.2]],[[155,127,186],[39,37.1,40.9]],
      [[126,96,159],[37.3,35,39.6]],[[98,66,133],[35.9,33.2,38.4]],[[76,41,114],[34.8,31.8,37.8]],
    ];
    const historyDays=180;
    let seed=0x51c1a7,pmCarry=38,tempCarry=30.4;
    const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
    const episodes=[[22,32,4],[54,57,5],[87,84,3.8],[119,48,5.5],[149,66,4.2]];
    const observed=Array.from({length:historyDays},(_,i)=>{
      const episode=episodes.reduce((total,[center,height,width])=>total+height*Math.exp(-.5*((i-center)/width)**2),0);
      const pmTarget=32+9*Math.sin(i/18)+episode;
      pmCarry=Math.max(8,pmCarry*.63+pmTarget*.37+(random()-.5)*19);
      tempCarry=tempCarry*.72+(30.6+1.7*Math.sin(i/27)+episode*.018)*.28+(random()-.5)*1.6;
      let pm25=Math.round(pmCarry*10)/10,temp=Math.round(tempCarry*10)/10;
      if(i>=historyDays-obs.length)[pm25,temp]=obs[i-(historyDays-obs.length)];
      return {date:day(issueDate,i-historyDays+1),kind:'observed',pm25,temp};
    });
    return {source:'prototype-demo',isDemo:true,issueDate,timezone:'Asia/Bangkok',coverage:null,historyDays,
      observed,
      forecasts:prediction.map(([pm,temp],i)=>({date:day(issueDate,i+1),kind:'forecast',horizon:i+1,pm25:triple(...pm),temp:triple(...temp)})),
    };
  }
  function series(source,metric,start,end,offset=0){
    if(!['pm25','temp'].includes(metric))throw Error('Unknown metric');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)return [];
    const clamp=v=>Math.round((metric==='pm25'?Math.max(0,v):v)*10)/10;
    const sourceRows=new Map([...source.observed,...source.forecasts].map(r=>[r.date,r]));
    const duration=(Date.parse(end)-Date.parse(start))/86400000;
    if(!Number.isFinite(duration)||duration>=400)return [];
    const result=[];
    for(let date=start;date<=end;date=day(date,1)){
      const row=sourceRows.get(date);
      if(!row){result.push({date,kind:'missing',mean:null,lower:null,upper:null});continue;}
      if(row.kind==='observed')result.push({date,kind:'observed',mean:clamp(row[metric]+offset),lower:null,upper:null});
      else {const v=row[metric];triple(v.mean,v.lower,v.upper);result.push({date,kind:'forecast',mean:clamp(v.mean+offset),lower:clamp(v.lower+offset),upper:clamp(v.upper+offset)});}
    }
    return result;
  }
  function alertLevel(row,threshold){
    if(!row||row.kind!=='forecast'||![row.mean,row.lower,row.upper].every(Number.isFinite)||row.lower>row.mean||row.mean>row.upper)return 'missing';
    if(row.mean>=threshold)return 'exceed';
    return row.upper>=threshold?'watch':'below';
  }
  function summarize(rows,threshold){
    const valid=rows.filter(r=>alertLevel(r,threshold)!=='missing').sort((a,b)=>a.date.localeCompare(b.date));
    const exceeded=valid.filter(r=>alertLevel(r,threshold)==='exceed');
    const upperOnly=valid.filter(r=>alertLevel(r,threshold)==='watch');
    const peak=valid.reduce((p,r)=>!p||r.mean>p.mean?r:p,null);
    return {exceeded,upperOnly,peak,readyDays:valid.length,complete:rows.length===7&&valid.length===7,
      firstExceed:exceeded[0] || null,firstWatch:upperOnly[0] || null,
      level:exceeded.length?'exceed':upperOnly.length?'watch':rows.length===7&&valid.length===7?'below':'missing'};
  }
  globalThis.LhsForecast=Object.freeze({day,today,triple,createDemoSource,series,thresholds,alertLevel,summarize});
})();
