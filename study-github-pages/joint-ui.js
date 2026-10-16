(() => {
  'use strict';const $=id=>document.getElementById(id),J=MechJoints;
  const drawer=document.querySelector('[data-drawer=joints]');
  const group=document.createElement('details');group.className='studio-fold';group.open=true;
  group.innerHTML='<summary>独立设置复合铰链</summary><div class="studio-fold-body joint-body"><p class="wb-help">普通点最多对应 1 个转动副。需要让更多构件共用一个轴心时，先选择铰点并在这里启用复合铰链。</p><div id="joint-current" class="wb-message" aria-live="polite"></div><div class="btnrow"><button class="act primary" id="joint-enable">启用所选复合铰链</button><button class="act" id="joint-single">设为普通铰链</button></div><p class="wb-help">固定点的机架也参与连接；3 个构件共用一个活动铰点对应 2 个转动副。启用标记不会改变几何位置或强行减去约束。</p></div>';
  drawer.append(group);group.lastElementChild.append($('wb-composite-controls'));
  const badge=document.createElement('span');badge.id='joint-mode-badge';badge.textContent='普通连接 · 单转动副';document.querySelector('.cad-ribbon').append(badge);
  function info(){const ids=MechWorkbench.state.points,d=J.describe(RIG.model).filter(d=>ids.includes(d.id));$('joint-current').textContent=d.length?d.map(p=>`P${p.index+1} · ${p.compound?'已启用复合':'普通铰点'} · ${p.pairs} 个转动副 · ${p.moving.length} 个活动构件${p.ground?' + 机架':''}`).join('\n'):'先在画布选择铰点；Ctrl 可多选。';const c=d.filter(d=>d.compound).length;badge.textContent=c?'所选复合铰链 '+c+' 处':'普通连接 · 单转动副';badge.classList.toggle('joint-compound-active',c>0);$('joint-enable').disabled=!d.length;$('joint-single').disabled=!d.length;}
  function apply(on){try{const ids=MechWorkbench.state.points;MechWorkbench.commit(J.setType(RIG.model,ids,on),on?'已显式启用所选点的复合铰链，可继续接入构件。':'所选点已恢复为普通铰链。');info();}catch(e){$('wb-notice').textContent=e.message;$('joint-current').textContent=e.message;}}
  $('joint-enable').onclick=()=>apply(true);$('joint-single').onclick=()=>apply(false);
  const observer=new MutationObserver(info);observer.observe($('wb-selection'),{subtree:true,childList:true});observer.observe($('wb-revision'),{childList:true});
  const select=MechWorkbench.select;MechWorkbench.select=function(...args){const r=select(...args);info();return r;};
  const draw=rigDraw;rigDraw=function(sc){draw(sc);if(sc!==rigMain)return;const ctx=sc.ctx;for(const d of J.describe(RIG.model).filter(d=>d.compound)){const p=RIG.comp&&RIG.sol?.ok?rigPointWorld(RIG.comp,RIG.sol,d.index):RIG.model.points[d.index];ctx.save();ctx.strokeStyle='#e5ac66';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(sc.X(p.x),sc.Y(p.y),10.5,0,2*Math.PI);ctx.stroke();ctx.restore();sc.label(p.x,p.y,'复合 · '+d.pairs+' 副','#e5ac66',22,10);}};
  window.MechJointUI={refresh:info};info();rigDraw(rigMain);
})();
