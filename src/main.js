import * as d3 from 'd3';
import {createIcons, Pause, Play, Info, Download, ArrowUpRight, ArrowDownWideNarrow, ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Plus, Search} from 'lucide';
import {initAdvancedAnalysis} from './advanced.js';
import './style.css';

const icons = {Pause, Play, Info, Download, ArrowUpRight, ArrowDownWideNarrow, ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Plus, Search};
const $ = selector => document.querySelector(selector);
const fmt = n => n.toLocaleString('zh-CN');
const worlds = {
  seasons: {accent:'#627a52',verse:['春生夏长','秋收冬藏']},
  plants: {accent:'#925957',verse:['一枝一叶','自有深情']},
  landscape: {accent:'#3f716b',verse:['山川有灵','江海有声']},
  sky: {accent:'#526b84',verse:['云行雨落','日往月来']},
  colors: {accent:'#875145',verse:['诗有千色','墨藏万象']},
};
const colorMap = {白:'#73817c',青:'#507d79',红:'#ad514c',绿:'#56845e',紫:'#806286',碧:'#448e87',黄:'#a38c41',朱:'#b64a36',翠:'#4b866c',黑:'#3a4142'};
const landscapeFocus = {山:'peaks',峰:'peaks',泉:'falls',溪:'falls',水:'water',江:'water',海:'water',河:'water',川:'water',湖:'water'};
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let corpus, category, term, metric = 'count', order = 'desc', poemIndex = 0, paused = reduced.matches, expanded = false;
let svg, chartWidth = 0, toastTimer;
createIcons({icons});

function setIcon(button, name) {
  button.innerHTML = `<i data-lucide="${name}"></i>`;
  createIcons({icons});
}

function notify(text) {
  $('#toast').textContent = text;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2500);
}

function activeTerm() { return category.items.find(d => d.name === term); }
function duration() { return paused || reduced.matches ? 0 : 700; }

function transitionScene(id) {
  const next = document.querySelector(`[data-scene="${id}"]`);
  const current = document.querySelector('.scene-art.is-active');
  if (!next) return;
  current?.getAnimations().forEach(animation=>animation.cancel());
  if(current!==next) next.getAnimations().forEach(animation=>animation.cancel());
  if (current !== next) {
    current?.classList.remove('is-active');
    next.classList.add('is-active');
  }
}

function updateScene() {
  const world = $('.world');
  world.dataset.world = category.id;
  world.dataset.season = category.id === 'seasons' ? term : '';
  world.dataset.sky = category.id === 'sky' ? term : '';
  world.dataset.focus = category.id === 'landscape' ? landscapeFocus[term] : '';
  document.documentElement.style.setProperty('--accent', category.id === 'colors' ? colorMap[term] : worlds[category.id].accent);
  document.documentElement.style.setProperty('--scene-pigment', colorMap[term] || worlds[category.id].accent);
  world.style.setProperty('--color-paper', d3.interpolateRgb('#f5f5f0', colorMap[term] || '#f5f5f0')(.08));
  transitionScene(category.id);
  updateAtmosphere();
}

function selectCategory(id, updateHash = true) {
  category = corpus.categories.find(d => d.id === id) || corpus.categories[0];
  term = category.items[0].name;
  poemIndex = 0;
  expanded = false;
  $('#world-title').textContent = category.name;
  $('#world-verse').replaceChildren(...worlds[category.id].verse.flatMap((s,i) => i ? [document.createElement('br'),document.createTextNode(s)] : [document.createTextNode(s)]));
  $('#chart-title').textContent = `${category.name}入诗`;
  document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed', b.dataset.category === category.id));
  if (updateHash) history.replaceState(null, '', `#${category.id}`);
  renderChart();
  updateSelection();
}

function selectTerm(name) {
  if (term === name || !category.items.some(item => item.name === name)) return;
  term = name;
  poemIndex = 0;
  expanded = false;
  updateSelection();
}

