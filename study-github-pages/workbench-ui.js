/* Progressive enhancement: the original teaching pages and solver stay available. */
(() => {
  'use strict';
  const M=MechEdit, $w=id=>document.getElementById(id);
  const U={points:[],links:[],undo:[],redo:[],revision:0,signature:'',result:null,resultSignature:'',preview:null,busy:false,dimension:false,drag:null,box:null};
  const engine={compile:rigCompile,analyze:rigAnalyze,kinematics:rigKinematics,extract:rigExtract};
  const bench=$w('panel-rig').querySelector('.workbench'),view=bench.querySelector('.view');
  const toolbar=document.createElement('div');toolbar.className='wb-toolbar';toolbar.innerHTML=`
    <button class="act" id="wb-select" title="V：选择；Ctrl 增选；Shift 拖动框选">选择 V</button>
    <button class="act" id="wb-dimension" title="D：先选择对象，再设置尺寸">智能尺寸 D</button>
    <button class="act" id="wb-redo" title="Ctrl+Y / Ctrl+Shift+Z">重做 ↷</button>
    <button class="act primary" id="wb-open-results">选结果 / 计算</button>
    <button class="act" id="wb-toggle">属性与 AI</button><span class="wb-state" id="wb-revision"></span>`;
  const notice=document.createElement('div');notice.id='wb-notice';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  view.prepend(notice);view.prepend(toolbar);
  const panel=document.createElement('aside');panel.className='wb-inspector';panel.id='wb-inspector';panel.innerHTML=`
    <div class="wb-panel-head"><h2>机构工作台</h2><button class="act" id="wb-close" aria-label="关闭属性面板">收起 ×</button></div><div class="wb-help">选择对象 → 设置尺寸与约束 → 按需分析</div>
    <section><h3>选择与连接</h3>
      <label for="wb-filter">画布选择范围</label><select id="wb-filter"><option value="all">铰点与构件</option><option value="points">只选铰点</option><option value="links">只选构件</option></select>
      <div id="wb-selection" class="wb-pills"></div><div id="wb-joint-info" class="wb-message"></div>
      <div class="wb-help">Ctrl 增选 · Shift 拖动框选 · Alt+单击轮换重叠杆件<br>空白处拖动平移；编辑时回到初始位形。</div>
      <div id="wb-composite-controls"><div class="btnrow"><button class="act" id="wb-merge">合并为复合铰链</button><button class="act" id="wb-cross">交点启用复合</button></div>
      <label for="wb-split-link">从选中铰点拆出的构件</label><select id="wb-split-link"></select><div class="btnrow"><button class="act" id="wb-split">拆分此连接</button><button class="act" id="wb-clear-selection">取消选择</button></div></div>
      <div class="btnrow"><button class="act" id="wb-fixed">固定所选铰点</button><button class="act" id="wb-free">取消固定铰</button></div>
      <div class="btnrow"><button class="act" id="wb-frame">所选构件设为机架</button><button class="act" id="wb-unframe">取消机架构件</button></div>
    </section>
    <section id="wb-dim-section"><h3>智能尺寸</h3>
      <div class="wb-help">选择 1 根两点杆 / 2 个点；夹角选择 2 根两点杆。驱动尺寸约束初始草图，运动中显示实测值。</div>
      <div class="wb-inline"><div><label for="wb-dim-kind">尺寸类型</label><select id="wb-dim-kind"><option value="distance">距离 / 杆长 mm</option><option value="horizontal">水平差 Δx mm</option><option value="vertical">垂直差 Δy mm</option><option value="angle">有向夹角 °</option></select></div><div><label for="wb-dim-mode">尺寸用途</label><select id="wb-dim-mode"><option value="driving">驱动尺寸</option><option value="reference">参考尺寸</option></select></div></div>
      <label for="wb-dim-value">目标值（参考尺寸自动测量）</label><input id="wb-dim-value" type="number" step="0.1" placeholder="先选择对象">
      <div class="btnrow"><button class="act primary" id="wb-dim-apply">应用尺寸</button></div><div id="wb-dim-list"></div>
    </section>
    <section id="wb-analysis-section"><h3>按需计算</h3>
      <label for="wb-target">分析对象</label><select id="wb-target"></select><div class="btnrow"><button class="act" id="wb-use-selection">使用当前选择</button></div>
      <div class="wb-checks" id="wb-metrics">
        <label><input type="checkbox" value="position">位置</label><label><input type="checkbox" value="velocity" checked>速度</label><label><input type="checkbox" value="acceleration">加速度</label><label><input type="checkbox" value="angular">角运动</label><label><input type="checkbox" value="reaction">铰链反力</label><label><input type="checkbox" value="drive">驱动力 / 力矩</label>
      </div><div class="wb-inline"><div><label for="wb-range">计算范围</label><select id="wb-range"><option value="current">当前位形</option><option value="scan">从初始位形扫描</option></select></div><div><label for="wb-duration">扫描时长 s</label><input id="wb-duration" type="number" min="0.001" max="10000" step="0.1" value="1"></div></div>
      <div class="btnrow"><button class="act primary" id="wb-calculate">计算所选结果</button><button class="act" id="wb-export" disabled>导出 CSV</button></div>
      <div class="wb-status" id="wb-result-status">尚未计算</div><div class="wb-results" id="wb-results"></div>
      <select id="wb-series" aria-label="选择绘制的结果曲线" hidden></select><canvas class="wb-chart" id="wb-chart" hidden></canvas>
    </section>
    <section><h3>AI 机械助手</h3><div id="wb-ai-status" class="wb-help">正在检查 AI 服务…</div>
      <div class="btnrow"><button class="act" id="wb-local-diagnose">本地检查机构</button><button class="act" id="wb-ai-reset">清空对话</button></div>
      <div class="wb-chat" id="wb-chat" aria-live="polite"></div>
      <label for="wb-prompt">描述需要的操作</label><textarea id="wb-prompt" placeholder="例如：计算选中铰点的速度和加速度；把所选杆长改为 80 mm。"></textarea>
      <div class="btnrow"><button class="act primary" id="wb-send">发送</button><button class="act" id="wb-ai-cancel" disabled>停止</button></div>
      <div class="wb-preview" id="wb-preview" hidden><b>修改预览</b><div id="wb-preview-note" class="wb-message"></div><canvas id="wb-preview-canvas"></canvas><div class="btnrow"><button class="act primary" id="wb-preview-apply">应用修改</button><button class="act" id="wb-preview-discard">取消</button></div></div>
    </section>`;
  bench.append(panel);
  const menu=document.createElement('div');menu.id='wb-menu';menu.hidden=true;document.body.append(menu);
  const message=(text,error=false)=>{notice.textContent=text;notice.style.color=error?'var(--warn)':'#b5d6ff';};
  const safe=fn=>(...args)=>{try{return fn(...args);}catch(e){message(e.message,true);return null;}};
  const snapshot=()=>JSON.stringify(M.ensure(RIG.model));
  const idList=(kind,ids)=>ids.map(id=>M.index(RIG.model,kind,id));
  function pause(){RIG.playing=false;$w('rig-play').textContent='播放';}
  function editPose(){pause();if(RIG.demo)rigDemoStop();RIG.t=0;if(RIG.comp&&RIG.q0){const s=rigAnalyze(RIG.comp,0,RIG.q0);RIG.sol=s.ok?s:null;}else RIG.sol=null;}
  function openPanel(){if(window.MechStudio){window.MechStudio.show('properties',false);return;}panel.classList.toggle('wb-open',innerWidth<=1250);panel.classList.remove('wb-hidden');bench.classList.remove('wb-collapsed');requestAnimationFrame(onResizeAll);}
  function stash(){U.undo.push(snapshot());if(U.undo.length>80)U.undo.shift();U.redo=[];}
  function refreshModel(){RIG.sol=null;RIG.sweep=null;RIG.q0=null;RIG.t=0;rigRenderLoads();rigSyncDriverSelect(true);rigSolve();syncSelection();}
  function commit(m,label){
    M.ensure(m);MechJoints.assert(m);if(JSON.stringify(m)===snapshot()){message('模型未发生变化。');return;}
    stash();pause();RIG.model=rigNormModel(m);refreshModel();message(label+(RIG.err?' · 当前诊断：'+RIG.err:''),!!RIG.err);
  }
  function restore(from,to){if(!from.length)return;to.push(snapshot());pause();RIG.model=rigNormModel(JSON.parse(from.pop()));U.preview=null;$w('wb-preview').hidden=true;U.restoring=true;try{refreshModel();}finally{U.restoring=false;}message('已恢复模型；计算结果需要重新计算。');}
  function changed(){
    const s=snapshot();if(s!==U.signature){U.signature=s;U.revision++;invalidate();syncSelection();renderDimensions();refreshTargets();}
    $w('wb-revision').textContent='模型版本 '+U.revision;
  }
  function invalidate(){if(U.result){$w('wb-result-status').textContent='模型或计算设置已改变 · 待重新计算';$w('wb-result-status').classList.add('stale');}$w('wb-export').disabled=true;const report=$w('wb-report');if(report){report.setAttribute('data-stale','true');report.querySelector('h4').textContent='原结果已过期 · 请重新计算';}if($w('wb-report-export'))$w('wb-report-export').disabled=true;}
  const oldBackup=rigBackup;rigBackup=()=>{stash();oldBackup();};
  const oldSolve=rigSolve;rigSolve=function(){
    M.ensure(RIG.model);
    const jointError=MechJoints.error(RIG.model);
    const invalid=RIG.model.dimensions.find(d=>d.mode==='driving'&&Math.abs(M.measure(RIG.model,d)-d.value)>1e-3);
    let rejected=false;
    if((invalid||jointError)&&U.signature&&!U.restoring){RIG.model=rigNormModel(JSON.parse(U.signature));rejected=true;}
    const current=snapshot();
    if(!U.restoring&&U.signature&&current!==U.signature&&U.undo.at(-1)!==U.signature){U.undo.push(U.signature);if(U.undo.length>80)U.undo.shift();U.redo=[];}
    const r=oldSolve();changed();if(rejected)message(jointError||'本次编辑会破坏已有驱动尺寸，已恢复。请通过智能尺寸修改，或先移除尺寸约束。',true);return r;
  };
  const oldLoad=rigLoadModel;rigLoadModel=function(m){stash();U.points=[];U.links=[];U.redo=[];const r=oldLoad(M.ensure(m));changed();return r;};
  const oldTool=rigTool;rigTool=function(t){U.points=[];U.links=[];U.dimension=false;const r=oldTool(t);syncSelection();return r;};
  const oldDelete=rigDeletePoint;rigDeletePoint=function(i){const r=oldDelete(i);M.ensure(r);return r;};
  $w('rig-undo').addEventListener('click',e=>{e.stopImmediatePropagation();restore(U.undo,U.redo);},true);
  $w('wb-redo').onclick=()=>restore(U.redo,U.undo);
  function bind(id,fn){$w(id).addEventListener('click',safe(fn));}
  bind('wb-toggle',()=>{if(innerWidth<=1250)panel.classList.toggle('wb-open');else{panel.classList.toggle('wb-hidden');bench.classList.toggle('wb-collapsed');}requestAnimationFrame(onResizeAll);});
  bind('wb-close',()=>{panel.classList.remove('wb-open');if(innerWidth>1250){panel.classList.add('wb-hidden');bench.classList.add('wb-collapsed');}requestAnimationFrame(onResizeAll);});
  bind('wb-select',()=>{rigTool('select');rigDraw(rigMain);});
  bind('wb-dimension',()=>{if(RIG.tool!=='select'){rigTool('select');}U.dimension=!U.dimension;$w('wb-dimension').classList.toggle('wb-dim-active',U.dimension);openPanel();$w('wb-dim-section').scrollIntoView({block:'nearest'});message('选择一根杆或两个铰点。夹角请选择两根杆，第一根为参考方向。');});
  bind('wb-open-results',()=>{openPanel();$w('wb-analysis-section').scrollIntoView({block:'start'});useSelection();});
  function selected(kind){return (kind==='points'?U.points:U.links).filter(id=>RIG.model[kind].some(x=>x.id===id));}
  function syncSelection(){
    U.points=selected('points');U.links=selected('links');
    if(RIG.tool==='select'){RIG.selPts=idList('points',U.points);RIG.selLink=U.links.length?M.index(RIG.model,'links',U.links[0]):-1;RIG.hiLink=RIG.selLink;}
    const box=$w('wb-selection');box.replaceChildren();
    for(const [kind,ids]of [['points',U.points],['links',U.links]])for(const id of ids){const p=document.createElement('span');p.className='wb-pill';p.textContent=(kind==='points'?'P':'L')+(M.index(RIG.model,kind,id)+1);box.append(p);}
    if(!box.childNodes.length)box.textContent='未选择对象';
    const split=$w('wb-split-link');split.replaceChildren();let info='';
    if(U.points.length===1){const i=M.index(RIG.model,'points',U.points[0]),owners=rigOwnerLinks(i),p=RIG.model.points[i];
      info=`P${i+1} · ${p.ground?'固定铰支座':'活动铰'}\n连接：${owners.map(i=>'L'+(i+1)).join('、')||'无'}\n`;
      const frames=owners.filter(j=>RIG.model.links[j].pts.every(p=>RIG.model.points[p].ground)).length;
      const moving=owners.length-frames;const pairs=p.ground?moving:Math.max(0,moving-1);
      info+=`${p.jointType==='compound'?'已启用复合铰链':'普通铰点'} · 转动副：${pairs} 个`;
      for(const j of owners)split.add(new Option('L'+(j+1),RIG.model.links[j].id));
    }else info='先选铰点可查看连接构件；合并时第一选中点为目标。';
    $w('wb-joint-info').textContent=info;
    $w('wb-dimension').classList.toggle('wb-dim-active',U.dimension);
    fillDimension();
  }
  function dimensionSpec(){
    const kind=$w('wb-dim-kind').value;let points=[];
    if(kind==='angle'){
      if(U.links.length!==2)throw Error('有向夹角需要选择两根杆。');
      const ls=idList('links',U.links).map(i=>RIG.model.links[i]);if(ls.some(l=>l.pts.length!==2))throw Error('首版夹角工具请选择两点杆。');
      points=ls.flatMap(l=>l.pts.map(i=>RIG.model.points[i].id));
    }else if(U.points.length===2)points=U.points.slice();
    else if(U.links.length===1){const l=RIG.model.links[M.index(RIG.model,'links',U.links[0])];if(l.pts.length!==2)throw Error('多点构件请直接选择需要测量的两个点。');points=l.pts.map(i=>RIG.model.points[i].id);}
    else throw Error('请选择一根两点杆或两个铰点。');
    const raw=$w('wb-dim-value').value;
    return {kind,points,mode:$w('wb-dim-mode').value,value:raw.trim()===''?NaN:Number(raw)};
  }
  function fillDimension(){try{const d=dimensionSpec();$w('wb-dim-value').value=+M.measure(RIG.model,d).toFixed(4);}catch{$w('wb-dim-value').value='';}}
  $w('wb-dim-kind').onchange=fillDimension;$w('wb-dim-mode').onchange=()=>{$w('wb-dim-value').disabled=$w('wb-dim-mode').value==='reference';};
  bind('wb-dim-apply',()=>{editPose();commit(M.dimension(RIG.model,dimensionSpec()),'尺寸已应用；其他杆长和固定点保持。');});
  function renderDimensions(){
    const box=$w('wb-dim-list');box.replaceChildren();
    for(const d of RIG.model.dimensions){const row=document.createElement('div');row.className='wb-dim-item';const text=document.createElement('span');text.textContent=`${d.mode==='driving'?'驱动':'参考'} · ${d.kind==='angle'?'夹角':d.kind==='horizontal'?'Δx':d.kind==='vertical'?'Δy':'距离'} ${M.measure(RIG.model,d).toFixed(2)} ${d.kind==='angle'?'°':'mm'}`;const b=document.createElement('button');b.className='act';b.textContent='移除';b.onclick=safe(()=>{const m=M.clone(RIG.model);m.dimensions=m.dimensions.filter(x=>x.id!==d.id);commit(m,'已移除尺寸约束。');});row.append(text,b);box.append(row);}
  }
  bind('wb-merge',()=>{commit(MechJoints.merge(RIG.model,U.points,M),'已通过复合铰链工具合并连接。');});
  bind('wb-cross',()=>{commit(MechJoints.intersect(RIG.model,U.links,M),'已在交点显式启用复合铰链。');});
  bind('wb-split',()=>{if(U.points.length!==1)throw Error('请选择一个共用铰点。');commit(M.split(RIG.model,U.points[0],$w('wb-split-link').value),'已拆出连接，新铰点与原点重合，可选点后拖动。');});
  bind('wb-clear-selection',()=>{U.points=[];U.links=[];syncSelection();rigDraw(rigMain);});
  const grounding=(kind,on)=>commit(M.ground(RIG.model,kind,selected(kind),on),on?'已设置固定约束。':'已取消所选固定约束。');
  for(const [id,kind,on] of [['wb-fixed','points',true],['wb-free','points',false],['wb-frame','links',true],['wb-unframe','links',false]])bind(id,()=>grounding(kind,on));
  for(const [id,kind,on] of [['rig-ground-sel','points',true],['rig-unground-sel','points',false],['rig-ground-link','links',true],['rig-unground-link','links',false]]){
    $w(id).addEventListener('click',e=>{e.stopImmediatePropagation();safe(()=>grounding(kind,on))();},true);
  }
  $w('rig-ground-sel').textContent='批量固定铰点';$w('rig-unground-sel').textContent='取消所选固定铰';
  const cv=$w('rig-canvas');
  function world(e){const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left-rigMain.ox)/rigMain.scale,y:(rigMain.oy-(e.clientY-r.top))/rigMain.scale};}
  function linkHits(e){const p=world(e),tol=10/rigMain.scale;return RIG.model.links.map((l,i)=>({l,i})).filter(({l})=>l.pts.slice(1).some((p1,k)=>{const a=RIG.model.points[l.pts[k]],b=RIG.model.points[p1],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<tol;})).map(x=>x.i);}
  function pick(ids,id,add){if(!add)return[id];return ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];}
  cv.addEventListener('mousedown',e=>{
    if(e.button!==0||RIG.tool!=='select')return;
    if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!U.dimension&&$w('wb-filter').value==='all'&&rigHitPoint(e)<0&&rigHitHandle(e)){editPose();return;}
    e.stopImmediatePropagation();e.preventDefault();menu.hidden=true;editPose();rigDraw(rigMain);
    const w=world(e),filter=$w('wb-filter').value,pi=filter==='links'?-1:rigHitPoint(e),hits=filter==='points'?[]:linkHits(e);
    const add=e.ctrlKey||e.metaKey||U.dimension;
    if(e.shiftKey){U.box={start:w,end:w,add:e.ctrlKey||e.metaKey};return;}
    if(pi>=0){const id=RIG.model.points[pi].id;U.points=pick(U.points,id,add);if(!add)U.links=[];syncSelection();
      if(!add&&!RIG.model.points[pi].ground)U.drag={kind:'point',id,original:M.clone(RIG.model),start:w,moved:false};
    }else if(hits.length){let li=hits[0];if(e.altKey){const prev=U.links.length?RIG.model.links.findIndex(l=>l.id===U.links[0]):-1;li=hits[(hits.indexOf(prev)+1)%hits.length];}
      U.links=pick(U.links,RIG.model.links[li].id,add);if(!add)U.points=[];syncSelection();
    }else{if(!add){U.points=[];U.links=[];syncSelection();}U.drag={kind:'pan',x:e.clientX,y:e.clientY,center:{...RIG.editCenter}};}
    rigDraw(rigMain);
  },true);
  cv.addEventListener('mousemove',e=>{
    if(U.box){e.stopImmediatePropagation();U.box.end=world(e);rigDraw(rigMain);return;}
    if(!U.drag)return;e.stopImmediatePropagation();const d=U.drag;
    if(d.kind==='pan'){RIG.editCenter={x:d.center.x-(e.clientX-d.x)/rigMain.scale,y:d.center.y+(e.clientY-d.y)/rigMain.scale};rigDraw(rigMain);return;}
    const w=world(e);if($w('rig-snap').checked){w.x=Math.round(w.x/5)*5;w.y=Math.round(w.y/5)*5;}
    if(Math.hypot(w.x-d.start.x,w.y-d.start.y)>1/rigMain.scale)d.moved=true;
    if(!d.moved)return;
    try{const next=d.original.dimensions.some(x=>x.mode==='driving')?M.geometry(d.original,d.original.dimensions,{id:d.id,...w}):M.clone(d.original);
      if(!d.original.dimensions.some(x=>x.mode==='driving'))Object.assign(next.points[M.index(next,'points',d.id)],w);
      RIG.model=rigNormModel(next);RIG.sol=null;d.valid=true;message('拖动编辑中；松开保存为一个撤销步骤。');
    }catch(err){message(err.message,true);}rigDraw(rigMain);
  },true);
  function endGesture(){
    if(U.box){const b=U.box;U.box=null;const inside=p=>p.x>=Math.min(b.start.x,b.end.x)&&p.x<=Math.max(b.start.x,b.end.x)&&p.y>=Math.min(b.start.y,b.end.y)&&p.y<=Math.max(b.start.y,b.end.y);const f=$w('wb-filter').value;
      if(!b.add){U.points=[];U.links=[];}if(f!=='links')U.points=[...new Set([...U.points,...RIG.model.points.filter(inside).map(p=>p.id)])];
      if(f!=='points')U.links=[...new Set([...U.links,...RIG.model.links.filter(l=>l.pts.every(i=>inside(RIG.model.points[i]))).map(l=>l.id)])];syncSelection();rigDraw(rigMain);
    }
    if(U.drag){const d=U.drag;U.drag=null;if(d.kind==='point'&&d.moved&&d.valid){U.undo.push(JSON.stringify(d.original));U.redo=[];refreshModel();}else rigDraw(rigMain);}
  }
  window.addEventListener('mouseup',endGesture,true);
  cv.addEventListener('mouseleave',()=>{if(U.drag||U.box)endGesture();},true);
  const oldDraw=rigDraw;rigDraw=function(sc){if(RIG.model)M.ensure(RIG.model);oldDraw(sc);if(sc!==rigMain||!RIG.model)return;drawOverlay(sc);};
  function drawOverlay(sc){
    const ctx=sc.ctx,m=RIG.model,live=RIG.comp&&RIG.sol?.ok;
    const pos=id=>{const i=M.index(m,'points',id);return live?rigPointWorld(RIG.comp,RIG.sol,i):m.points[i];};
    ctx.save();
    for(const id of selected('links')){const l=m.links[M.index(m,'links',id)];for(let i=1;i<l.pts.length;i++){const a=pos(m.points[l.pts[i-1]].id),b=pos(m.points[l.pts[i]].id);sc.line(a.x,a.y,b.x,b.y,'rgba(77,163,255,.6)',9);}}
    for(const id of selected('points')){const p=pos(id);ctx.strokeStyle='#4da3ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sc.X(p.x),sc.Y(p.y),12,0,Math.PI*2);ctx.stroke();}
    for(const d of m.dimensions){try{const pts=d.points.map(pos);const copy={points:pts.map((p,i)=>({...p,id:d.points[i]}))};const v=M.measure(copy,d);const color=d.mode==='driving'?'#ffb454':'#91a7c5';const a=pts[0],b=pts[1];
      if(d.kind!=='angle'){const dx=sc.X(b.x)-sc.X(a.x),dy=sc.Y(b.y)-sc.Y(a.y),len=Math.hypot(dx,dy)||1,nx=-dy/len*25,ny=dx/len*25;ctx.strokeStyle=color;ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(sc.X(a.x),sc.Y(a.y));ctx.lineTo(sc.X(a.x)+nx,sc.Y(a.y)+ny);ctx.lineTo(sc.X(b.x)+nx,sc.Y(b.y)+ny);ctx.lineTo(sc.X(b.x),sc.Y(b.y));ctx.stroke();ctx.setLineDash([]);ctx.font='11px Segoe UI';ctx.fillStyle=color;ctx.fillText(`${d.mode==='reference'?'参考 ':''}${d.kind==='horizontal'?'Δx ':d.kind==='vertical'?'Δy ':''}${v.toFixed(2)} mm`,(sc.X(a.x)+sc.X(b.x))/2+nx+3,(sc.Y(a.y)+sc.Y(b.y))/2+ny-4);}
      else sc.label((a.x+b.x)/2,(a.y+b.y)/2,`∠ ${v.toFixed(2)}°`,color,-25,11);
    }catch{}}
    if(U.box){const a=U.box.start,b=U.box.end;ctx.fillStyle='#4da3ff20';ctx.strokeStyle='#4da3ff';ctx.fillRect(sc.X(a.x),sc.Y(a.y),sc.X(b.x)-sc.X(a.x),sc.Y(b.y)-sc.Y(a.y));ctx.strokeRect(sc.X(a.x),sc.Y(a.y),sc.X(b.x)-sc.X(a.x),sc.Y(b.y)-sc.Y(a.y));}
    ctx.restore();
  }
  window.addEventListener('keydown',e=>{
    if(!$w('panel-rig').classList.contains('active')||document.querySelector('dialog[open]'))return;
    const typing=/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable;
    if(typing)return;
    const k=e.key.toLowerCase();
    if((e.ctrlKey||e.metaKey)&&['z','y'].includes(k)){e.preventDefault();e.stopImmediatePropagation();restore(k==='y'||e.shiftKey?U.redo:U.undo,k==='y'||e.shiftKey?U.undo:U.redo);}
    else if(k==='d'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopImmediatePropagation();$w('wb-dimension').click();}
    else if(k==='escape'){U.points=[];U.links=[];U.dimension=false;U.box=null;menu.hidden=true;syncSelection();}
    else if((k==='delete'||k==='backspace')&&RIG.tool==='select'){
      e.preventDefault();e.stopImmediatePropagation();safe(()=>{if(!U.points.length&&!U.links.length)return;const m=M.clone(RIG.model);stash();
        // Delete links first with all dependent indices remapped, then points using the corrected legacy routine.
        const dead=new Set(idList('links',U.links)),keep=m.links.map((_,i)=>i).filter(i=>!dead.has(i)),remap=i=>i<0?i:keep.indexOf(i);
        m.links=keep.map(i=>m.links[i]);m.prisms=m.prisms.filter(p=>!dead.has(p.link)&&!dead.has(p.guide)).map(p=>({...p,link:remap(p.link),guide:p.guide==null?-1:remap(p.guide)}));m.gears=m.gears.filter(g=>!dead.has(g.a)&&!dead.has(g.b)).map(g=>({...g,a:remap(g.a),b:remap(g.b)}));m.loads=m.loads.filter(l=>!dead.has(l.link)).map(l=>({...l,link:remap(l.link)}));m.drivers=m.drivers.map(d=>({...d,link:remap(d.link)}));
        RIG.model=rigNormModel(m);idList('points',U.points).sort((a,b)=>b-a).forEach(rigDeletePoint);U.points=[];U.links=[];pause();refreshModel();message('已删除所选对象及其相关约束，可撤销。');})();
    }
  },true);
  cv.addEventListener('contextmenu',e=>{e.preventDefault();menu.replaceChildren();for(const [label,id]of [['智能尺寸','wb-dimension'],['合并共用铰点','wb-merge'],['固定所选铰点','wb-fixed'],['取消固定铰','wb-free'],['选择计算结果','wb-open-results']]){const b=document.createElement('button');b.className='act';b.textContent=label;b.onclick=()=>{menu.hidden=true;$w(id).click();};menu.append(b);}menu.style.left=Math.min(e.clientX,innerWidth-180)+'px';menu.style.top=Math.min(e.clientY,innerHeight-220)+'px';menu.hidden=false;});
  document.addEventListener('mousedown',e=>{if(!menu.contains(e.target))menu.hidden=true;});
  function refreshTargets(){const sel=$w('wb-target'),old=sel.value;sel.replaceChildren();for(const [kind,prefix]of [['points','P'],['links','L']])RIG.model[kind].forEach((x,i)=>sel.add(new Option(prefix+(i+1),x.id)));if([...sel.options].some(o=>o.value===old))sel.value=old;setMetrics();if(RIG.comp)$w('wb-duration').value=+RIG.comp.period.toFixed(5);}
  function setMetrics(){const point=RIG.model.points.some(p=>p.id===$w('wb-target').value);for(const input of $w('wb-metrics').querySelectorAll('input')){const allowed=point?!['angular','drive'].includes(input.value):['angular','drive'].includes(input.value);input.disabled=!allowed;if(!allowed)input.checked=false;}if(!$w('wb-metrics').querySelector('input:checked'))$w('wb-metrics').querySelector(`input[value="${point?'velocity':'angular'}"]`).checked=true;invalidate();}
  $w('wb-target').onchange=setMetrics;
  function useSelection(){const id=U.points[0]||U.links[0];if(id){$w('wb-target').value=id;setMetrics();}else message('先选一个铰点或构件，也可直接使用分析对象下拉框。');}
  bind('wb-use-selection',useSelection);
  const readRequest=()=>({target:$w('wb-target').value,metrics:[...$w('wb-metrics').querySelectorAll('input:checked:not(:disabled)')].map(x=>x.value),range:$w('wb-range').value,duration:Number($w('wb-duration').value),samples:181,time:RIG.t||0});
  const requestKey=r=>JSON.stringify({...r,time:r.range==='scan'?0:r.time});
  function calculate(request=readRequest()){
    pause();const result=MechAnalysis.compute(RIG.model,request,engine);$w('wb-target').value=request.target;setMetrics();for(const cb of $w('wb-metrics').querySelectorAll('input'))cb.checked=!cb.disabled&&request.metrics.includes(cb.value);$w('wb-range').value=request.range==='scan'?'scan':'current';if(request.duration>0)$w('wb-duration').value=request.duration;result.report=MechReport.explain(result,RIG.model);U.result=result;U.resultSignature=snapshot();U.requestSignature=requestKey(request);renderResult();return result;
  }
  bind('wb-calculate',()=>{message('正在计算所选结果…');setTimeout(safe(()=>{calculate();message('计算完成。');}),20);});
  for(const id of ['wb-metrics','wb-range','wb-duration'])$w(id).addEventListener('change',invalidate);
  function renderResult(){const r=U.result,box=$w('wb-results');box.replaceChildren();const report=document.createElement('section');report.className='result-narrative';report.id='wb-report';const title=document.createElement('h4');title.textContent='文字结论与数据解释';report.append(title);for(const text of r.report.lines){const p=document.createElement('p');p.textContent=text;report.append(p);}box.append(report);const reportButton=document.createElement('button');reportButton.id='wb-report-export';reportButton.className='act report-export';reportButton.textContent='下载文字报告';reportButton.onclick=()=>{if($w('wb-export').disabled||snapshot()!==U.resultSignature){message('结果已过期，请重新计算。',true);return;}const url=URL.createObjectURL(new Blob(['\ufeff'+r.report.text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='机构计算报告.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};box.append(reportButton);const table=document.createElement('table');const head=table.insertRow();for(const text of ['结果 / 单位',r.range==='scan'?'最小值 @ s':'当前值',...(r.range==='scan'?['最大值 @ s']:[])]){const th=document.createElement('th');th.textContent=text;head.append(th);}
    const f=n=>Number(n).toPrecision(5);for(const s of r.series){const row=table.insertRow();row.insertCell().textContent=`${s.label} (${s.unit})`;row.insertCell().textContent=r.range==='scan'?`${f(s.min.value)} @ ${f(s.min.t)}`:f(s.values[0].value);if(r.range==='scan')row.insertCell().textContent=`${f(s.max.value)} @ ${f(s.max.t)}`;}box.append(table);
    if(r.range==='scan'){const d=document.createElement('details');d.className='result-samples';const h=document.createElement('summary');h.textContent='逐时刻数据（'+r.samples+' 行）';d.append(h);const sc=document.createElement('div');sc.className='result-sample-scroll';const t=document.createElement('table'),head=t.insertRow();for(const label of ['时间 s',...r.series.map(s=>s.label+' / '+s.unit),'状态']){const th=document.createElement('th');th.textContent=label;head.append(th);}const failed=new Map(r.failures.map(s=>[s.t,s.error]));r.series[0].values.forEach((v,i)=>{const row=t.insertRow();for(const value of [f(v.t),...r.series.map(s=>s.values[i].value===null?'—':f(s.values[i].value)),failed.has(v.t)?'失败：'+failed.get(v.t):'有效'])row.insertCell().textContent=value;});sc.append(t);d.append(sc);box.append(d);}
    $w('wb-result-status').textContent=`${r.targetLabel} · ${r.range==='scan'?r.samples+' 个采样点 · 采样极值':'t = '+r.time.toFixed(4)+' s'}${r.failures.length?' · '+r.failures.length+' 个失败样本（曲线断开）':''}`;$w('wb-result-status').classList.remove('stale');
    if(r.failures.length){const p=document.createElement('p');p.className='wb-message error';p.textContent='首个失败：t='+r.failures[0].t.toFixed(4)+' s，'+r.failures[0].error;box.append(p);}
    const sel=$w('wb-series');sel.replaceChildren();for(const s of r.series)sel.add(new Option(s.label+' ('+s.unit+')',s.key));sel.hidden=r.range!=='scan';$w('wb-chart').hidden=r.range!=='scan';$w('wb-export').disabled=false;drawChart();
  }
  function drawChart(){const r=U.result;if(!r||r.range!=='scan')return;const s=r.series.find(s=>s.key===$w('wb-series').value)||r.series[0],canvas=$w('wb-chart'),ctx=canvas.getContext('2d');canvas.width=560;canvas.height=260;ctx.clearRect(0,0,560,260);let lo=s.min.value,hi=s.max.value;if(hi-lo<1e-8){lo-=1;hi+=1;}const x=t=>55+480*t/r.duration,y=v=>215-180*(v-lo)/(hi-lo);ctx.strokeStyle='#33445d';ctx.beginPath();ctx.moveTo(55,25);ctx.lineTo(55,215);ctx.lineTo(535,215);ctx.stroke();ctx.fillStyle='#9db1cf';ctx.font='18px Segoe UI';ctx.fillText(hi.toPrecision(3),4,25);ctx.fillText(lo.toPrecision(3),4,215);ctx.fillText('0',55,245);ctx.fillText(r.duration.toFixed(3)+' s',440,245);ctx.strokeStyle='#4da3ff';ctx.lineWidth=2.5;ctx.beginPath();let pen=false;for(const v of s.values){if(v.value==null){pen=false;continue;}if(pen)ctx.lineTo(x(v.t),y(v.value));else ctx.moveTo(x(v.t),y(v.value));pen=true;}ctx.stroke();}
  $w('wb-series').onchange=drawChart;
  bind('wb-export',()=>{if(!U.result||snapshot()!==U.resultSignature||$w('wb-export').disabled)throw Error('结果已过期，请重新计算。');const r=U.result;const quote=s=>'"'+String(s).replaceAll('"','""')+'"';const lines=[['time_s',...r.series.map(s=>s.label+' ['+s.unit+']'),'status'].map(quote).join(',')];r.series[0].values.forEach((v,i)=>lines.push([v.t,...r.series.map(s=>s.values[i].value??''),r.failures.find(f=>f.t===v.t)?.error||'ok'].map(quote).join(',')));const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='mech-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  // AI tools operate on stable IDs and produce drafts, never execute model-supplied code.
  function diagnose(){const c=rigCompile(M.clone(RIG.model));if(!c.ok)return{ok:false,error:c.err};const d=rigDofDiagnose(c,RIG.model);return{ok:!d.err,degreesOfFreedom:c.dof,coordinates:c.n,constraints:c.m,error:RIG.err||d.err||null,hints:d.hints};}
  function context(){M.ensure(RIG.model);return{revision:U.revision,units:{length:'mm',time:'s',force:'N',torque:'N·m'},selection:{points:U.points,links:U.links},model:{points:RIG.model.points.map((p,i)=>({...p,label:'P'+(i+1)})),links:RIG.model.links.map((l,i)=>({...l,label:'L'+(i+1),points:l.pts.map(p=>RIG.model.points[p].id)})),drivers:RIG.model.drivers,dimensions:RIG.model.dimensions,prisms:RIG.model.prisms,gears:RIG.model.gears,loads:RIG.model.loads,useGravity:RIG.model.useGravity,useInertia:RIG.model.useInertia,useFriction:RIG.model.useFriction},diagnosis:diagnose(),presets:RIG_PRESETS.map((p,i)=>({index:i,name:p.name})),results:U.result&&snapshot()===U.resultSignature&&!$w('wb-export').disabled?summary(U.result):null};}
  function summary(r){return{target:r.targetLabel,range:r.range,time:r.time,duration:r.duration,samples:r.samples,failures:r.failures.slice(0,5),extrema:r.extrema,series:r.series.map(s=>({label:s.label,unit:s.unit,min:s.min,max:s.max,current:r.range==='current'?s.values[0]:undefined}))};}
  function preview(model,label){MechJoints.assert(model);U.preview={model:M.ensure(model),signature:snapshot(),label};$w('wb-preview').hidden=false;$w('wb-preview-note').textContent=label+'\n橙色为修改后，灰色为当前模型。';drawPreview();openPanel();if($w('wb-preview').closest('details'))$w('wb-preview').closest('details').open=true;$w('wb-preview').scrollIntoView({block:'nearest'});return{status:'awaiting_user_apply',message:'草稿已生成，尚未应用。用户可预览并应用。'};}
  function drawPreview(){const cv=$w('wb-preview-canvas'),ctx=cv.getContext('2d');cv.width=560;cv.height=280;ctx.clearRect(0,0,560,280);const both=[...RIG.model.points,...U.preview.model.points];if(!both.length)return;const xs=both.map(p=>p.x),ys=both.map(p=>p.y),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),scale=Math.min(500/Math.max(40,xmax-xmin),220/Math.max(40,ymax-ymin)),X=x=>280+(x-(xmin+xmax)/2)*scale,Y=y=>140-(y-(ymin+ymax)/2)*scale;
    for(const [m,color]of [[RIG.model,'#536177'],[U.preview.model,'#ffb454']]){ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=3;for(const l of m.links){ctx.beginPath();l.pts.forEach((p,i)=>{const q=m.points[p];if(i)ctx.lineTo(X(q.x),Y(q.y));else ctx.moveTo(X(q.x),Y(q.y));});ctx.stroke();}m.points.forEach(p=>{ctx.beginPath();ctx.arc(X(p.x),Y(p.y),p.ground?5:3,0,2*Math.PI);ctx.fill();});}}
  bind('wb-preview-apply',()=>{if(!U.preview)return;if(snapshot()!==U.preview.signature){U.preview=null;$w('wb-preview').hidden=true;throw Error('模型已经改变，旧 AI 草稿已取消，请重新提出修改。');}const p=U.preview;U.preview=null;$w('wb-preview').hidden=true;commit(p.model,p.label);bubble('修改已应用：'+p.label,'tool');});
  bind('wb-preview-discard',()=>{U.preview=null;$w('wb-preview').hidden=true;bubble('已取消草稿，模型未修改。','tool');});
  function runTool(a){
    if(!a||typeof a.action!=='string')throw Error('AI 工具参数无效。');
    const ids=Array.isArray(a.ids)?a.ids:[];
    switch(a.action){
      case 'inspect':return context();
      case 'diagnose':return diagnose();
      case 'preset':{if(!Number.isInteger(a.preset)||!RIG_PRESETS[a.preset])throw Error('机构预设编号无效。');return preview(RIG_PRESETS[a.preset].make(),'载入 '+RIG_PRESETS[a.preset].name+'，将替换当前模型。');}
      case 'length':{if(ids.length!==1)throw Error('修改杆长需要一个构件 ID。');const l=RIG.model.links[M.index(RIG.model,'links',ids[0])];if(l.pts.length!==2)throw Error('首版只支持修改两点杆长度。');return preview(M.dimension(RIG.model,{kind:'distance',points:l.pts.map(i=>RIG.model.points[i].id),mode:'driving',value:a.value}),'将所选杆长设为 '+a.value+' mm。');}
      case 'ground':{if(typeof a.enabled!=='boolean')throw Error('固定状态必须为布尔值。');return preview(M.ground(RIG.model,'points',ids,a.enabled),(a.enabled?'固定':'取消固定')+' '+ids.length+' 个铰点。');}
      case 'merge':return preview(MechJoints.merge(RIG.model,ids,M),'合并 '+ids.length+' 个铰点，以第一个点为目标。');
      case 'analyze':{if(ids.length!==1)throw Error('分析需要指定一个对象 ID。');$w('wb-target').value=ids[0];setMetrics();if(!Array.isArray(a.metrics))throw Error('计算项目无效。');for(const cb of $w('wb-metrics').querySelectorAll('input'))cb.checked=a.metrics.includes(cb.value);$w('wb-range').value=a.range==='scan'?'scan':'current';if(a.duration!=null)$w('wb-duration').value=a.duration;const r=calculate({...readRequest(),target:ids[0],metrics:a.metrics});openPanel();return summary(r);}
      default:throw Error('不支持的 AI 操作：'+a.action);
    }
  }
  function bubble(text,role='assistant'){const el=document.createElement('div');el.className='wb-bubble '+role;el.textContent=text;$w('wb-chat').append(el);$w('wb-chat').scrollTop=$w('wb-chat').scrollHeight;return el;}
  bind('wb-local-diagnose',()=>{const d=diagnose();bubble(d.error||`结构检查：自由度 ${d.degreesOfFreedom}，约束数 ${d.constraints}，广义坐标数 ${d.coordinates}。`,'tool');if(d.hints?.length)bubble(d.hints.join('\n'),'tool');});
  let aiController=null,aiHistory=[];
  async function checkAI(){
    $w('wb-ai-status').textContent='GitHub Pages 分享版：建模、计算和本地检查可用。在线 AI 需要单独部署后端服务。';
    $w('wb-send').disabled=true;
    $w('wb-prompt').disabled=true;
    $w('wb-prompt').placeholder='在线 AI 暂未接入，可先使用上方“本地检查机构”。';
  }
  bind('wb-ai-reset',()=>{aiController?.abort();aiHistory=[];$w('wb-chat').replaceChildren();U.preview=null;$w('wb-preview').hidden=true;});
  bind('wb-ai-cancel',()=>aiController?.abort());
  async function send(){
    const prompt=$w('wb-prompt').value.trim();if(!prompt||U.busy)return;
    if(location.protocol==='file:'){bubble('请通过“启动学习台.cmd”打开本地服务，并按 README 配置 AI。');return;}
    U.busy=true;$w('wb-send').disabled=true;$w('wb-ai-cancel').disabled=false;aiController=new AbortController();
    bubble(prompt,'user');$w('wb-prompt').value='';const base=snapshot();
    const input=[...aiHistory.slice(-12),{role:'user',content:prompt}];let finalText='';
    try{
      for(let round=0;round<5;round++){
        const res=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input,context:context()}),signal:aiController.signal});
        const body=await res.json();if(!res.ok)throw Error(body.error||'AI 服务请求失败。');
        const output=body.output||[],calls=output.filter(x=>x.type==='function_call');input.push(...output);
        const text=output.filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');if(text){bubble(text);finalText+=text+'\n';}
        if(!calls.length)break;
        for(const call of calls){let result;try{if(snapshot()!==base)throw Error('模型已在对话期间改变，本次操作已停止，请重新发送请求。');if(call.name!=='mech_action')throw Error('未知工具。');const args=JSON.parse(call.arguments);result=runTool(args);bubble(result.status==='awaiting_user_apply'?'AI 已生成修改预览，等待应用。':'已执行：'+args.action,'tool');}catch(e){result={error:e.message};bubble(e.message,'tool');}input.push({type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result)});}
        if(round===4)bubble('本次工具调用已达到上限。已完成的结果仍可查看。','tool');
      }
      aiHistory.push({role:'user',content:prompt},{role:'assistant',content:finalText||'已执行工具，请查看结果或待应用的修改预览。'});
    }catch(e){bubble(e.name==='AbortError'?'已停止本次请求。':e.message);}
    finally{U.busy=false;$w('wb-send').disabled=false;$w('wb-ai-cancel').disabled=true;aiController=null;}
  }
  $w('wb-send').onclick=send;
  $w('wb-prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send();}});
  // Expose a small reviewable interface for integration tests and future UI controls.
  window.MechWorkbench={state:U,context,runTool,commit,calculate,diagnose,select:(points=[],links=[])=>{U.points=points;U.links=links;syncSelection();rigDraw(rigMain);},undo:()=>restore(U.undo,U.redo),redo:()=>restore(U.redo,U.undo)};
  M.ensure(RIG.model);U.signature=snapshot();changed();refreshTargets();renderDimensions();syncSelection();pause();rigSolve();rigDraw(rigMain);checkAI();
  message('已启用多选、智能尺寸与按需计算。多构件共用铰点请使用独立复合铰链工具。Ctrl 增选，Shift 拖动框选，D 设置尺寸。');
  window.addEventListener('resize',drawChart);
})();
