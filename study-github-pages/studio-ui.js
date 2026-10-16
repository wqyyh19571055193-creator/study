(() => {
  'use strict';
  const $=id=>document.getElementById(id), S=window.MechStudioState, bench=$('panel-rig').querySelector('.workbench'), controls=bench.querySelector('.controls'), panel=$('wb-inspector');
  document.body.classList.add('studio');
  const groups=[...controls.querySelectorAll(':scope > .group')],sections=[...panel.querySelectorAll(':scope > section')];
  const drawers={};
  function fold(title,nodes,parent,open=false){const d=document.createElement('details');d.className='studio-fold';d.open=open;const h=document.createElement('summary');h.textContent=title;d.append(h);const b=document.createElement('div');b.className='studio-fold-body';for(const n of nodes)b.append(n);d.append(b);parent.append(d);return d;}
  const head=panel.querySelector('.wb-panel-head');head.querySelector('h2').id='studio-panel-title';
  panel.querySelector(':scope > .wb-help')?.remove();
  for(const key of ['properties','calculate','analysis','theory','presets','joints','sliders']){const d=document.createElement('div');d.className='studio-drawer';d.dataset.drawer=key;d.hidden=true;drawers[key]=d;panel.append(d);}
  fold('选择与连接',[sections[0]],drawers.properties,true);
  fold('智能尺寸',[sections[1]],drawers.properties,true);
  fold('驱动与运动参数',[groups[2]],drawers.properties);
  fold('外荷载与摩擦',[groups[3]],drawers.properties);
  fold('模型数据',[groups[5]],drawers.properties);
  fold('存档',[groups[6]],drawers.properties);
  fold('AI 与本地检查',[sections[3]],drawers.properties);
  fold('按需计算',[sections[2]],drawers.calculate,true);
  const lower=bench.querySelector('.rig-lower'),results=[...lower.children];
  fold('结构与约束诊断',[results[0]],drawers.analysis,true);
  fold('一个周期的变化曲线',[results[2]],drawers.analysis,true);
  fold('约束与求解原理',[groups[8]],drawers.theory,true);
  fold('当前位形的平衡方程',[results[1]],drawers.theory);
  fold('逐步搭建演示',[groups[1]],drawers.theory);
  fold('快捷键',[groups[7]],drawers.theory);
  fold('典型机构',[groups[4]],drawers.presets,true);
  lower.remove();
  // Keep advanced building controls available, without competing with the canvas.
  const toolGroup=groups[0],toolButtons=$('rig-tools');
  const title=toolGroup.querySelector('h3');title.textContent='构图工具';
  const advanced=document.createElement('div');advanced.className='studio-advanced';
  for(const n of [...toolGroup.children])if(![title,toolButtons,$('rig-hint')].includes(n))advanced.append(n);
  fold('更多建模参数',[advanced],toolGroup);
  for(const b of toolButtons.children){const labels={select:'选择 / 拖动',bar:'画杆',pt:'活动铰',pg:'固定铰',link:'连接构件',prism:'移动副',gear:'齿轮副',load:'荷载',erase:'删除'};b.textContent=labels[b.dataset.tool]||b.textContent;}
  const extraTools=document.createElement('details');extraTools.className='studio-extra-tools';extraTools.innerHTML='<summary>更多工具</summary><div class="btnrow"></div>';
  for(const b of [...toolButtons.children])if(['pg','prism','gear','load','erase'].includes(b.dataset.tool))extraTools.lastElementChild.append(b);
  toolButtons.append(extraTools);
  const supports=document.createElement('div');supports.className='studio-supports';
  supports.innerHTML=`<div class="studio-eyebrow">SUPPORTS & GUIDES</div><h3>支座与滑槽</h3><div class="studio-support-grid">
    <button class="act" id="studio-pin"><span>△</span>固定铰</button><button class="act" id="studio-frame"><span>▥</span>固定构件</button>
    </div><button class="act" id="studio-open-sliders">⇄ 滑块 / 导轨 <kbd>S</kbd></button>
    <div class="btnrow"><button class="act" id="studio-unpin">取消固定</button></div>
    <p class="studio-small">先选择铰点或构件，可批量设置。未选点时，“固定铰”进入连续放置模式。</p>`;
  controls.append(supports);
  drawers.sliders.classList.add('studio-slider-panel');
  drawers.sliders.innerHTML=`<p class="studio-small">选择滑块构件 → 设置导轨方向 → 计算运动。Ctrl 可选多个构件；重复设置会更新原移动副。</p>
    <label for="studio-slider-pick">滑块构件</label><select id="studio-slider-pick"></select>
    <button class="act" id="studio-slider-select">在画布选取构件</button>
    <output id="studio-slot-status" aria-live="polite"></output>
    <div class="studio-support-grid">
      <button class="act" id="studio-slot-x" title="面板展开时按 H"><span>═</span>水平 <kbd>H</kbd></button>
      <button class="act" id="studio-slot-y" title="面板展开时按 V"><span>║</span>竖直 <kbd>V</kbd></button>
    </div>
    <label for="studio-angle">固定导轨方向角（°，逆时针为正）</label>
    <div class="studio-angle-row"><input id="studio-angle" type="number" value="30" step="15"><button class="act" id="studio-slot-angle">应用角度</button></div>
    <div class="studio-support-grid">
      <button class="act" id="studio-slot-minus" title="面板展开时按 [">↶ −15° <kbd>[</kbd></button>
      <button class="act" id="studio-slot-plus" title="面板展开时按 ]">↷ +15° <kbd>]</kbd></button>
    </div>
    <details class="studio-slot-follow"><summary>随构件运动的导轨</summary>
      <label for="studio-guide">参考构件</label><select id="studio-guide"></select>
      <button class="act" id="studio-slot-link">⇄ 应用随杆导槽</button>
      <p class="studio-small">方向随参考杆变化，不能单独旋转；上方方向按钮会改为固定导轨。</p>
    </details>
    <div class="btnrow"><button class="act" id="studio-unslot">移除滑槽</button><button class="act" id="studio-slot-undo" title="Ctrl+Z">撤销</button></div>
    <p class="studio-small">H / V / [ / ] 仅在此面板展开、未输入文字时生效。Esc 收起。移动副保留沿导轨平移的自由度，不含挡块或碰撞。</p>`;
  const footer=document.createElement('div');footer.className='studio-left-footer';footer.innerHTML='<button class="act" id="studio-presets">＋ 从典型机构开始</button><span>Ctrl 多选 · Shift 框选 · D 尺寸</span>';controls.append(footer);
  const toolbar=bench.querySelector('.wb-toolbar');
  $('wb-toggle').textContent='属性';$('wb-open-results').textContent='计算';$('wb-select').textContent='选择';$('wb-dimension').textContent='尺寸 D';
  $('wb-open-results').classList.remove('primary');toolbar.insertBefore($('wb-toggle'),$('wb-open-results'));
  const buttons={properties:$('wb-toggle'),calculate:$('wb-open-results')};
  for(const [key,label] of [['sliders','滑块 S'],['joints','复合铰链'],['analysis','分析'],['theory','原理']]){const b=document.createElement('button');b.className='act';b.textContent=label;b.id='studio-'+key;toolbar.insertBefore(b,$('wb-revision'));buttons[key]=b;}
  const canvasTools=document.createElement('div');canvasTools.className='studio-canvas-tools';canvasTools.innerHTML='<button class="act" id="studio-play">▶ 运动</button><button class="act" id="studio-fit">适应画布</button><label><input type="checkbox" id="studio-forces"> 受力图层</label>';$('rig-wrap').append(canvasTools);
  const metric=document.createElement('div');metric.className='studio-canvas-label';metric.innerHTML='<span>MECHANISM STUDIO</span><b>机构建模</b><small>先构图，再计算</small>';$('rig-wrap').append(metric);
  let active=null,slotFilter=null,pickingSlot=false,pickFilter=null;const names={properties:'模型属性',calculate:'计算',analysis:'分析',theory:'原理解析',presets:'典型机构',joints:'复合铰链',sliders:'滑块 / 导轨'};
  function stopSlotPick(){if(pickingSlot){pickingSlot=false;$('wb-filter').value=pickFilter;pickFilter=null;}}
  function resize(){requestAnimationFrame(()=>{const w=rigMain.w,h=rigMain.h;onResizeAll();if(w&&h)RIG.editScale*=Math.min(1,rigMain.w/w,rigMain.h/h);rigDraw(rigMain);});}
  function show(key,toggle=true){
    stopSlotPick();
    active=toggle&&active===key?null:key;S.analysis=active==='analysis';S.readout=active==='analysis'||active==='theory';
    if(active==='sliders'&&slotFilter===null){slotFilter=$('wb-filter').value;$('wb-filter').value='links';if(RIG.tool!=='select'){const points=[...selection().points],links=[...selection().links];rigTool('select');MechWorkbench.select(points,links);}}
    else if(active!=='sliders'&&slotFilter!==null){$('wb-filter').value=slotFilter;slotFilter=null;}
    for(const [k,d] of Object.entries(drawers))d.hidden=k!==active;
    panel.classList.toggle('studio-visible',!!active);panel.classList.toggle('wb-open',!!active);panel.classList.toggle('wb-hidden',!active);bench.classList.toggle('studio-inspecting',!!active);
    for(const [k,b]of Object.entries(buttons)){b.classList.toggle('studio-active',k===active);b.setAttribute('aria-expanded',String(k===active));b.setAttribute('aria-controls','wb-inspector');}
    $('studio-panel-title').textContent=names[active]||'模型属性';
    if(S.readout)renderRigReadout();if(S.analysis)rigUpdateCharts();resize();
  }
  for(const [key,b]of Object.entries(buttons))b.addEventListener('click',e=>{e.stopImmediatePropagation();show(key);if(key==='calculate')$('wb-use-selection').click();},true);
  $('wb-close').addEventListener('click',e=>{e.stopImmediatePropagation();show(null,false);},true);
  $('wb-dimension').addEventListener('click',()=>{show('properties',false);$('wb-dim-section').closest('details').open=true;});
  $('studio-presets').onclick=()=>show('presets');
  $('studio-fit').onclick=()=>{rigFitView();rigDraw(rigMain);};
  $('studio-play').onclick=()=>{$('rig-play').click();syncPlay();};
  function syncPlay(){$('studio-play').textContent=RIG.playing?'Ⅱ 暂停':'▶ 运动';}
  const playObserver=new MutationObserver(syncPlay);playObserver.observe($('rig-play'),{childList:true,characterData:true,subtree:true});
  $('studio-forces').onchange=()=>{S.forces=$('studio-forces').checked;$('rig-wrap').classList.toggle('studio-show-forces',S.forces);rigDraw(rigMain);};
  function note(s){$('wb-notice').textContent=s;}
  function action(fn){return()=>{try{fn();resize();}catch(e){note(e.message);}};}
  const selection=()=>MechWorkbench.state;
  $('studio-pin').onclick=action(()=>{if(selection().points.length)$('wb-fixed').click();else{rigTool('pg');note('连续点击画布放置固定铰；按 Esc 返回选择。');}});
  $('studio-frame').onclick=action(()=>{if(!selection().links.length)throw Error('先选中一个或多个构件，再设置机架。');$('wb-frame').click();});
  $('studio-unpin').onclick=action(()=>{if(selection().points.length)$('wb-free').click();if(selection().links.length)$('wb-unframe').click();});
  function applySlot(angle,guide=null){MechWorkbench.commit(MechSupports.guide(RIG.model,selection().links,angle,guide),`已更新 ${selection().links.length} 个滑块的${guide===null?'固定导轨（'+angle+'°）':'随杆导槽'}；可在计算面板检查运动。`);guides();}
  $('studio-slot-x').onclick=action(()=>applySlot(0));$('studio-slot-y').onclick=action(()=>applySlot(90));
  $('studio-slot-angle').onclick=action(()=>{const v=$('studio-angle').value;if(!v.trim())throw Error('请输入槽方向角。');applySlot(Number(v));});
  $('studio-slot-link').onclick=action(()=>{if(!$('studio-guide').value)throw Error('请选择参考导轨构件。');applySlot(0,$('studio-guide').value);});
  $('studio-unslot').onclick=action(()=>{if(!selection().links.length)throw Error('先选中需要移除滑槽的构件。');MechWorkbench.commit(MechSupports.remove(RIG.model,selection().links),'已移除所选构件的滑槽。');});
  $('studio-open-sliders').onclick=()=>{show('sliders',false);$('web-tools-close')?.click();};
  $('studio-slot-undo').onclick=()=>MechWorkbench.undo();
  for(const [id,angle]of [['studio-slot-minus',-15],['studio-slot-plus',15]])$(id).onclick=action(()=>{MechWorkbench.commit(MechSupports.rotate(RIG.model,selection().links,angle),'已将所选固定导轨旋转 '+angle+'°，轴心保持。');guides();});
  $('studio-slider-pick').onchange=()=>{const id=$('studio-slider-pick').value;if(id){rigTool('select');MechWorkbench.select([],[id]);guides();}};
  $('studio-slider-select').onclick=()=>{
    rigTool('select');document.activeElement?.blur();
    if(innerWidth<=760){show(null,false);pickFilter=$('wb-filter').value;pickingSlot=true;}
    $('wb-filter').value='links';note('点击构件选为滑块；Ctrl 可多选。手机选中后自动返回面板，Esc 取消选取。');
  };
  $('studio-angle').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();e.stopPropagation();$('studio-slot-angle').click();}};
  function guides(){
    const ids=selection().links,select=$('studio-guide'),v=select.value,pick=$('studio-slider-pick');
    if(pickingSlot&&ids.length){stopSlotPick();show('sliders',false);note('已选滑块，请设置导轨方向。');}
    select.replaceChildren(new Option('选择参考构件',''));pick.replaceChildren(new Option(ids.length>1?'已多选 '+ids.length+' 个构件':'请选择构件',''));
    RIG.model.links.forEach((l,i)=>{pick.add(new Option('L'+(i+1),l.id));if(!ids.includes(l.id))select.add(new Option('L'+(i+1),l.id));});select.value=v;pick.value=ids.length===1?ids[0]:'';
    const moving=p=>p.guide!=null&&p.guide>=0,ps=ids.map(id=>RIG.model.prisms.find(p=>RIG.model.links[p.link]?.id===id)),angles=ps.map(p=>p&&!moving(p)?Math.atan2(p.dy,p.dx)*180/Math.PI:null);
    $('studio-slot-status').textContent=ids.length?ids.map((id,i)=>{const li=RIG.model.links.findIndex(l=>l.id===id),p=ps[i];return 'L'+(li+1)+' · '+(!p?'未设置滑槽':moving(p)?'随 L'+(p.guide+1)+' 导向':'固定导轨 '+Number(angles[i].toFixed(1))+'°');}).join('\n'):'尚未选择滑块。可在上方列表或画布选择构件。';
    if(angles.length&&angles.every(a=>a!==null&&Math.abs(a-angles[0])<1e-6)&&document.activeElement!==$('studio-angle'))$('studio-angle').value=Number(angles[0].toFixed(4));
    for(const id of ['studio-slot-x','studio-slot-y','studio-slot-angle'])$(id).disabled=!ids.length;
    $('studio-slot-link').disabled=!ids.length||!select.value;
    $('studio-unslot').disabled=!ps.some(Boolean);
    for(const id of ['studio-slot-minus','studio-slot-plus'])$(id).disabled=!ps.length||ps.some(p=>!p||moving(p));
    for(const [id,a]of [['studio-slot-x',0],['studio-slot-y',90]])$(id).setAttribute('aria-pressed',String(angles.length>0&&angles.every(x=>x!==null&&Math.abs(Math.sin((x-a)*Math.PI/180))<1e-8)));
  }
  $('studio-guide').onchange=guides;
  const slotObserver=new MutationObserver(guides);slotObserver.observe($('wb-selection'),{subtree:true,childList:true});slotObserver.observe($('wb-revision'),{childList:true});
  const selectObjects=MechWorkbench.select;MechWorkbench.select=function(...args){const r=selectObjects(...args);guides();return r;};
  const oldSolve=rigSolve;rigSolve=function(){const r=oldSolve();guides();return r;};
  window.addEventListener('keydown',e=>{
    if(!$('panel-rig').classList.contains('active')||e.isComposing||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')||document.querySelector('dialog[open]'))return;
    const k=e.key.toLowerCase();let id=null;
    if(k==='escape'&&pickingSlot){e.preventDefault();e.stopImmediatePropagation();stopSlotPick();note('已取消滑块选取。');return;}
    if(k==='s'){e.preventDefault();e.stopImmediatePropagation();show('sliders');guides();return;}
    if(active==='sliders')id={h:'studio-slot-x',v:'studio-slot-y','[':'studio-slot-minus',']':'studio-slot-plus'}[k];
    if(id){e.preventDefault();e.stopImmediatePropagation();$(id).click();}
  },true);
  // Keep hidden panels cheap while animation runs. Cache one sweep per compiled model.
  const sweeps=new WeakMap(),oldCharts=rigUpdateCharts,oldReadout=renderRigReadout;
  rigUpdateCharts=function(){if(!S.analysis)return;const c=RIG.comp;if(c&&!RIG.sweep){let sw=sweeps.get(c);if(!sw){sw=rigSweep(c,RIG.q0,48);sweeps.set(c,sw);S.sweepCount++;}RIG.sweep=sw;}return oldCharts();};
  renderRigReadout=function(){if(S.readout)return oldReadout();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.target.matches('input,textarea,select'))show(null,false);});
  RIG.playing=false;$('rig-play').textContent='播放';guides();show(null,false);rigFitView();resize();
  note('从左侧选择工具开始构图；计算、分析和原理可按需展开。');
  window.MechStudio={show,get active(){return active;},state:S};
})();
