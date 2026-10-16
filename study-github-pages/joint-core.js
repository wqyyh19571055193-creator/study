(function(root){
  'use strict';
  const clone=m=>JSON.parse(JSON.stringify(m));
  function describe(m){
    const points=m.points||[],links=m.links||[],frames=links.map(l=>(l.pts||[]).length>=2&&l.pts.every(i=>points[i]?.ground));
    const owners=points.map(()=>[]);links.forEach((l,li)=>{for(const i of new Set(l.pts||[]))if(owners[i])owners[i].push(li);});
    return points.map((p,i)=>{const moving=owners[i].filter(li=>!frames[li]),pairs=p.ground?moving.length:Math.max(0,moving.length-1);return{index:i,id:p.id,owners:owners[i],moving,frames:owners[i].filter(li=>frames[li]),pairs,compound:p.jointType==='compound',ground:!!p.ground};});
  }
  function error(m){
    if(!m||!Array.isArray(m.points)||!Array.isArray(m.links))return '机构模型数据无效。';
    for(const d of describe(m)){const type=m.points[d.index].jointType;if(type!=null&&!['single','compound'].includes(type))return `P${d.index+1} 的铰链类型无效。`;if(d.pairs>1&&!d.compound)return `P${d.index+1} 只能使用一个普通转动副；当前连接会形成 ${d.pairs} 个转动副。请在“复合铰链”工具中启用该点，或拆分连接。`;}
    return null;
  }
  function assert(m){const e=error(m);if(e)throw Error(e);return m;}
  function setType(original,ids,compound){
    if(!ids.length)throw Error('先选择一个或多个铰点。');const m=clone(original);
    for(const id of new Set(ids)){const p=m.points.find(p=>p.id===id);if(!p)throw Error('铰点已不存在，请重新选择。');p.jointType=compound?'compound':'single';}
    m.jointPolicyVersion=1;return assert(m);
  }
  // Used only at explicit legacy/preset loading boundaries, never while drawing.
  function adoptLegacy(original){const m=clone(original),converted=[];for(const d of describe(m)){const p=m.points[d.index];if(p.jointType==null){p.jointType=d.pairs>1?'compound':'single';if(d.pairs>1)converted.push(d.index);}}m.jointPolicyVersion=1;return{model:assert(m),converted};}
  function merge(original,ids,editor){return assert(editor.merge(setType(original,ids,true),ids));}
  function intersect(original,ids,editor){const m=editor.intersect(original,ids),ls=ids.map(id=>m.links.find(l=>l.id===id));for(const i of ls[0].pts.filter(i=>ls[1].pts.includes(i)))m.points[i].jointType='compound';m.jointPolicyVersion=1;return assert(m);}
  root.MechJoints={describe,error,assert,setType,adoptLegacy,merge,intersect};
  if(typeof module!=='undefined')module.exports=root.MechJoints;
})(globalThis);
