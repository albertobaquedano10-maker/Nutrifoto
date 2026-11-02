import { foods, foodById, meals } from './foods.js';

const STORE = 'nutrifoto_v1';
const $ = id => document.getElementById(id);
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const dateFromKey = key => new Date(`${key}T12:00:00`);
const toKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const addDays = (key, n) => {const d=dateFromKey(key);d.setDate(d.getDate()+n);return toKey(d)};
const fmt = (value, digits=0) => Number(value||0).toLocaleString('es-ES',{maximumFractionDigits:digits});
const formatDate = (key, opts={day:'numeric',month:'short'}) => dateFromKey(key).toLocaleDateString('es-ES',opts);
const escapeHTML = v=> String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[_\-]/g,' ').replace(/\s+/g,' ').trim();
const initialState = () => ({goal:0,entries:[],weights:[]});
function loadData(){try{const x=JSON.parse(localStorage.getItem(STORE));if(!x||typeof x!=='object')return initialState();return {goal:Number(x.goal)||0,entries:Array.isArray(x.entries)?x.entries:[],weights:Array.isArray(x.weights)?x.weights:[]}}catch{return initialState()}}
let state=loadData(), selectedTab='today', historyDate=todayKey(), currentEdit=null, selectedFood=null, currentPhotoURL=null, analysisRequest=0, inferencePipeline=null, toastTimer=null;
function persist(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch{toast('No se pudieron guardar los datos: comprueba el espacio disponible.')}}
function toast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3600)}
function selectedEntries(date){return state.entries.filter(e=>e.date===date)}
function kcalFor(item){return Math.round((Number(item.grams)||0)*(Number(item.kcal)||0)/100)}
function total(date){return selectedEntries(date).reduce((sum,e)=>sum+kcalFor(e),0)}
function navigate(tab){selectedTab=tab;document.querySelectorAll('.screen').forEach(e=>{const show=e.id===`screen-${tab}`;e.hidden=!show;e.classList.toggle('active',show)});document.querySelectorAll('[data-tab]').forEach(e=>{e.classList.toggle('selected',e.dataset.tab===tab);if(e.dataset.tab===tab)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current')});render();window.scrollTo({top:0,behavior:'instant'})}
function render(){if(selectedTab==='today')renderToday();else if(selectedTab==='history')renderHistory();else if(selectedTab==='weight')renderWeights();else if(selectedTab==='settings')renderSettings()}
function renderToday(){const date=todayKey(), consumed=total(date), goal=state.goal, percent=goal?Math.round(consumed/goal*100):0, remaining=goal-consumed;
  $('todayDate').textContent=dateFromKey(date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'}).toUpperCase();
  $('consumedCals').innerHTML=`${fmt(consumed)} <small>kcal</small>`;
  $('remainingLabel').textContent=!goal?'Configura tu límite diario':remaining>=0?`${fmt(remaining)} kcal disponibles`:`${fmt(-remaining)} kcal por encima del límite`;
  $('dailyGoalLine').textContent=goal?`Límite personal · ${fmt(goal)} kcal`:'Puedes ajustarlo en Configuración';
  $('ringPercent').textContent=`${percent}%`;
  $('ring').style.background=`conic-gradient(#c5eebd 0deg ${Math.min(100,percent)*3.6}deg,rgba(255,255,255,.17) ${Math.min(100,percent)*3.6}deg 360deg)`;
  const count=selectedEntries(date).length;$('entryCount').textContent=`${count} ${count===1?'alimento':'alimentos'}`;
  renderMealList('todayMeals',date);
}
function mealHTML(meal, date){const entries=selectedEntries(date).filter(e=>e.meal===meal.id).sort((a,b)=>a.created-b.created), sum=entries.reduce((s,e)=>s+kcalFor(e),0);
 return `<section class="meal-card"><div class="meal-card-header"><div class="meal-name"><span class="meal-emoji">${meal.icon}</span>${meal.name}</div><div class="meal-total">${fmt(sum)} kcal</div></div>${entries.length?entries.map(e=>`<div class="food-entry"><div class="entry-info"><div class="entry-name">${escapeHTML(e.name)}</div><div class="entry-sub">${fmt(e.grams)} g · ${fmt(e.kcal)} kcal/100 g</div></div><div class="entry-kcal">${fmt(kcalFor(e))}</div><div class="entry-actions"><button class="tiny-btn" data-edit="${escapeHTML(e.id)}" aria-label="Editar ${escapeHTML(e.name)}" title="Editar">✎</button><button class="tiny-btn" data-delete="${escapeHTML(e.id)}" aria-label="Borrar ${escapeHTML(e.name)}" title="Borrar">×</button></div></div>`).join(''):`<div class="meal-empty">Aún no has registrado nada aquí</div>`}</section>`;
}
function renderMealList(element,date){$(element).innerHTML=meals.map(m=>mealHTML(m,date)).join('')}
function renderHistory(){const last7=Array.from({length:7},(_,i)=>addDays(todayKey(),i-6)), highest=Math.max(state.goal||0,...last7.map(total),1);
 $('historyChart').innerHTML=last7.map(key=>{const amount=total(key);let height=amount?Math.max(6,Math.round(100*amount/highest)):3;return `<div class="bar-wrap"><div class="bar-num">${amount?fmt(amount):''}</div><div class="bar ${key===todayKey()?'today':''} ${state.goal&&amount>state.goal?'exceeded':''}" style="height:${height}%" title="${escapeHTML(formatDate(key))}: ${fmt(amount)} kcal"></div></div>`}).join('');
 $('historyLabels').innerHTML=last7.map(key=>`<span>${dateFromKey(key).toLocaleDateString('es-ES',{weekday:'short'}).replace('.','')}</span>`).join('');
 $('historySelectedTitle').textContent=historyDate===todayKey()?'Hoy, '+formatDate(historyDate):formatDate(historyDate,{weekday:'long',day:'numeric',month:'long'});
 $('historySelectedTotal').textContent=`${fmt(total(historyDate))} kcal`;
 $('nextDay').disabled=historyDate>=todayKey();
 renderMealList('historyMeals',historyDate);
}
function renderWeights(){const ordered=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date)), latest=ordered.at(-1), first=ordered[0];
 $('weightCurrent').innerHTML=latest?`${fmt(latest.kg,1)} <small>kg</small>`:'— <small>kg</small>';
 $('weightCurrentDate').textContent=latest?formatDate(latest.date,{day:'numeric',month:'long',year:'numeric'}):'Sin registros';
 const delta=latest&&first?latest.kg-first.kg:null;
 $('weightDelta').innerHTML=delta==null?'— <small>kg</small>':`${delta>0?'+':''}${fmt(delta,1)} <small>kg</small>`;
 $('weightPoints').textContent=`${ordered.length} ${ordered.length===1?'registro':'registros'}`;
 $('weightGraph').innerHTML=renderWeightChart(ordered);
 $('weightEntries').innerHTML=ordered.length?ordered.slice().reverse().map(e=>`<div class="weight-entry"><div><strong>${fmt(e.kg,1)} kg</strong><small>${escapeHTML(formatDate(e.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</small></div><button aria-label="Eliminar peso del ${escapeHTML(e.date)}" data-delete-weight="${escapeHTML(e.id)}">×</button></div>`).join(''):'<div class="weight-empty">Añade tu primera medición para ver la evolución.</div>';
 $('weightDate').max=todayKey();if(!$('weightDate').value)$('weightDate').value=todayKey();
}
function renderWeightChart(data){if(data.length===0)return '<div class="graph-empty">Tu gráfica aparecerá aquí<br>cuando registres tu peso.</div>';
 const w=320,h=167,left=32,right=11,top=20,bottom=29;const values=data.map(e=>e.kg), mn=Math.min(...values),mx=Math.max(...values),gap=Math.max(1,(mx-mn)*.22);const lo=mn-gap,hi=mx+gap,innerW=w-left-right,innerH=h-top-bottom;
 const points=data.map((e,i)=>({x:data.length===1?(left+innerW/2):left+i*innerW/(data.length-1),y:top+(hi-e.kg)/(hi-lo)*innerH,v:e.kg,date:e.date}));
 const line=points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),fill=`${line} L${points.at(-1).x.toFixed(1)},${top+innerH} L${points[0].x.toFixed(1)},${top+innerH} Z`;
 const levels=[0,.5,1].map(r=>{const y=top+r*innerH;const label=hi-r*(hi-lo);return `<path d="M${left} ${y} H${w-right}" stroke="#edf1ec" stroke-dasharray="3 5"/><text x="${left-5}" y="${y+3}" text-anchor="end" fill="#94a498" font-size="9">${fmt(label,1)}</text>`}).join('');
 const markers=points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3.7" fill="#4f9e6b" stroke="white" stroke-width="2"><title>${escapeHTML(formatDate(p.date))}: ${fmt(p.v,1)} kg</title></circle>`).join('');
 const lab=[data[0],data.at(-1)].map((e,i)=>`<text x="${i? w-right:left}" y="${h-5}" text-anchor="${i?'end':'start'}" fill="#a2afa4" font-size="10">${escapeHTML(formatDate(e.date))}</text>`).join('');
 return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Gráfica de peso entre ${escapeHTML(formatDate(data[0].date))} y ${escapeHTML(formatDate(data.at(-1).date))}"><defs><linearGradient id="fade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8ccb9d" stop-opacity=".33"/><stop offset="1" stop-color="#8ccb9d" stop-opacity="0"/></linearGradient></defs>${levels}<path d="${fill}" fill="url(#fade)"/><path d="${line}" stroke="#469662" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" fill="none"/>${markers}${lab}</svg>`;
}
function renderSettings(){$('goalInput').value=state.goal||''}
function selectFood(food){selectedFood=food;$('foodSearch').value=food.name;$('kcal100Input').value=food.kcal;$('gramsInput').value=food.grams;$('foodMatches').hidden=true;updatePreview()}
function updatePreview(){const g=Number($('gramsInput').value),k=Number($('kcal100Input').value);$('previewKcal').textContent=g>0&&k>0?fmt(Math.round(g*k/100)):'—'}
function openFood(mode='manual', entry=null){currentEdit=entry;selectedFood=null;analysisRequest++;
 $('foodDialogTitle').textContent=entry?'Editar alimento':mode==='photo'?'Analizar fotografía':'Añadir alimento';
 $('foodDialogEyebrow').textContent=entry?'MODIFICAR REGISTRO':mode==='photo'?'CÁMARA E IA':'NUEVA COMIDA';
 $('foodSearch').value='';$('kcal100Input').value='';$('gramsInput').value='150';$('mealSelect').value=entry?.meal||guessMeal();$('foodMatches').hidden=true;$('suggestions').hidden=true;
 $('photoArea').hidden=mode!=='photo';$('aiStatusText').textContent='Preparando el reconocimiento…';$('aiSpinner').hidden=false;
 $('saveFood').innerHTML=entry?'Guardar cambios <span>→</span>':'Añadir al diario <span>→</span>';
 if(entry){$('foodSearch').value=entry.name;$('gramsInput').value=entry.grams;$('kcal100Input').value=entry.kcal;selectedFood=foodById.get(entry.foodId)||null;}
 updatePreview();$('foodOverlay').hidden=false;document.body.classList.add('modal-open');
}
function closeFood(){analysisRequest++;$('foodOverlay').hidden=true;document.body.classList.remove('modal-open');if(currentPhotoURL){URL.revokeObjectURL(currentPhotoURL);currentPhotoURL=null}$('photoPreview').removeAttribute('src');currentEdit=null;}
function guessMeal(){const h=new Date().getHours();return h<11?'desayuno':h<17?'comida':h<21?'cena':'snack'}
function listFoodMatches(text){const q=normalize(text);const matches=q?foods.filter(f=>normalize(f.name).includes(q)||normalize(f.id).includes(q)).slice(0,7):[];
 $('foodMatches').innerHTML=matches.map(f=>`<button type="button" class="food-match" data-food-id="${f.id}"><span>${escapeHTML(f.name)}</span><small>${fmt(f.kcal)} kcal/100g</small></button>`).join('');$('foodMatches').hidden=matches.length===0;
}
function saveFood(){const name=$('foodSearch').value.trim(),grams=Number($('gramsInput').value),kcal=Number($('kcal100Input').value),meal=$('mealSelect').value;
 if(name.length<2||name.length>120){toast('Escribe el nombre del alimento.');return}if(!Number.isFinite(grams)||grams<=0||grams>10000){toast('Indica una cantidad válida en gramos.');return}if(!Number.isFinite(kcal)||kcal<=0||kcal>1000){toast('Introduce las calorías por 100 g.');return}if(!meals.some(m=>m.id===meal)){toast('Selecciona un momento del día.');return}
 const item={id:currentEdit?.id|| (crypto.randomUUID?.()||String(Date.now())+Math.random()),date:currentEdit?.date||todayKey(),foodId:selectedFood?.id||null,name,grams:Math.round(grams*10)/10,kcal:Math.round(kcal*10)/10,meal,created:currentEdit?.created||Date.now()};
 if(currentEdit){state.entries=state.entries.map(e=>e.id===currentEdit.id?item:e)}else state.entries.push(item);
 const wasEditing=Boolean(currentEdit);persist();closeFood();render();toast(wasEditing?'Alimento actualizado.':'Comida añadida al diario.');
}
async function resizeImage(file){if(!file.type.startsWith('image/'))throw Error('El archivo no es una imagen');const u=URL.createObjectURL(file);try{const im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=()=>reject(Error('No se pudo leer esta fotografía'));im.src=u});const scale=Math.min(1,1024/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*scale));c.height=Math.max(1,Math.round(im.naturalHeight*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);const blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('No se pudo convertir la imagen')),'image/jpeg',.83));return URL.createObjectURL(blob)}finally{URL.revokeObjectURL(u)}}
function getModelFood(label){let id=String(label).toLowerCase().trim().replace(/\s+/g,'_').replace(/-/g,'_');if(foodById.has(id))return foodById.get(id);let norm=normalize(label);return foods.slice(0,101).find(f=>normalize(f.name)===norm)||null}
function setAiStatus(text,loading){$('aiStatusText').textContent=text;$('aiSpinner').hidden=!loading}
async function inferPhoto(url,req){try{
 if(!navigator.onLine&&!inferencePipeline){setAiStatus('Sin conexión: usa la búsqueda manual. La primera descarga de IA requiere internet.',false);return}
 setAiStatus('Cargando IA gratuita… La primera vez puede descargar unos 90 MB.',true);
 if(!inferencePipeline){const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');if(req!==analysisRequest)return;
   env.allowLocalModels=false;
   // 1 hilo para funcionar en Safari sin cabeceras de aislamiento entre orígenes.
   if(env.backends?.onnx?.wasm)env.backends.onnx.wasm.numThreads=1;
   inferencePipeline=await pipeline('image-classification','onnx-community/swin-finetuned-food101-ONNX',{device:'wasm',dtype:'q8',progress_callback:progress=>{
     if(req!==analysisRequest)return;if(progress.status==='progress'&&progress.total>0){const p=Math.round(progress.progress||progress.loaded/progress.total*100);setAiStatus(`Descargando el modelo de IA… ${Math.min(100,p)} %`,true)}
   }});
 }
 if(req!==analysisRequest)return;
 setAiStatus('Analizando la comida en el dispositivo…',true);
 let results=await inferencePipeline(url,{topk:5});if(req!==analysisRequest)return;
 results=results.map(r=>({food:getModelFood(r.label),label:r.label,score:r.score})).filter(r=>r.food);
 if(!results.length){setAiStatus('No he podido reconocer el plato. Busca el alimento manualmente.',false);return}
 $('suggestions').innerHTML=results.slice(0,3).map(r=>`<button type="button" class="suggestion" data-food-id="${r.food.id}">${escapeHTML(r.food.name)} <span>${Math.round(r.score*100)} %</span></button>`).join('');$('suggestions').hidden=false;
 if(results[0].score>=.14){selectFood(results[0].food);setAiStatus('Posible plato detectado. Comprueba el nombre y ajusta los gramos.',false)}else{setAiStatus('La foto no es concluyente. Elige una sugerencia o busca el alimento.',false)}
 }catch(e){if(req!==analysisRequest)return;console.error('Clasificación no disponible:',e);setAiStatus('No se pudo cargar el reconocimiento en este iPhone. Puedes registrar la comida manualmente.',false);toast('IA no disponible ahora. Puedes añadir la comida a mano.')}}