function renderChart() {
  const data = [...category.items].sort((a,b) => order === 'desc' ? b[metric]-a[metric] : a[metric]-b[metric]);
  const box = $('#chart');
  const width = Math.max(240, box.clientWidth);
  const height = Math.max(305, data.length * 31 + 32);
  const left = 36, right = 60, top = 27, bottom = 7;
  box.style.height = `${height}px`;
  svg.attr('viewBox', `0 0 ${width} ${height}`).style('height',`${height}px`);
  const x = d3.scaleLinear().domain([0,d3.max(data,d=>d[metric])]).nice().range([0,width-left-right]);
  const y = d3.scaleBand().domain(data.map(d=>d.name)).range([top,height-bottom]).paddingInner(data.length > 8 ? .4 : .54).paddingOuter(.18);
  const t = svg.transition().duration(duration()).ease(d3.easeCubicInOut);
  svg.select('.axis').attr('transform',`translate(${left},${top-12})`).transition(t).call(d3.axisTop(x).ticks(width<430 ? 3 : 5).tickSize(-(height-top)).tickFormat(d3.format(',')));
  const rows = svg.select('.bars').selectAll('.bar-row').data(data,d=>d.name);
  rows.exit().attr('tabindex',-1).style('pointer-events','none').interrupt().transition().duration(duration()/3).style('opacity',0).remove();
  const enter = rows.enter().append('g').attr('class','bar-row').attr('role','button').attr('tabindex',0).attr('transform',d=>`translate(${left},${y(d.name)})`).style('opacity',0);
  enter.append('rect').attr('class','hit').attr('x',-left+1);
  enter.append('rect').attr('class','bar').attr('width',0);
  enter.append('text').attr('class','word').attr('x',-17).attr('text-anchor','middle').attr('dominant-baseline','middle');
  enter.append('text').attr('class','value').attr('x',8).attr('dominant-baseline','middle');
  const all = enter.merge(rows);
  all.interrupt().attr('tabindex',0).style('pointer-events',null).attr('aria-label',d=>`${d.name}：${fmt(d[metric])}${metric==='count'?'次':'篇目'}，阅读相关诗句`).attr('aria-pressed',d=>d.name===term).classed('selected',d=>d.name===term)
    .on('click',d=>selectTerm(d.name)).on('keydown',function(d){if(['Enter',' '].includes(d3.event.key)){d3.event.preventDefault();selectTerm(d.name);}});
  all.transition(t).style('opacity',1).attr('transform',d=>`translate(${left},${y(d.name)})`);
  const barHeight = Math.min(26,y.bandwidth());
  all.select('.hit').attr('y',-4).attr('width',width-2).attr('height',Math.max(24,y.step()-1));
  all.select('.bar').interrupt().transition(t).attr('height',barHeight).attr('width',d=>x(d[metric])).attr('fill',d=>category.id==='colors'?colorMap[d.name]:null);
  if(category.id==='colors') all.select('.bar').style('fill',d=>d.name===term?'var(--red)':colorMap[d.name]);
  else all.select('.bar').style('fill',null);
  all.select('.word').attr('y',barHeight/2).text(d=>d.name);
  all.select('.value').attr('y',barHeight/2).interrupt().transition(t).attr('x',d=>x(d[metric])+10).tween('text',function(d){const start=+(this.textContent||'0').replaceAll(',','');const interpolate=d3.interpolateNumber(start,d[metric]);return t=>this.textContent=fmt(Math.round(interpolate(t)));});
  $('#chart-summary').textContent = `${data.length} 种意象 · ${metric==='count'?'出现次数':'涉及篇目'}`;
}

function highlighted(target, text) {
  target.replaceChildren();
  const parts = text.split(term);
  parts.forEach((part,i) => {if(i){const mark=document.createElement('mark');mark.textContent=term;target.append(mark);}target.append(document.createTextNode(part));});
}

function updateSelection() {
  const data = activeTerm();
  svg.selectAll('.bar-row').classed('selected',d=>d.name===term).attr('aria-pressed',d=>d.name===term);
  if(category.id==='colors') svg.selectAll('.bar').style('fill',d=>d.name===term?'var(--red)':colorMap[d.name]);
  $('#selected-glyph').textContent = term;
  $('#insight-text').innerHTML = `在 <strong>${fmt(data.poems)}</strong> 条篇目中，<br>「${term}」共出现 <strong>${fmt(data.count)}</strong> 次。`;
  $('#poetry-heading').textContent = `诗中寻${term}`;
  updateScene();
  renderPoem();
}

