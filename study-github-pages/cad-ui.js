(() => {
  'use strict';
  const $=id=>document.getElementById(id),cv=$('rig-canvas'),view=$('panel-rig').querySelector('.view'),toolbar=view.querySelector('.wb-toolbar');
  document.body.classList.add('cad');
  const settings={grid:true,endpoint:true,ortho:false},note=s=>$('wb-notice').textContent=s;
  const strip=document.createElement('div');strip.className='cad-ribbon';strip.innerHTML=`<div class="cad-ribbon-group"><button class="act" id="cad-new">新建</button><button class="act" id="cad-line">直线 L</button><button class="act" id="cad-text">文字建模</button></div><div class="cad-ribbon-group"><label><input id="cad-grid" type="checkbox" checked>网格</label><label><input id="cad-snap" type="checkbox" checked>端点捕捉</label><label><input id="cad-ortho" type="checkbox">正交 F8</label></div><span class="cad-units">毫米 · 秒 · 牛顿</span>`;
  toolbar.after(strip);
  const command=document.createElement('form');command.className='cad-command';command.innerHTML='<label for="cad-command">命令</label><input id="cad-command" autocomplete="off" spellcheck="false" placeholder="LINE 0,0 @100&lt;30　回车预览"><button class="act" type="submit">预览 ↵</button><output id="cad-coordinate">X 0.00　Y 0.00</output>';view.append(command);
  $('cad-line').onclick=()=>{rigTool('bar');note('直线：单击起点，再指定终点；可开启正交，或在命令栏输入精确坐标。');rigDraw(rigMain);};
  for(const [id,key] of [['cad-grid','grid'],['cad-snap','endpoint'],['cad-ortho','ortho']])$(id).onchange=()=>{settings[key]=$(id).checked;rigDraw(rigMain);};
  const dialog=document.createElement('dialog');dialog.id='cad-text-dialog';dialog.className='cad-dialog';dialog.innerHTML=`<div class="cad-dialog-head"><div><small>TEXT TO MECHANISM</small><h2>文字构建机构</h2></div><button class="act" id="cad-dialog-close">关闭 ×</button></div>
    <p>描述标准机构的尺寸，或逐行定义点、杆、固定端与驱动。先预览，确认后进入画布。</p>
    <label for="cad-text-mode">生成方式</label><select id="cad-text-mode"><option value="new">新建替换当前模型（可撤销）</option><option value="append">追加到当前模型</option></select>
    <div class="cad-examples"><button class="act" data-example="four">四杆描述</button><button class="act" data-example="slider">滑块描述</button><button class="act" data-example="points">逐点建模</button></div>
    <label for="cad-text-input">建模文字 / 指令</label><textarea id="cad-text-input" rows="5" spellcheck="false"></textarea>
    <div class="btnrow"><button class="act primary" id="cad-generate">生成预览</button><button class="act" id="cad-apply" disabled>应用到画布</button><button class="act" id="cad-discard">放弃草稿</button></div>
    <p id="cad-draft-message" role="status" aria-live="polite">本地规则建模，无需密钥。支持下方列出的格式；自由语义 AI 建模仍需后端。</p>
    <canvas id="cad-draft-canvas" width="700" height="260" aria-label="机构草稿预览"></canvas><div id="cad-draft-notes"></div>
    <details><summary>支持的语法与单位</summary><p>长度 mm，角度 °，转速 rpm。逗号分隔标准机构参数；逐点建模使用换行或分号。</p><pre>点 A 0,0 固定\n点 B 30,50\n杆 AB A B\n固定 A\n驱动 AB 60rpm\nLINE 0,0 @100&lt;30\nLINE 0,0 @100,0\n滑槽 L3 水平\n复合铰链 P1</pre><p>LINE 相同坐标自动共用铰点。新建草图需要补全约束和驱动后才能计算。输入不支持的描述会提示错误，不会猜测尺寸。</p></details>`;document.body.append(dialog);
  const examples={four:'创建四杆机构，曲柄30mm，连杆90mm，摇杆70mm，机架100mm，初始角60度，转速60rpm',slider:'创建曲柄滑块机构，曲柄50mm，连杆150mm，偏距0mm，初始角60度，转速60rpm',points:'点 A 0,0 固定\n点 B 40,60\n点 C 100,20\n杆 AB A B\n杆 BC B C\n驱动 AB 60rpm'};
  let draft=null;
  const signature=()=>JSON.stringify(MechEdit.ensure(RIG.model));
  function clearDraft(){draft=null;$('cad-apply').disabled=true;$('cad-draft-notes').replaceChildren();const c=$('cad-draft-canvas');c.getContext('2d').clearRect(0,0,c.width,c.height);}
  function showText(){if(!dialog.open)dialog.showModal();}
  function drawDraft(m){const c=$('cad-draft-canvas'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);if(!m.points.length)return;const xs=m.points.map(p=>p.x),ys=m.points.map(p=>p.y),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),scale=Math.min(620/Math.max(40,x1-x0),190/Math.max(40,y1-y0)),X=x=>350+(x-(x0+x1)/2)*scale,Y=y=>130-(y-(y0+y1)/2)*scale;ctx.lineWidth=3;ctx.strokeStyle='#75e1b4';for(const l of m.links){ctx.beginPath();l.pts.forEach((p,i)=>i?ctx.lineTo(X(m.points[p].x),Y(m.points[p].y)):ctx.moveTo(X(m.points[p].x),Y(m.points[p].y)));ctx.stroke();}ctx.font='13px sans-serif';m.points.forEach((p,i)=>{ctx.fillStyle=p.ground?'#ffcb7b':'#a8c9eb';ctx.beginPath();ctx.arc(X(p.x),Y(p.y),p.ground?6:4,0,Math.PI*2);ctx.fill();ctx.fillText('P'+(i+1),X(p.x)+8,Y(p.y)-9);});}
  function preview(result){MechJoints.assert(result.model);const m=MechEdit.ensure(result.model),c=rigCompile(MechEdit.clone(m));draft={model:m,signature:signature()};$('cad-apply').disabled=false;const ready=c.ok&&c.m===c.n;$('cad-draft-message').textContent=`草稿：${m.points.length} 个点、${m.links.length} 个构件、${m.prisms.length} 个移动副。`+(ready?'约束数量匹配；应用后可检查并计算。':'当前为待完善草图：'+(c.err||`约束数 ${c.m} / 坐标数 ${c.n}`));const list=$('cad-draft-notes');list.replaceChildren();for(const text of result.notes){const p=document.createElement('p');p.textContent=text;list.append(p);}drawDraft(m);showText();}
  function generate(text,append){clearDraft();try{preview(MechLanguage.build(text,RIG.model,{append}));}catch(e){$('cad-draft-message').textContent=e.message;showText();}}
  $('cad-text').onclick=showText;$('cad-dialog-close').onclick=()=>dialog.close();
  $('cad-text-input').value=examples.four;
  dialog.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{clearDraft();$('cad-text-mode').value='new';$('cad-text-input').value=examples[b.dataset.example];});
  $('cad-generate').onclick=()=>generate($('cad-text-input').value,$('cad-text-mode').value==='append');
  for(const id of ['cad-text-input','cad-text-mode'])$(id).addEventListener('input',clearDraft);
  $('cad-discard').onclick=()=>{clearDraft();$('cad-draft-message').textContent='草稿已放弃，画布未修改。';};
  $('cad-apply').onclick=()=>{if(!draft)return;if(draft.signature!==signature()){clearDraft();$('cad-draft-message').textContent='画布模型已改变，请重新生成草稿。';return;}const m=draft.model;RIG.barFrom=null;RIG.pending=null;RIG.skipClick=false;rigTool('select');MechWorkbench.select([],[]);MechWorkbench.commit(m,'文字建模已应用，可撤销；选择对象后进行计算。');clearDraft();dialog.close();MechStudio.show(null,false);requestAnimationFrame(()=>{onResizeAll();rigFitView();rigDraw(rigMain);});};
  $('cad-new').onclick=()=>{clearDraft();preview({model:{points:[],links:[],prisms:[],gears:[],drivers:[],loads:[],dimensions:[],useGravity:false,useInertia:true,useFriction:false,f:.1,rj:8},notes:['将清空当前画布，确认应用后可使用撤销恢复。']});};
  command.onsubmit=e=>{e.preventDefault();if(!$('cad-command').value.trim())return;generate($('cad-command').value,true);};
  $('cad-text-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('cad-generate').click();}});
  const originalWorld=rigToWorld;
  const originalHit=rigHitPoint;rigHitPoint=function(e){if(!settings.endpoint&&['bar','pt','pg','link'].includes(RIG.tool))return -1;return originalHit(e);};
  rigToWorld=function(e){const w=originalWorld(e);const r=cv.getBoundingClientRect(),raw={x:(e.clientX-r.left-rigMain.ox)/rigMain.scale,y:(rigMain.oy-e.clientY+r.top)/rigMain.scale};let snap=null;if(settings.endpoint&&['bar','pt','pg','link'].includes(RIG.tool)){let d=12/rigMain.scale;for(const p of RIG.model.points){const dd=Math.hypot(p.x-raw.x,p.y-raw.y);if(dd<d){snap=p;d=dd;}}}if(snap){w.x=snap.x;w.y=snap.y;}else if(settings.ortho&&RIG.tool==='bar'&&RIG.barFrom!=null){const p=RIG.model.points[RIG.barFrom];if(p){if(Math.abs(w.x-p.x)>=Math.abs(w.y-p.y))w.y=p.y;else w.x=p.x;}}return w;};
  let drawFrame=0;
  cv.addEventListener('mousemove',e=>{const w=rigToWorld(e);$('cad-coordinate').textContent='X '+w.x.toFixed(2)+'　Y '+w.y.toFixed(2);if(!drawFrame)drawFrame=requestAnimationFrame(()=>{drawFrame=0;rigDraw(rigMain);});});
  const oldDraw=rigDraw;rigDraw=function(sc){oldDraw(sc);if(sc!==rigMain||!RIG.cursor||!['bar','pt','pg','link'].includes(RIG.tool))return;const ctx=sc.ctx,p=RIG.cursor,x=sc.X(p.x),y=sc.Y(p.y);ctx.save();ctx.strokeStyle='#a0b6cd88';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-18,y);ctx.lineTo(x+18,y);ctx.moveTo(x,y-18);ctx.lineTo(x,y+18);ctx.stroke();if(RIG.barFrom!=null){const a=RIG.model.points[RIG.barFrom];if(a){const dx=p.x-a.x,dy=p.y-a.y;ctx.fillStyle='#e7d1a5';ctx.font='12px monospace';ctx.fillText(Math.hypot(dx,dy).toFixed(2)+' mm / '+(Math.atan2(dy,dx)*180/Math.PI).toFixed(1)+'°',x+20,y-18);}}ctx.restore();};
  function drawGrid(sc){if(!settings.grid)return;const ctx=sc.ctx,step=5*Math.pow(2,Math.max(0,Math.ceil(Math.log2(28/(5*sc.scale))))),px=step*sc.scale;ctx.save();ctx.strokeStyle='#7190b414';ctx.lineWidth=1;ctx.beginPath();for(let x=((sc.ox%px)+px)%px;x<sc.w;x+=px){ctx.moveTo(x,0);ctx.lineTo(x,sc.h);}for(let y=((sc.oy%px)+px)%px;y<sc.h;y+=px){ctx.moveTo(0,y);ctx.lineTo(sc.w,y);}ctx.stroke();ctx.strokeStyle='#8ab2d436';ctx.beginPath();ctx.moveTo(sc.ox,0);ctx.lineTo(sc.ox,sc.h);ctx.moveTo(0,sc.oy);ctx.lineTo(sc.w,sc.oy);ctx.stroke();ctx.restore();}
  window.addEventListener('keydown',e=>{if(!$('panel-rig').classList.contains('active')||e.target.matches('input,textarea,select')||dialog.open)return;if(e.key==='F8'){e.preventDefault();$('cad-ortho').checked=!settings.ortho;$('cad-ortho').onchange();}else if(e.key.toLowerCase()==='l'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();$('cad-line').click();}});
  const label=$('rig-wrap').querySelector('.studio-canvas-label');label.innerHTML='<span>PARAMETRIC MECHANISM CAD</span><b>机构草图</b><small>画图 · 约束 · 计算</small>';
  window.MechCAD={settings,drawGrid,generate,preview};rigDraw(rigMain);
})();