async function onPhotoSelected(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;
 $('captureChooser').hidden=true;openFood('photo');const req=analysisRequest;
 try{currentPhotoURL=await resizeImage(file);if(req!==analysisRequest){URL.revokeObjectURL(currentPhotoURL);currentPhotoURL=null;return}$('photoPreview').src=currentPhotoURL;await inferPhoto(currentPhotoURL,req)}catch(error){console.error(error);setAiStatus('Esta imagen no se ha podido abrir. Usa otra foto o el registro manual.',false)}}
function downloadBackup(){const payload={app:'NutriFoto',version:1,exportedAt:new Date().toISOString(),...state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`NutriFoto-copia-${todayKey()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Copia de seguridad preparada. Guárdala en Archivos.');}
async function importBackup(file){if(!file)return;if(file.size>3_000_000){toast('La copia es demasiado grande.');return}try{const data=JSON.parse(await file.text());if(!Array.isArray(data.entries)||!Array.isArray(data.weights))throw Error('Formato incorrecto');
 const entries=data.entries.filter(e=>e&&typeof e.name==='string'&&e.name.length<=120&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&meals.some(m=>m.id===e.meal)&&Number.isFinite(Number(e.grams))&&e.grams>0&&e.grams<=10000&&Number.isFinite(Number(e.kcal))&&e.kcal>0&&e.kcal<=1000).slice(0,20000).map(e=>({id:String(e.id||crypto.randomUUID()),date:e.date,foodId:typeof e.foodId==='string'?e.foodId:null,name:e.name,grams:Number(e.grams),kcal:Number(e.kcal),meal:e.meal,created:Number(e.created)||Date.now()}));
 const weights=data.weights.filter(e=>e&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&Number(e.kg)>0&&Number(e.kg)<=500).slice(0,10000).map(e=>({id:String(e.id||crypto.randomUUID()),date:e.date,kg:Number(e.kg)}));
 if(!confirm(`Se reemplazarán los datos actuales por ${entries.length} comidas y ${weights.length} registros de peso. ¿Continuar?`))return;
 state={goal:Number(data.goal)>0&&Number(data.goal)<=20000?Number(data.goal):0,entries,weights};persist();render();toast('Copia de seguridad importada.');
 }catch(error){toast('El archivo no es una copia de NutriFoto válida.')}}
function init(){document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.tab)));
 $('settingsButton').addEventListener('click',()=>navigate('settings'));
 $('photoButton').addEventListener('click',()=>{$('captureChooser').hidden=false});
 $('manualButton').addEventListener('click',()=>openFood());
 $('takePhoto').addEventListener('click',()=>$('cameraInput').click());$('choosePhoto').addEventListener('click',()=>$('galleryInput').click());
 $('closeChooser').addEventListener('click',()=>$('captureChooser').hidden=true);
 $('captureChooser').addEventListener('click',e=>{if(e.target===$('captureChooser'))$('captureChooser').hidden=true});
 $('cameraInput').addEventListener('change',onPhotoSelected);$('galleryInput').addEventListener('change',onPhotoSelected);
 $('closeFood').addEventListener('click',closeFood);$('foodOverlay').addEventListener('click',e=>{if(e.target===$('foodOverlay'))closeFood()});
 $('foodSearch').addEventListener('input',()=>{if(selectedFood&&$('foodSearch').value!==selectedFood.name)selectedFood=null;listFoodMatches($('foodSearch').value)});
 $('foodMatches').addEventListener('click',e=>{const button=e.target.closest('[data-food-id]');if(button)selectFood(foodById.get(button.dataset.foodId))});
 $('suggestions').addEventListener('click',e=>{const button=e.target.closest('[data-food-id]');if(button)selectFood(foodById.get(button.dataset.foodId))});
 ['gramsInput','kcal100Input'].forEach(id=>$(id).addEventListener('input',updatePreview));
 $('saveFood').addEventListener('click',saveFood);
 ['todayMeals','historyMeals'].forEach(id=>$(id).addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit){const entry=state.entries.find(e=>e.id===edit.dataset.edit);if(entry)openFood('manual',entry)}else if(del){const entry=state.entries.find(e=>e.id===del.dataset.delete);if(entry&&confirm(`¿Eliminar «${entry.name}» del diario?`)){state.entries=state.entries.filter(x=>x.id!==entry.id);persist();render();toast('Alimento eliminado.')}}}));
 $('weightForm').addEventListener('submit',e=>{e.preventDefault();const kg=Number($('weightInput').value),date=$('weightDate').value;if(!(kg>0&&kg<=500)||!date||date>todayKey()){toast('Escribe un peso y una fecha válidos.');return}
 const old=state.weights.find(w=>w.date===date);if(old){old.kg=kg}else{state.weights.push({id:crypto.randomUUID?.()||String(Date.now()),date,kg})}state.weights.sort((a,b)=>a.date.localeCompare(b.date));persist();$('weightInput').value='';render();toast(old?'Peso de ese día actualizado.':'Peso guardado.');});
 $('weightEntries').addEventListener('click',e=>{const b=e.target.closest('[data-delete-weight]');if(b&&confirm('¿Eliminar esta medición de peso?')){state.weights=state.weights.filter(w=>w.id!==b.dataset.deleteWeight);persist();render();toast('Medición eliminada.')}});
 $('goalForm').addEventListener('submit',e=>{e.preventDefault();const goal=Number($('goalInput').value);if(!Number.isFinite(goal)||goal<1||goal>20000){toast('Indica un límite válido en kcal.');return}state.goal=Math.round(goal);persist();render();toast('Límite diario guardado.');});
 $('prevDay').addEventListener('click',()=>{historyDate=addDays(historyDate,-1);renderHistory()});
 $('nextDay').addEventListener('click',()=>{if(historyDate<todayKey()){historyDate=addDays(historyDate,1);renderHistory()}});
 $('exportButton').addEventListener('click',downloadBackup);
 $('importInput').addEventListener('change',async e=>{await importBackup(e.target.files?.[0]);e.target.value=''});
 $('eraseButton').addEventListener('click',()=>{if(confirm('¿Eliminar definitivamente todas tus comidas, pesos y límite diario de este dispositivo?')){state=initialState();persist();render();toast('Datos borrados del dispositivo.')}});
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('foodOverlay').hidden)closeFood();$('captureChooser').hidden=true}});
 window.addEventListener('focus',()=>{if(selectedTab==='today')renderToday()});
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
 navigate('today');
}
init();
