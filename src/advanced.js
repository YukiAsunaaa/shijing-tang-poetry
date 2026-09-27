import * as d3 from 'd3';

const fmt = n => n.toLocaleString('zh-CN');
const clusterColors = ['#a94737','#3f716b','#806286','#a38c41','#526b84','#627a52'];
const emotionColors = {喜悦:'#b54c38',哀愁:'#587187',思念:'#9a7640',孤寂:'#66726f',旷达:'#547663',壮志:'#9b4035'};

export async function initAdvancedAnalysis({icons,createIcons,notify,reduced,paused}) {
  const $ = selector => document.querySelector(selector);
  let data, selectedPoet, selectedEmotion, selectedCluster = null, clusterSvg, lastView = 'imagery';

  function transitionPanel(panel) {
    if (reduced.matches || paused()) return;
    panel.animate([
      {opacity:.35,transform:'translateY(10px)',filter:'blur(2px)'},
      {opacity:1,transform:'translateY(0)',filter:'blur(0)'}
    ],{duration:480,easing:'cubic-bezier(.16,1,.3,1)'});
  }

  function setView(view, updateHash=true) {
    if (!['imagery','emotion','cluster'].includes(view)) view='imagery';
    document.querySelectorAll('[data-view-panel]').forEach(panel=>panel.hidden=panel.dataset.viewPanel!==view);
    document.querySelectorAll('[data-view]').forEach(tab=>{
      const active=tab.dataset.view===view;
      tab.setAttribute('aria-selected',active);
      tab.tabIndex=active?0:-1;
    });
    const panel=$(`[data-view-panel="${view}"]`);
    transitionPanel(panel);
    if(updateHash){
      const hash=view==='imagery'?(document.querySelector('[data-category][aria-pressed="true"]')?.dataset.category||'seasons'):view;
      history.replaceState(null,'',`#${hash}`);
    }
    if(view==='emotion'&&data&&!selectedPoet) selectPoet(data.sentiment[0].author);
    if(view==='cluster'&&data){renderCluster(); if(!$('#cluster-poet').dataset.selected) selectClusterPoet(data.poets[0]);}
    lastView=view;
  }

  document.querySelectorAll('[data-view]').forEach(tab=>{
    tab.addEventListener('click',()=>setView(tab.dataset.view));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();const tabs=[...document.querySelectorAll('[data-view]')];const index=tabs.indexOf(tab);const next=tabs[(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];next.focus();next.click();
    });
  });

  const imageryHashes=new Set(['seasons','plants','landscape','sky','colors','imagery','']);
  function syncHash(){const hash=location.hash.slice(1);setView(imageryHashes.has(hash)?'imagery':hash,false);}
  window.addEventListener('hashchange',syncHash);

  try {
    const response=await fetch(`${import.meta.env.BASE_URL}data/analysis.json`);
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    data=await response.json();
    $('#emotion-method').textContent=data.meta.sentimentMethod;
    $('#cluster-method').textContent=`${data.meta.clusterMethod} 本次纳入 ${fmt(data.meta.authors)} 位诗人，每位至少 ${data.meta.minimumPoems} 条篇目。为减轻极端投影值挤压主体分布，画面坐标按各轴第 2 至第 98 百分位裁切，仅影响显示。`;
    renderPoetList('');
    renderLegend();
    syncHash();
  } catch(error) {
    for(const panel of [$('#emotion-view'),$('#cluster-view')]) panel.querySelector('.research-grid,.cluster-layout').innerHTML='<div class="error-state" role="alert">附加分析暂未载入，请刷新页面重试。</div>';
    console.error('Advanced analysis load failed',error);
  }

  function renderPoetList(query) {
    const normalized=query.trim();
    const matches=data.sentiment.filter(poet=>!normalized||poet.author.includes(normalized));
    const list=$('#poet-list');list.replaceChildren();
    (matches.length?matches:[]).forEach(poet=>{
      const button=document.createElement('button');button.type='button';button.setAttribute('role','option');button.dataset.poet=poet.author;button.setAttribute('aria-selected',poet.author===selectedPoet);
      button.innerHTML=`<span>${poet.author}</span><small>${fmt(poet.poems)} 篇 · ${poet.dominant}</small>`;
      button.addEventListener('click',()=>selectPoet(poet.author));list.append(button);
    });
    if(!matches.length){const empty=document.createElement('p');empty.className='empty-state';empty.textContent='没有找到这位诗人，请换一个名字。';list.append(empty);}
  }

  $('#poet-search').addEventListener('input',event=>renderPoetList(event.target.value));
  $('#poet-search').addEventListener('keydown',event=>{if(event.key==='Enter'){const first=$('#poet-list button');if(first){event.preventDefault();first.click();}}});

  function animateLocal(element,keyframes,options={}) {
    if (!element || reduced.matches || paused()) return;
    element.getAnimations().forEach(animation=>animation.cancel());
    element.animate(keyframes,{duration:options.duration||520,easing:'cubic-bezier(.16,1,.3,1)',fill:'both',...options});
  }

  function selectPoet(name) {
    const poet=data.sentiment.find(row=>row.author===name);if(!poet)return;
    const changed=selectedPoet&&selectedPoet!==name;
    selectedPoet=name;selectedEmotion=poet.dominant;
    document.querySelectorAll('#poet-list button').forEach(button=>button.setAttribute('aria-selected',button.dataset.poet===name));
    $('#emotion-poet').textContent=poet.author;
    $('#emotion-sample').textContent=`${fmt(poet.poems)} 条篇目 · ${fmt(poet.characters)} 字 · 主要倾向：${poet.dominant}`;
    $('.emotion-stage').style.setProperty('--emotion-accent',emotionColors[poet.dominant]);
    if(changed){
      animateLocal($('#emotion-poet'),[{opacity:.18,filter:'blur(5px)',transform:'translateY(12px)',clipPath:'inset(0 0 85% 0)'},{opacity:1,filter:'blur(0)',transform:'translateY(0)',clipPath:'inset(0 0 0 0)'}],{duration:560});
      animateLocal($('#emotion-sample'),[{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:440,delay:70});
    }
    renderEmotionRadar(poet);renderEmotionRanks(poet);renderEmotionEvidence(poet,selectedEmotion);
  }

  function renderEmotionRadar(poet) {
    const host=$('#emotion-radar'), size=Math.min(Math.max(host.clientWidth,280),390), center=size/2, radius=size*.31;
    const caps=Object.fromEntries(data.emotions.map(emotion=>[emotion,d3.quantile(data.sentiment.map(p=>p.scores[emotion]).sort(d3.ascending),.95)||1]));
    const angle=i=>-Math.PI/2+i*Math.PI*2/data.emotions.length;
    const points=data.emotions.map((emotion,i)=>{const r=Math.min(poet.scores[emotion]/caps[emotion],1)*radius;return [center+Math.cos(angle(i))*r,center+Math.sin(angle(i))*r];});
    const svg=d3.select(host).selectAll('svg').data([null]).join('svg').attr('viewBox',`0 0 ${size} ${size}`).attr('role','img').attr('aria-label',`${poet.author}六类情感表达轮廓`);
    const rings=svg.selectAll('.radar-ring').data([.25,.5,.75,1]);rings.join('circle').attr('class','radar-ring').attr('cx',center).attr('cy',center).attr('r',d=>radius*d);
    const axes=svg.selectAll('.radar-axis').data(data.emotions);axes.join('line').attr('class','radar-axis').attr('x1',center).attr('y1',center).attr('x2',(d,i)=>center+Math.cos(angle(i))*radius).attr('y2',(d,i)=>center+Math.sin(angle(i))*radius);
    const polygon=svg.selectAll('.radar-shape').data([points]);polygon.join('path').attr('class','radar-shape').interrupt().transition().duration(reduced.matches||paused()?0:680).ease(d3.easeCubicOut).attr('d',d3.line().curve(d3.curveCardinalClosed.tension(.55)));
    const nodes=svg.selectAll('.radar-node').data(data.emotions,d=>d);const enter=nodes.enter().append('g').attr('class','radar-node').attr('role','button').attr('tabindex',0);
    enter.append('circle').attr('r',5);enter.append('text').attr('text-anchor','middle').attr('dominant-baseline','middle');
    const merged=enter.merge(nodes).classed('selected',d=>d===selectedEmotion).attr('aria-label',d=>`${d}：每万字 ${poet.scores[d]} 次`).on('click',emotion=>{selectedEmotion=emotion;renderEmotionEvidence(poet,emotion);renderEmotionRanks(poet);renderEmotionRadar(poet);}).on('keydown',emotion=>{if(['Enter',' '].includes(d3.event.key)){d3.event.preventDefault();selectedEmotion=emotion;renderEmotionEvidence(poet,emotion);renderEmotionRanks(poet);renderEmotionRadar(poet);}});
    merged.interrupt().transition().duration(reduced.matches||paused()?0:680).ease(d3.easeCubicOut).attr('transform',(d,i)=>`translate(${points[i][0]},${points[i][1]})`);
    merged.select('text').attr('x',(d,i)=>Math.cos(angle(i))*35).attr('y',(d,i)=>Math.sin(angle(i))*27).text(d=>d);
    nodes.exit().remove();
  }

  function renderEmotionRanks(poet) {
    const max=d3.max(data.emotions.map(e=>poet.scores[e]))||1;
    const values=data.emotions.map(emotion=>({emotion,value:poet.scores[emotion]}));
    const rows=d3.select('#emotion-ranks').selectAll('.emotion-rank').data(values,d=>d.emotion);
    const enter=rows.enter().append('button').attr('type','button').attr('class','emotion-rank').style('opacity',0).on('click',item=>{const current=data.sentiment.find(row=>row.author===selectedPoet);selectedEmotion=item.emotion;renderEmotionEvidence(current,item.emotion);renderEmotionRanks(current);renderEmotionRadar(current);});
    enter.append('span').attr('class','rank-label');enter.append('span').attr('class','rank-track').append('i').style('width','0%');enter.append('strong').text('0.0');
    const all=enter.merge(rows).attr('aria-pressed',item=>item.emotion===selectedEmotion);
    all.select('.rank-label').text(item=>item.emotion);
    all.interrupt().transition().duration(reduced.matches||paused()?0:360).delay((d,i)=>reduced.matches||paused()?0:i*24).style('opacity',1);
    all.select('.rank-track i').interrupt().transition().duration(reduced.matches||paused()?0:620).delay((d,i)=>reduced.matches||paused()?0:i*34).ease(d3.easeCubicOut).style('width',item=>`${item.value/max*100}%`);
    all.select('strong').interrupt().transition().duration(reduced.matches||paused()?0:560).delay((d,i)=>reduced.matches||paused()?0:i*30).tween('text',function(item){const start=Number(this.textContent)||0;const interpolate=d3.interpolateNumber(start,item.value);return t=>this.textContent=interpolate(t).toFixed(1);});
    rows.exit().remove();
  }

  function renderEmotionEvidence(poet,emotion) {
    const evidence=poet.evidence[emotion];$('#emotion-name').textContent=emotion;$('#emotion-score').textContent=`每万字 ${poet.scores[emotion].toFixed(1)} 次`;
    $('#emotion-terms').replaceChildren(...evidence.terms.map(item=>{const span=document.createElement('span');span.textContent=`${item.term} ${item.count}`;return span;}));
    $('#emotion-quote').textContent=`“${evidence.poem.excerpt}”\n${poet.author}《${evidence.poem.title}》`;
    animateLocal($('.emotion-evidence'),[{opacity:.28,filter:'blur(3px)',clipPath:'inset(0 0 55% 0)'},{opacity:1,filter:'blur(0)',clipPath:'inset(0 0 0 0)'}],{duration:480,delay:80});
    document.querySelectorAll('#emotion-terms span').forEach((term,index)=>animateLocal(term,[{opacity:0,transform:'translateX(-7px)'},{opacity:1,transform:'translateX(0)'}],{duration:340,delay:120+index*35}));
  }

  $('#emotion-download').addEventListener('click',()=>{
    const csv='\ufeff诗人,篇目数,正文汉字数,'+data.emotions.join(',')+'\r\n'+data.sentiment.map(p=>[p.author,p.poems,p.characters,...data.emotions.map(e=>p.scores[e])].join(',')).join('\r\n');download(csv,'诗境-诗人情感分析.csv');notify('已导出诗人情感数据');
  });

  function download(content,name){const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  function renderLegend(){
    const host=$('#cluster-legend');host.replaceChildren();
    data.clusters.forEach(cluster=>{const button=document.createElement('button');button.type='button';button.dataset.cluster=cluster.id;button.setAttribute('aria-pressed',selectedCluster===null||selectedCluster===cluster.id);button.innerHTML=`<i style="background:${clusterColors[cluster.id]}"></i><span>${cluster.label}</span><small>${cluster.size}</small>`;button.addEventListener('click',()=>{selectedCluster=selectedCluster===cluster.id?null:cluster.id;renderLegend();renderCluster();});host.append(button);});
  }

  function renderCluster(){
    const host=$('#cluster-chart');if(host.clientWidth<10)return;const width=host.clientWidth,height=window.innerWidth<700?450:540,pad=38;
    const x=d3.scaleLinear().domain(d3.extent(data.poets,d=>d.x)).nice().range([pad,width-pad]);const y=d3.scaleLinear().domain(d3.extent(data.poets,d=>d.y)).nice().range([height-pad,pad]);
    clusterSvg=d3.select(host).selectAll('svg').data([null]).join('svg').attr('viewBox',`0 0 ${width} ${height}`).attr('role','group').attr('aria-label',`${data.poets.length}位诗人的用词聚类图`);
    clusterSvg.selectAll('.cluster-guide').data([.25,.5,.75]).join('ellipse').attr('class','cluster-guide').attr('cx',width/2).attr('cy',height/2).attr('rx',d=>(width-pad*2)*d/2).attr('ry',d=>(height-pad*2)*d/2);
    const shown=selectedCluster===null?data.poets:data.poets.filter(p=>p.cluster===selectedCluster);
    const points=clusterSvg.selectAll('.poet-point').data(shown,d=>d.author);points.exit().transition().duration(220).style('opacity',0).remove();
    const enter=points.enter().append('g').attr('class','poet-point').attr('role','button').attr('tabindex',0).style('opacity',0).on('click',selectClusterPoet).on('keydown',function(poet){if(['Enter',' '].includes(d3.event.key)){d3.event.preventDefault();selectClusterPoet(poet);}});
    enter.append('circle');enter.append('text').attr('class','poet-label').attr('y',-8);enter.append('title');
    const merged=enter.merge(points).classed('selected',p=>p.author===$('#cluster-poet').dataset.selected).attr('aria-label',p=>`${p.author}，${p.poems}条篇目，词群${p.clusterLabel}`);
    merged.select('circle').attr('r',p=>Math.max(3,Math.min(9,3+Math.sqrt(p.poems)/8))).attr('fill',p=>clusterColors[p.cluster]);
    merged.select('text').attr('x',p=>p.x>.7?-8:8).attr('text-anchor',p=>p.x>.7?'end':'start').text(p=>p.author===$('#cluster-poet').dataset.selected?p.author:'');merged.select('title').text(p=>`${p.author}\n${p.clusterLabel}\n${p.keywords.join(' · ')}`);
    merged.transition().duration(reduced.matches||paused()?0:650).ease(d3.easeCubicOut).style('opacity',1).attr('transform',p=>`translate(${x(p.x)},${y(p.y)})`);
  }

  function selectClusterPoet(poet){
    if(typeof poet==='string')poet=data.poets.find(p=>p.author===poet);if(!poet)return;
    $('#cluster-poet').textContent=poet.author;$('#cluster-poet').dataset.selected=poet.author;$('#cluster-meta').textContent=`${fmt(poet.poems)} 条篇目 · 聚类 ${poet.cluster+1}`;$('#cluster-group').textContent=poet.clusterLabel;$('#cluster-emotion').textContent=poet.dominantEmotion;
    $('#cluster-terms').replaceChildren(...poet.keywords.map(word=>{const span=document.createElement('span');span.textContent=word;return span;}));
    clusterSvg?.selectAll('.poet-point').classed('selected',p=>p.author===poet.author).select('.poet-label').text(p=>p.author===poet.author?p.author:'');
  }

  $('#cluster-search').addEventListener('input',event=>{const query=event.target.value.trim();if(!query)return;const match=data.poets.find(p=>p.author.includes(query));if(match){selectedCluster=null;renderLegend();renderCluster();selectClusterPoet(match);}});
  $('#cluster-search').addEventListener('keydown',event=>{if(event.key==='Enter'){const match=data.poets.find(p=>p.author.includes(event.target.value.trim()));if(match)selectClusterPoet(match);}});
  document.addEventListener('poetry:motionchange',event=>{if(!event.detail.paused||!data)return;d3.select('#emotion-view').selectAll('*').interrupt();d3.select('#cluster-view').selectAll('*').interrupt();if(selectedPoet){const poet=data.sentiment.find(row=>row.author===selectedPoet);renderEmotionRadar(poet);renderEmotionRanks(poet);renderEmotionEvidence(poet,selectedEmotion);}});
  let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(lastView==='cluster'&&data)renderCluster();if(lastView==='emotion'&&data&&selectedPoet)renderEmotionRadar(data.sentiment.find(p=>p.author===selectedPoet));},100);}).observe(document.querySelector('main'));
}
