(() => {
  'use strict';
  const $=id=>document.getElementById(id),header=document.querySelector('header'),title=header.querySelector('h1');
  const icon=document.createElement('img');icon.src='./favicon.svg';icon.alt='';title.prepend(icon);
  const badge=document.createElement('span');badge.className='web-badge';badge.textContent='分享版实验室';header.append(badge);
  const actions=document.createElement('div');actions.className='web-file-actions';actions.innerHTML='<button class="act" id="web-download">下载模型</button><button class="act" id="web-upload">打开模型</button><button class="act" id="web-help">使用说明</button>';header.append(actions);
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;document.body.append(input);
  function note(text,error=false){$('wb-notice').textContent=text;$('wb-notice').style.color=error?'var(--warn)':'#b5d6ff';}
  $('web-download').onclick=()=>{const blob=new Blob([JSON.stringify(RIG.model,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='机械机构-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);note('已下载机构 JSON，可在另一台设备上打开。');};
  $('web-upload').onclick=()=>input.click();
  input.onchange=async()=>{const file=input.files[0];if(!file)return;try{
    if(file.size>1024*1024)throw Error('模型文件超过 1 MB，请选择较小的机构模型。');
    const m=JSON.parse(await file.text());
    if(!m||!Array.isArray(m.points)||!Array.isArray(m.links)||m.points.length>300||m.links.length>300)throw Error('不是有效的机构模型：需要 points 和 links 数组，且各不超过 300 项。');
    for(const p of m.points)if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>1e7||Math.abs(p.y)>1e7)throw Error('铰点坐标无效。');
    for(const l of m.links)if(!l||!Array.isArray(l.pts)||l.pts.length<2||l.pts.some(i=>!Number.isInteger(i)||i<0||i>=m.points.length))throw Error('构件连接索引无效。');
    rigNormModel(m);
    for(const list of [m.prisms,m.gears,m.loads,m.drivers])if(list.length>300||list.some(x=>!x||typeof x!=='object'))throw Error('运动副、荷载或驱动数据无效。');
    for(const p of m.points)p.ground=!!p.ground;
    for(const list of [m.links,m.prisms,m.gears,m.loads,m.drivers])validateNumericFields(list);
    MechEdit.ensure(m);rigCompile(MechEdit.clone(m));MechWorkbench.commit(m,'模型文件已载入。');rigFitView();rigDraw(rigMain);
  }catch(e){note('打开失败：'+e.message,true);}finally{input.value='';}};
  function validateNumericFields(list){for(const o of list)for(const [key,val]of Object.entries(o)){if(['id','pts'].includes(key))continue;if(['type','kind'].includes(key)){if(!['rot','lin','F','M'].includes(val))throw Error('机构类型字段无效。');}else if(typeof val!=='number'||!Number.isFinite(val))throw Error('模型参数必须是有限数值。');}}
  const dialog=document.createElement('dialog');dialog.className='web-help-dialog';dialog.innerHTML=`<button class="act" id="web-help-close">关闭 ×</button><h2>机械原理学习台</h2><p>从预设机构开始，也可以自己画杆、添加铰点和运动副。所有数值计算都在浏览器中完成。</p><ol><li><b>选择对象：</b>单击选择，Ctrl 增选，Shift 拖动框选；手机点“多选”后依次点选。</li><li><b>智能尺寸：</b>选择一根杆或两个点，点“智能尺寸”，输入目标值。尺寸冲突会回滚。</li><li><b>复合铰链：</b>多选铰点后合并；也可选择两根杆，在交点建立铰链。</li><li><b>计算结果：</b>选择点或构件，再点“选结果 / 计算”，按需查看位置、速度、加速度或反力。</li></ol><p>“保存到浏览器”只保留在当前浏览器。跨设备使用请“下载模型”，再到另一设备“打开模型”。</p><p>GitHub Pages 分享版提供画图、计算和本地检查；在线 AI 需要另行部署后端服务。采样极值不是严格数学极值。</p><p>手机可使用工具抽屉；复杂机构建议使用电脑或平板横屏。</p>`;document.body.append(dialog);$('web-help').onclick=()=>dialog.showModal();$('web-help-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  const toolbar=document.querySelector('.wb-toolbar'),controls=$('panel-rig').querySelector('.controls');
  const tools=document.createElement('button');tools.className='act web-tools-toggle';tools.id='web-tools';tools.textContent='搭建工具';toolbar.prepend(tools);tools.onclick=()=>controls.classList.toggle('web-open');
  const toolsHead=document.createElement('div');toolsHead.className='web-tools-head';toolsHead.innerHTML='<b>搭建与参数</b><button class="act" id="web-tools-close">关闭 ×</button>';controls.prepend(toolsHead);$('web-tools-close').onclick=()=>controls.classList.remove('web-open');
  controls.addEventListener('click',e=>{if(e.target.closest('#rig-tools button,#rig-presets button'))controls.classList.remove('web-open');});
  let multi=false;const multiButton=document.createElement('button');multiButton.className='act web-mobile-selection';multiButton.id='web-multi';multiButton.textContent='多选';toolbar.insertBefore(multiButton,$('wb-redo'));multiButton.onclick=()=>{multi=!multi;multiButton.classList.toggle('web-multi-on',multi);multiButton.setAttribute('aria-pressed',String(multi));};
  const cv=$('rig-canvas');let touchActive=false;
  cv.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;e.preventDefault();touchActive=true;cv.setPointerCapture(e.pointerId);cv.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,clientX:e.clientX,clientY:e.clientY,button:0,buttons:1,ctrlKey:multi}));});
  cv.addEventListener('pointermove',e=>{if(!touchActive||e.pointerType==='mouse')return;e.preventDefault();cv.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:e.clientX,clientY:e.clientY,buttons:1,ctrlKey:multi}));});
  const end=e=>{if(!touchActive||e.pointerType==='mouse')return;e.preventDefault();touchActive=false;cv.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,clientX:e.clientX,clientY:e.clientY,button:0,ctrlKey:multi}));};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
})();
