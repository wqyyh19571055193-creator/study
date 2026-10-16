(function(root){
  'use strict';
  const fmt=n=>Number.isFinite(n)?Number(n.toPrecision(6)).toString():'无有效值';
  const names={x:'水平位置',y:'竖直位置',vx:'水平速度',vy:'竖直速度',v:'速度大小',ax:'水平加速度',ay:'竖直加速度',a:'加速度大小',theta:'构件角度',omega:'角速度',alpha:'角加速度'};
  function explain(r,model){
    const lines=[],scope=r.range==='scan'?'0～'+fmt(r.duration)+' s 扫描':'t = '+fmt(r.time)+' s 当前位形';
    lines.push('分析对象：'+r.targetLabel+'；范围：'+scope+'。');
    if(r.range==='scan')lines.push('共 '+r.samples+' 个采样时刻，其中 '+(r.samples-r.failures.length)+' 个有效，'+r.failures.length+' 个失败。以下极值来自有效采样点，不是严格数学极值。');
    for(const s of r.series){const name=names[s.key]||s.label;
      if(r.range==='scan')lines.push(name+'在有效样本中最小为 '+fmt(s.min.value)+' '+s.unit+'（t = '+fmt(s.min.t)+' s），最大为 '+fmt(s.max.value)+' '+s.unit+'（t = '+fmt(s.max.t)+' s）。');
      else{const v=s.values[0]?.value;let direction='';if(['vx','vy','ax','ay'].includes(s.key)&&Number.isFinite(v)&&Math.abs(v)>1e-8)direction='，方向沿'+(['vx','ax'].includes(s.key)?'水平':'竖直')+(v>0?'正向':'负向');if(['omega','alpha'].includes(s.key)&&Number.isFinite(v)&&Math.abs(v)>1e-8)direction='，正值按逆时针约定'+(v>0?'':'；当前为负值');lines.push(name+'为 '+fmt(v)+' '+s.unit+direction+'。');}
    }
    const force=r.request.metrics.some(k=>['reaction','drive'].includes(k));
    if(force){lines.push('受力条件：'+(model.useGravity?'计入重力':'未计重力')+'；'+(model.useInertia?'计入惯性':'未计惯性')+'；'+(model.useFriction?'计入运动副摩擦':'未计摩擦')+'。');if(model.links.some(l=>!l.pts.every(i=>model.points[i].ground)&&(!l.m||!l.J)))lines.push('部分活动构件的质量或转动惯量为 0；请核对实际参数后再判断受力结果。');if(!model.loads.length&&!model.useGravity)lines.push('当前没有外加荷载，也未计重力。零力值不代表实际机构无需驱动力。');}
    if(r.failures.length)lines.push('求解失败的时刻以空值显示，未按零值填补，也未跨失败区间插值。');
    return{title:r.targetLabel+' · 计算结果',lines,text:['机械机构计算报告',...lines].join('\n')};
  }
  root.MechReport={explain,fmt};if(typeof module!=='undefined')module.exports=root.MechReport;
})(globalThis);