function renderPoem() {
  const examples = activeTerm().examples;
  const poem = corpus.poems[examples[poemIndex]];
  $('#poem-counter').textContent = `${String(poemIndex+1).padStart(2,'0')} / ${examples.length} 篇选读`;
  $('#prev-poem').disabled = examples.length < 2;
  $('#next-poem').disabled = examples.length < 2;
  const sentences = poem.body.replaceAll('\n','').match(/[^。！？]+[。！？]?/g) || [poem.body];
  const sentence = sentences.find(line=>line.includes(term)) || poem.body;
  highlighted($('#quote'), sentence.length > 70 ? sentence.slice(Math.max(0,sentence.indexOf(term)-20),sentence.indexOf(term)+40) + '…' : sentence);
  $('#poem-source').textContent = `${poem.author} ·《${poem.title}》`;
  $('#full-title').textContent = poem.title;
  highlighted($('#full-body'),poem.body);
  $('#source-id').textContent = `原文索引：卷 ${poem.id.split('_')[0]} · 第 ${poem.id.split('_')[1]} 条`;
  $('#poem-full').hidden = !expanded;
  $('#expand-poem').setAttribute('aria-expanded',expanded);
  $('#expand-poem').innerHTML = `${expanded?'收起全诗':'读全诗'} <i data-lucide="${expanded?'arrow-up':'arrow-down'}"></i>`;
  createIcons({icons});
  if(duration()) $('.poem').animate([{opacity:.45,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:430,easing:'ease-out'});
}

$('#categories').addEventListener('click',e=>{const button=e.target.closest('[data-category]');if(button&&corpus)selectCategory(button.dataset.category);});
document.querySelectorAll('[data-metric]').forEach(button=>button.addEventListener('click',()=>{if(!corpus)return;metric=button.dataset.metric;document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',b===button));renderChart();}));
$('#sort').addEventListener('change',e=>{order=e.target.value;if(corpus)renderChart();});
$('#next-poem').addEventListener('click',()=>{if(!corpus)return;poemIndex=(poemIndex+1)%activeTerm().examples.length;renderPoem();});
$('#prev-poem').addEventListener('click',()=>{if(!corpus)return;poemIndex=(poemIndex+activeTerm().examples.length-1)%activeTerm().examples.length;renderPoem();});
$('#expand-poem').addEventListener('click',()=>{if(!corpus)return;expanded=!expanded;renderPoem();});
$('#download').addEventListener('click',()=>{
  if(!corpus)return;
  const rows=[...category.items].sort((a,b)=>order==='desc'?b[metric]-a[metric]:a[metric]-b[metric]);
  const csv='\ufeff意象,出现次数,涉及篇目\r\n'+rows.map(d=>`${d.name},${d.count},${d.poems}`).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`诗境-${category.name}-词频.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已导出当前分类数据');
});

const canvas = $('#atmosphere'), ctx=canvas.getContext('2d');
let cw=1,ch=1,frame=0,lastTime=0,time=0,scenePulse=0;
const particles=Array.from({length:28},(_,i)=>({x:((i*73+19)%101)/101,y:((i*41+7)%97)/97,s:2+i%4,v:.2+(i%7)/15}));
function resizeCanvas(){const rect=$('.world').getBoundingClientRect();cw=rect.width;ch=rect.height;const ratio=Math.min(devicePixelRatio,2);canvas.width=cw*ratio;canvas.height=ch*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);}
function drawAtmosphere(dt){
  time+=dt;scenePulse=Math.max(0,scenePulse-dt*1.4);ctx.clearRect(0,0,cw,ch);if(!category)return;
  const id=category.id, snow=(id==='seasons'&&term==='冬')||(id==='sky'&&['雪','霜'].includes(term));
  const rain=id==='sky'&&term==='雨', petals=id==='plants'||(id==='seasons'&&['春','秋'].includes(term));
  if(snow||rain||petals){
    particles.forEach((p,i)=>{const spread=id==='sky'?cw:cw*.45;const x=(p.x*spread+Math.sin(time*.3+i)*24+cw)%cw;const y=(p.y*ch+time*(rain?95:14)*p.v)%ch;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.6+i));ctx.fillStyle=snow?'rgba(255,255,255,.85)':term==='秋'?'rgba(154,100,43,.32)':'rgba(157,88,88,.26)';ctx.strokeStyle='rgba(65,94,119,.3)';ctx.lineWidth=1;
      if(rain){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-4,15);ctx.stroke();}else{ctx.beginPath();ctx.ellipse(0,0,p.s,snow?p.s:p.s*.42,0,0,Math.PI*2);ctx.fill();}ctx.restore();});
  }else if(id==='landscape'||id==='seasons'){
    const peaks=id==='landscape'&&landscapeFocus[term]==='peaks';
    if(peaks){ctx.save();ctx.filter='blur(14px)';for(let i=0;i<4;i++){const drift=(time*(10+i*2)+i*cw*.23)%cw;ctx.fillStyle=`rgba(247,247,241,${.055+scenePulse*.03})`;ctx.beginPath();ctx.ellipse(drift,ch*(.34+i*.1),150+i*32,15+i*3,-.12,0,Math.PI*2);ctx.fill();}ctx.restore();}
    else for(let i=0;i<9;i++){const progress=(time*.13+i/9)%1;ctx.strokeStyle=`rgba(47,91,82,${(1-progress)*(.13+scenePulse*.09)})`;ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(cw*(.08+i*.08),ch*(.84+(i%3)*.03),15+progress*85,1+progress*7,0,0,Math.PI*2);ctx.stroke();}
  }else if(id==='sky'){
    if(term==='星'){ctx.fillStyle='rgba(246,239,205,.72)';particles.slice(0,18).forEach((p,i)=>{ctx.globalAlpha=.35+.35*Math.sin(time*1.6+i);ctx.beginPath();ctx.arc(cw*(.42+p.x*.55),ch*(.08+p.y*.46),1+p.s*.18,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;}
    else{ctx.fillStyle=`rgba(255,255,255,${.13+scenePulse*.12})`;for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse((cw*.12+i*190+time*(term==='风'?24:7))%(cw*1.25)-cw*.12,ch*(.2+i*.09),150+i*18,13+i*2,-.08,0,Math.PI*2);ctx.fill();}}
  }else if(id==='colors'){
    const rgb=d3.color(colorMap[term]);ctx.save();ctx.lineCap='round';ctx.filter='blur(8px)';for(let i=0;i<5;i++){const progress=(time*.055+i/5)%1,fromRight=i%2===1,start=fromRight?cw+80:-80,end=fromRight?cw*.62:cw*.38;ctx.strokeStyle=`rgba(${rgb.r},${rgb.g},${rgb.b},${(1-progress)*(.12+scenePulse*.14)})`;ctx.lineWidth=(28+scenePulse*18)*(1-progress);ctx.beginPath();ctx.moveTo(start,ch*(.28+i*.13));ctx.bezierCurveTo(fromRight?cw*.88:cw*.12,ch*(.18+i*.15),fromRight?cw*.76:cw*.24,ch*(.5+i*.08),end,ch*(.42+i*.1));ctx.stroke();}ctx.restore();
  }
}
function tick(now){if(paused||reduced.matches||document.hidden){frame=0;return;}const dt=lastTime?Math.min((now-lastTime)/1000,.05):.016;lastTime=now;drawAtmosphere(dt);frame=requestAnimationFrame(tick);}
function updateAtmosphere(){cancelAnimationFrame(frame);frame=0;scenePulse=1;resizeCanvas();drawAtmosphere(0);if(!paused&&!reduced.matches&&!document.hidden){lastTime=0;frame=requestAnimationFrame(tick);}}
function syncMotion(){document.body.classList.toggle('motion-paused',paused||reduced.matches);if(paused||reduced.matches)document.getAnimations().forEach(animation=>{try{animation.finish();}catch{animation.cancel();}});$('#motion').setAttribute('aria-pressed',paused);$('#motion').setAttribute('aria-label',paused?'播放动态':'暂停动态');$('#motion').title=paused?'播放动态':'暂停动态';setIcon($('#motion'),paused?'play':'pause');updateAtmosphere();if(corpus)renderChart();document.dispatchEvent(new CustomEvent('poetry:motionchange',{detail:{paused:paused||reduced.matches}}));}
$('#motion').addEventListener('click',()=>{paused=!paused;syncMotion();});
reduced.addEventListener('change',()=>{paused=reduced.matches;syncMotion();});
document.addEventListener('visibilitychange',()=>updateAtmosphere());
let resizeTimer;
new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{resizeCanvas();if(corpus&&Math.abs($('#chart').clientWidth-chartWidth)>1){chartWidth=$('#chart').clientWidth;renderChart();}drawAtmosphere(0);},70);}).observe($('.world'));
window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(corpus&&worlds[id])selectCategory(id,false);});

async function load(){
  try{
    const response=await fetch(`${import.meta.env.BASE_URL}data/poetry.json`);
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    corpus=await response.json();
    $('#chart').replaceChildren();
    svg=d3.select('#chart').append('svg').attr('role','group').attr('aria-label','意象频次柱状图');
    svg.append('g').attr('class','axis').attr('aria-hidden','true');svg.append('g').attr('class','bars');
  $('#corpus-stats').textContent=`本次整理 ${fmt(corpus.meta.records)} 条有效篇目记录，正文共 ${fmt(corpus.meta.characters)} 个汉字。排除 ${corpus.meta.headerCount-corpus.meta.records} 条无有效正文的记录。`;
    $('#method-text').textContent=corpus.meta.method;
    selectCategory(location.hash.slice(1),false);syncMotion();
  }catch(error){
    $('#chart').innerHTML='<div class="error-state" role="alert">诗卷暂未载入，请检查网络。<button id="retry">重新载入</button></div>';
    $('#retry').addEventListener('click',()=>{ $('#chart').innerHTML='<p class="loading" role="status">正在展开诗卷…</p>';load(); });
    console.error('Poetry load failed',error);
  }
}
load();
initAdvancedAnalysis({icons, createIcons, notify, reduced, paused:()=>paused});
