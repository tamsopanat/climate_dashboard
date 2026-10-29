(() => {
  'use strict';
  let rangePreset='30',showBands=true;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateText=iso=>new Date(`${iso}T12:00:00+07:00`).toLocaleDateString('th-TH',{day:'numeric',month:'short'});
  const weekday=iso=>new Date(`${iso}T12:00:00+07:00`).toLocaleDateString('th-TH',{weekday:'short'});
  const metrics={pm25:{label:'PM2.5',unit:'µg/m³',color:'#5264d9',axis:'y',shape:'circle',side:'แกนซ้าย'},temp:{label:'อุณหภูมิ',unit:'°C',color:'#cc7936',axis:'y1',shape:'rect',side:'แกนขวา'}};
  const levelText={exceed:'ค่าคาดการณ์ถึง/เกินเกณฑ์',watch:'เฉพาะขอบเขตบนถึงเกณฑ์',below:'ยังไม่ถึงเกณฑ์ที่กำหนด',missing:'ข้อมูลไม่ครบ'};
  const symbol={exceed:'!',watch:'△',below:'·',missing:'?'};
  function offsetFor(site,key){return key==='pm25'?((site.basePM??20)-20)*.4:((site.baseTemp??30.8)-30.8)*.4;}
  function period(preset){return {start:LhsForecast.day(forecastConfig.issueDate,preset==='forecast'?1:1-Number(preset)),end:LhsForecast.day(forecastConfig.issueDate,7)};}
  function applyPeriod(preset){rangePreset=preset;const p=period(preset);$('start-date').value=p.start;$('end-date').value=p.end;render();}
  function installControls(){
    const canvas=$('env-chart');if($('forecast-toolbar'))return;
    const comparison=$('province-select').parentElement.parentElement,graphControls=comparison.parentElement;
    const toolbar=document.createElement('div');toolbar.id='forecast-toolbar';toolbar.className='forecast-toolbar fc-chart-options';
    toolbar.innerHTML='<label class="fc-band-toggle"><input id="forecast-show-bands" type="checkbox" checked>แสดงขอบเขตล่าง–บน</label>';
    graphControls.append(toolbar);
    $('forecast-show-bands').addEventListener('change',e=>{showBands=e.target.checked;render();});
    comparison.id='forecast-comparison-fields';comparison.classList.add('forecast-comparison-fields');comparison.hidden=true;
    const compareButton=document.createElement('button');compareButton.type='button';compareButton.id='forecast-compare-toggle';compareButton.className='entry-btn entry-btn-small';compareButton.textContent='เพิ่มพื้นที่เปรียบเทียบ';compareButton.setAttribute('aria-expanded','false');compareButton.setAttribute('aria-controls',comparison.id);graphControls.append(compareButton);
    compareButton.onclick=()=>{const open=comparison.hidden;comparison.hidden=!open;compareButton.setAttribute('aria-expanded',String(open));compareButton.textContent=open?'ยกเลิกการเปรียบเทียบ':'เพิ่มพื้นที่เปรียบเทียบ';if(!open){$('location-select').value='';render();}};
    $('start-date').setAttribute('aria-label','วันที่เริ่มต้นกราฟแนวโน้ม');$('end-date').setAttribute('aria-label','วันที่สิ้นสุดกราฟแนวโน้ม');
    const board=document.createElement('section');board.id='forecast-alert-board';board.className='fc-decision-board';board.setAttribute('aria-labelledby','forecast-alert-title');

    const caption=document.createElement('div');caption.id='forecast-plot-caption';caption.className='fc-plot-caption';canvas.parentElement.before(caption);
    canvas.parentElement.classList.add('fc-plot-area');
    const oldNotes=canvas.parentElement.nextElementSibling;
    const notes=document.createElement('div');notes.id='forecast-notes';notes.className='forecast-notes';
    notes.innerHTML='<div class="forecast-key"><span><i class="key-solid"></i>เส้นทึบ: ตรวจวัดจำลอง</span><span><i class="key-dashed"></i>เส้นประ: พยากรณ์จำลอง</span><span><i class="key-band"></i>แถบสี: ขอบเขตล่าง–บน</span></div><div id="forecast-range-error" role="status" hidden></div>';
    oldNotes.replaceWith(notes);notes.after(board);
    const intro=canvas.closest('section').querySelector('h2 + p');if(intro)intro.textContent='ดูแนวโน้มย้อนหลังและพยากรณ์ฝุ่น PM2.5 กับอุณหภูมิในกราฟเดียว พร้อมสรุปวันถึงเกณฑ์ใน 7 วันข้างหน้า';
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label','กราฟรวมฝุ่น PM2.5 แกนซ้าย หน่วยไมโครกรัมต่อลูกบาศก์เมตร และอุณหภูมิแกนขวา หน่วยองศาเซลเซียส มีเส้นเกณฑ์ 150 และ 38 ตามลำดับ พร้อมสรุป 7 วันข้างหน้าอยู่ใต้กราฟ');
  }
  const forecastZone={id:'forecastZone',beforeDraw(chart){
    const index=chart.forecastStartIndex;if(index<0||!chart.chartArea)return;
    const {ctx,chartArea,scales:{x}}=chart;
    const left=Math.max(chartArea.left,x.getPixelForValue(index)-(index>0?(x.getPixelForValue(index)-x.getPixelForValue(index-1))/2:0));
    ctx.save();ctx.fillStyle='#f5f3fb';ctx.fillRect(left,chartArea.top,chartArea.right-left,chartArea.bottom-chartArea.top);ctx.setLineDash([4,4]);ctx.strokeStyle='#b7accf';ctx.beginPath();ctx.moveTo(left,chartArea.top);ctx.lineTo(left,chartArea.bottom);ctx.stroke();ctx.restore();
  }};
  const thresholdLines={id:'thresholdLines',afterDatasetsDraw(chart){
    if(!chart.chartArea)return;
    const {ctx,chartArea}=chart;
    for(const key of ['pm25','temp']){
      const m=metrics[key],threshold=LhsForecast.thresholds[key],y=chart.scales[m.axis].getPixelForValue(threshold);
      if(y<chartArea.top||y>chartArea.bottom)continue;
      const text=`${m.label} ≥ ${threshold} ${m.unit}`;
      ctx.save();ctx.strokeStyle=m.color;ctx.lineWidth=1.4;ctx.setLineDash(key==='pm25'?[8,5]:[3,4]);ctx.beginPath();ctx.moveTo(chartArea.left,y);ctx.lineTo(chartArea.right,y);ctx.stroke();ctx.setLineDash([]);
      ctx.font='600 10px Prompt, sans-serif';const width=ctx.measureText(text).width+12;
      const x=key==='pm25'?chartArea.left+3:chartArea.right-width-3,top=Math.max(chartArea.top,y-18);
      ctx.fillStyle='#fffffff0';ctx.fillRect(x,top,width,17);ctx.fillStyle=m.color;ctx.textBaseline='middle';ctx.fillText(text,x+6,top+8.5);ctx.restore();
    }
  }};
  function init(){
    installControls();
    envChart=new Chart($('env-chart').getContext('2d'),{
      type:'line',data:{labels:[],datasets:[]},plugins:[forecastZone,thresholdLines],
      options:{responsive:true,maintainAspectRatio:false,animation:false,stacked:false,interaction:{mode:'index',intersect:false},
        plugins:{legend:{position:'top',align:'start',labels:{filter:(item,data)=>data.datasets[item.datasetIndex].kind==='observed',usePointStyle:true,boxWidth:8,font:{family:'Prompt, sans-serif',size:11}},onClick(e,item,legend){
          const ds=legend.chart.data.datasets[item.datasetIndex],visible=!legend.chart.isDatasetVisible(item.datasetIndex);
          legend.chart.data.datasets.forEach((d,i)=>{if(d.group===ds.group)legend.chart.setDatasetVisibility(i,visible&&(!d.isBand||showBands));});legend.chart.update();
        }},filler:{propagate:false},tooltip:{filter:ctx=>!ctx.dataset.isBand&&!(ctx.dataset.kind==='prediction'&&ctx.dataset.records[ctx.dataIndex].kind!=='forecast'),callbacks:{
          label(ctx){const m=metrics[ctx.dataset.metric];return `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)} ${m.unit}`;},
          afterLabel(ctx){const r=ctx.dataset.records?.[ctx.dataIndex],m=metrics[ctx.dataset.metric];return r?.kind==='forecast'?[`ขอบเขตจำลอง ${r.lower.toFixed(1)}–${r.upper.toFixed(1)} ${m.unit}`,levelText[LhsForecast.alertLevel(r,LhsForecast.thresholds[ctx.dataset.metric])]]:[];}
        }}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:11,maxRotation:40,color:'#7b8193',font:{size:11}}},
          y:{type:'linear',position:'left',min:0,suggestedMax:200,title:{display:true,text:'PM2.5 (µg/m³)',color:metrics.pm25.color,font:{weight:'600'}},ticks:{color:metrics.pm25.color},grid:{color:'#f0f0f5'}},
          y1:{type:'linear',position:'right',suggestedMin:20,suggestedMax:45,title:{display:true,text:'อุณหภูมิ (°C)',color:metrics.temp.color,font:{weight:'600'}},ticks:{color:metrics.temp.color},grid:{drawOnChartArea:false}},
        }},
    });
  }
  function defaults(){
    if(rangePreset==='custom'&&$('start-date').value&&$('end-date').value)return;
    const p=period(rangePreset);$('start-date').value=p.start;$('end-date').value=p.end;
  }
  function resetComparison(){const fields=$('forecast-comparison-fields'),button=$('forecast-compare-toggle');if(fields)fields.hidden=true;if(button){button.setAttribute('aria-expanded','false');button.textContent='เพิ่มพื้นที่เปรียบเทียบ';}if($('location-select'))$('location-select').value='';}
  function datasets(records,key,siteLabel,color,group){
    const m=metrics[key],threshold=LhsForecast.thresholds[key],common={metric:key,yAxisID:m.axis,group,records,tension:0,spanGaps:false};
    const label=siteLabel?`${siteLabel} · ${m.label}`:`${m.label} (${m.side})`;
    return [
      {...common,label,kind:'observed',data:records.map(r=>r.kind==='observed'?r.mean:null),borderColor:color,backgroundColor:color,borderWidth:2,pointStyle:m.shape,pointRadius:0,pointHoverRadius:4,order:0},
      {...common,label,kind:'prediction',data:records.map((r,i)=>r.kind==='forecast'||(r.kind==='observed'&&records[i+1]?.kind==='forecast')?r.mean:null),borderColor:color,backgroundColor:color,borderDash:[6,4],borderWidth:2.5,pointStyle:m.shape,pointRadius:ctx=>records[ctx.dataIndex]?.kind==='forecast'?4:0,pointBackgroundColor:ctx=>records[ctx.dataIndex]?.mean>=threshold?'#b5434e':color,order:0},
      {...common,label:`${label} · ขอบเขตล่าง`,kind:'band',isBand:true,data:records.map(r=>r.kind==='forecast'?r.lower:null),borderColor:color+'55',backgroundColor:'transparent',borderWidth:1,pointRadius:0,fill:false,hidden:!showBands,order:1},
      {...common,label:`${label} · ขอบเขตบน`,kind:'band',isBand:true,data:records.map(r=>r.kind==='forecast'?r.upper:null),borderColor:color+'55',backgroundColor:color+'1b',borderWidth:1,pointRadius:0,fill:'-1',hidden:!showBands,order:1},
    ];
  }
  function summaryCard(key,rows){
    const m=metrics[key],threshold=LhsForecast.thresholds[key],s=LhsForecast.summarize(rows,threshold);
    const label=s.level==='exceed'?'ค่าคาดการณ์ถึงเกณฑ์':s.level==='watch'?'เฝ้าระวังขอบเขตบน':s.level==='missing'?'ข้อมูลยังไม่ครบ':'ยังไม่พบค่าถึงเกณฑ์';
    const peak=s.peak?`${s.peak.mean.toFixed(1)} ${m.unit} (${dateText(s.peak.date)})`:'ยังไม่มีข้อมูล';
    return `<article class="fc-alert-card fc-${s.level}" data-summary="${key}"><div class="fc-card-top"><h4>${m.label} <small>≥ ${threshold} ${m.unit}</small></h4><span class="fc-status">${symbol[s.level]} ${label}</span></div><div class="fc-count"><strong>${s.exceeded.length}</strong><span>วัน ที่ค่าคาดการณ์ถึง/เกินเกณฑ์</span></div><p class="fc-first">${s.firstExceed?'เริ่ม '+dateText(s.firstExceed.date):s.complete?'ค่าคาดการณ์ยังไม่ถึงเกณฑ์':'มีข้อมูล '+s.readyDays+' จาก 7 วัน'}<br>ค่าคาดการณ์สูงสุด <b>${peak}</b></p><div class="fc-upper-note">△ เฉพาะขอบเขตบนถึงเกณฑ์ <strong>${s.upperOnly.length} วัน</strong>${s.upperOnly.length?' · '+s.upperOnly.map(r=>dateText(r.date)).join(', '):''}</div></article>`;
  }
  function alertValue(row,key){const m=metrics[key],level=LhsForecast.alertLevel(row,LhsForecast.thresholds[key]);return `<div class="fc-day-value fc-${level}" title="${levelText[level]}${row.mean!=null?'; ขอบเขต '+row.lower+'–'+row.upper+' '+m.unit:''}"><span class="fc-day-metric">${key==='pm25'?'PM2.5':'°C'}</span><strong>${row.mean==null?'—':row.mean.toFixed(1)}</strong><span aria-label="${levelText[level]}">${symbol[level]}</span></div>`;}
  function renderDecision(site,pm,temp){
    const ps=LhsForecast.summarize(pm,LhsForecast.thresholds.pm25),ts=LhsForecast.summarize(temp,LhsForecast.thresholds.temp),allDates=new Set([...ps.exceeded,...ts.exceeded].map(r=>r.date));
    const headline=allDates.size?`อย่างน้อย 1 ตัวแปรถึงเกณฑ์ใน ${allDates.size} วัน`:ps.level==='watch'||ts.level==='watch'?'ค่าคาดการณ์ยังไม่ถึงเกณฑ์ แต่ควรเฝ้าระวังขอบเขตบน':ps.complete&&ts.complete?'ยังไม่พบค่าถึงเกณฑ์ที่กำหนดใน 7 วัน':'ข้อมูลพยากรณ์ 7 วันยังไม่ครบ';
    $('forecast-alert-board').innerHTML=`<div class="fc-board-head"><div><span class="fc-eyebrow">ดูเร็ว · 7 วันข้างหน้า</span><h3 id="forecast-alert-title">${headline}</h3><p>${esc(site.name)} · ${dateText(LhsForecast.day(forecastConfig.issueDate,1))} – ${dateText(LhsForecast.day(forecastConfig.issueDate,7))}</p></div><span class="workspace-demo">ข้อมูลพยากรณ์จำลอง</span></div><div class="fc-alert-cards">${summaryCard('pm25',pm)}${summaryCard('temp',temp)}</div><div class="fc-week-wrap" tabindex="0" aria-label="ตารางรายวันพยากรณ์ 7 วัน เลื่อนดูวันเพิ่มเติมได้"><div class="fc-week" role="list">${pm.map((p,i)=>`<div class="fc-day" role="listitem"><div class="fc-day-date">${weekday(p.date)} <strong>${dateText(p.date)}</strong></div>${alertValue(p,'pm25')}${alertValue(temp[i],'temp')}</div>`).join('')}</div></div><div class="fc-board-bottom"><div><span><b class="fc-legend-exceed">!</b> ค่าคาดการณ์ถึงเกณฑ์</span><span><b class="fc-legend-watch">△</b> เฉพาะขอบเขตบนถึงเกณฑ์</span><small>สรุปนี้อ้างอิง 7 วันหลังรอบข้อมูลล่าสุด ไม่เปลี่ยนตามช่วงย้อนหลังของกราฟ</small></div><button id="forecast-focus-week" type="button" class="entry-btn entry-btn-small">ขยายกราฟ 7 วันข้างหน้า</button></div>`;
    $('forecast-focus-week').onclick=()=>{applyPeriod('forecast');$('forecast-toolbar').scrollIntoView({behavior:'smooth',block:'center'});};
  }
  function render(){
    if(!envChart)return;
    const site=getCurrentSite(),start=$('start-date').value,end=$('end-date').value,pm=LhsForecast.series(forecastConfig,'pm25',start,end,offsetFor(site,'pm25')),temp=LhsForecast.series(forecastConfig,'temp',start,end,offsetFor(site,'temp'));
    const first=LhsForecast.day(forecastConfig.issueDate,1),last=LhsForecast.day(forecastConfig.issueDate,7);
    const futurePM=LhsForecast.series(forecastConfig,'pm25',first,last,offsetFor(site,'pm25')),futureTemp=LhsForecast.series(forecastConfig,'temp',first,last,offsetFor(site,'temp'));
    const data=[...datasets(pm,'pm25','',metrics.pm25.color,'primary-pm25'),...datasets(temp,'temp','',metrics.temp.color,'primary-temp')];
    const comp=comparisonLocationsDb[$('location-select')?.value];
    if(comp)for(const key of ['pm25','temp']){const delta=key==='pm25'?comp.pmOffset*.4:comp.tempOffset*.6;data.push(...datasets(LhsForecast.series(forecastConfig,key,start,end,offsetFor(site,key)+delta),key,comp.name,key==='pm25'?'#9865bc':'#298e87',`comparison-${key}`));}
    envChart.forecastStartIndex=pm.findIndex(r=>r.kind==='forecast');envChart.data.labels=pm.map(r=>dateText(r.date));envChart.data.datasets=data;envChart.update();
    rangePreset=['30','forecast'].find(p=>{const r=period(p);return r.start===start&&r.end===end;}) || 'custom';
    const observed=pm.filter(r=>r.kind==='observed').length,forecast=pm.filter(r=>r.kind==='forecast').length,missing=pm.filter(r=>r.kind==='missing').length;
    $('forecast-plot-caption').innerHTML=`<span>กราฟนี้: ย้อนหลัง <b>${observed} วัน</b> + พยากรณ์ <b>${forecast} วัน</b>${missing?' · ไม่มีข้อมูล '+missing+' วัน':''}</span><span><i style="background:${metrics.pm25.color}"></i>PM2.5 แกนซ้าย <i style="background:${metrics.temp.color}"></i>อุณหภูมิแกนขวา</span>`;
    const error=$('forecast-range-error');error.hidden=pm.length>0&&pm.some(r=>r.kind!=='missing');
    error.textContent=start>end?'วันที่เริ่มต้นอยู่หลังวันที่สิ้นสุด กรุณาปรับช่วงวันที่':(Date.parse(end)-Date.parse(start))/86400000>=400?'ช่วงวันที่ยาวเกิน 400 วัน กรุณาเลือกช่วงที่สั้นลง':'ช่วงวันที่นี้ไม่มีข้อมูลจำลอง กรุณาเลือกช่วงภายใน 180 วันย้อนหลังถึง 7 วันข้างหน้าของรอบข้อมูล';
    renderDecision(site,futurePM,futureTemp);

  }
  globalThis.LhsForecastView=Object.freeze({init,render,defaults,resetComparison});
})();
