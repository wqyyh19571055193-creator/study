(function(root){
  'use strict';
  function compute(model,request,E){
    const m=JSON.parse(JSON.stringify(model));
    const metrics=[...new Set(request.metrics||[])];
    if(!metrics.length || metrics.some(x=>!['position','velocity','acceleration','angular','reaction','drive'].includes(x)))throw Error('请选择有效的计算项目。');
    const pi=m.points.findIndex(p=>p.id===request.target),li=m.links.findIndex(l=>l.id===request.target);
    if(pi<0&&li<0)throw Error('请指定有效的分析对象。');
    if(li>=0&&metrics.some(x=>['position','velocity','acceleration','reaction'].includes(x)))throw Error('位置、速度、加速度和铰链反力请选择铰点；角运动和驱动力请选择构件。');
    if(pi>=0&&metrics.some(x=>['angular','drive'].includes(x)))throw Error('角运动和驱动力请选择构件。');
    const c=E.compile(m);if(!c.ok)throw Error(c.err);
    if(c.m!==c.n)throw Error(`约束数 ${c.m} 与广义坐标数 ${c.n} 不相等，请先完成驱动与约束设置。`);
    const q0=c.bodies.flatMap(b=>[b.x0,b.y0,b.th0]);
    const range=request.range==='scan';
    const duration=Number(request.duration);
    if(range&&(!Number.isFinite(duration)||duration<=0||duration>10000))throw Error('分析时长应在 0 至 10000 秒之间。');
    const count=range?Math.min(721,Math.max(25,Number(request.samples)||181)):1;
    const t0=range?0:Number(request.time||0);if(!Number.isFinite(t0)||t0<0)throw Error('分析时间无效。');
    const series=new Map(),failures=[],samples=[];let prev=q0;
    const forces=metrics.some(k=>k==='reaction'||k==='drive');
    const add=(key,label,unit,t,value)=>{
      if(!Number.isFinite(value))throw Error('求解器返回了非有限数值。');
      if(!series.has(key))series.set(key,{key,label,unit,values:[]});
      series.get(key).values.push({t,value});
    };
    for(let k=0;k<count;k++){
      const t=range?duration*k/(count-1):t0;
      const s=forces?E.analyze(c,t,prev):E.kinematics(c,t,prev);
      if(!s.ok || (forces&&m.useFriction&&!s.forces?.frictionConverged)){
        failures.push({t,error:s.err||'摩擦迭代未收敛，未采用该受力结果。'});samples.push({t,ok:false});continue;
      }
      prev=s.q;samples.push({t,ok:true});
      if(pi>=0){
        const bi=c.bodies.findIndex(b=>b.pts.includes(pi));
        let p=m.points[pi],v={x:0,y:0},a={x:0,y:0};
        if(bi>=0){
          const loc=c.bodies[bi].loc.find(l=>l.pi===pi),th=s.q[3*bi+2],co=Math.cos(th),sn=Math.sin(th);
          const rx=co*loc.x-sn*loc.y,ry=sn*loc.x+co*loc.y,w=s.qd[3*bi+2],al=s.qdd[3*bi+2];
          p={x:(s.q[3*bi]+rx)*1000,y:(s.q[3*bi+1]+ry)*1000};
          v={x:(s.qd[3*bi]-w*ry)*1000,y:(s.qd[3*bi+1]+w*rx)*1000};
          a={x:(s.qdd[3*bi]-al*ry-w*w*rx)*1000,y:(s.qdd[3*bi+1]+al*rx-w*w*ry)*1000};
        }else if(!p.ground)throw Error('所选点是悬空点，没有所属活动构件或固定支座。');
        if(metrics.includes('position')){add('x','x','mm',t,p.x);add('y','y','mm',t,p.y);}
        if(metrics.includes('velocity')){add('vx','vx','mm/s',t,v.x);add('vy','vy','mm/s',t,v.y);add('v','速度模','mm/s',t,Math.hypot(v.x,v.y));}
        if(metrics.includes('acceleration')){add('ax','ax','mm/s²',t,a.x);add('ay','ay','mm/s²',t,a.y);add('a','加速度模','mm/s²',t,Math.hypot(a.x,a.y));}
        if(metrics.includes('reaction')){
          const joints=E.extract(c,s).joints.filter(j=>j.joint===pi);
          if(!joints.length)throw Error('该点没有可提取的转动副反力。');
          for(const j of joints){const pair=`L${j.aL+1}←${j.bL<0?'机架':'L'+(j.bL+1)}`,key=`r_${j.aL}_${j.bL}`;
            add(key+'x',pair+' Rx','N',t,j.rx);add(key+'y',pair+' Ry','N',t,j.ry);add(key,pair+' |R|','N',t,j.mag);}
        }
      }else{
        const bi=c.bodyOf[li];if(bi<0)throw Error('所选构件为机架，没有活动构件运动或驱动力结果。');
        if(metrics.includes('angular')){add('theta','构件角度','°',t,s.q[3*bi+2]*180/Math.PI);add('omega','角速度','rad/s',t,s.qd[3*bi+2]);add('alpha','角加速度','rad/s²',t,s.qdd[3*bi+2]);}
        if(metrics.includes('drive')){const ds=E.extract(c,s).drivers.filter(d=>d.link===bi);if(!ds.length)throw Error('所选构件不是原动件。');for(const d of ds)add('drive'+d.di,'驱动 '+(d.di+1),d.kind==='M'?'N·m':'N',t,d.value);}
      }
    }
    if(!series.size)throw Error(failures[0]?.error||'没有有效计算结果。');
    const output=[...series.values()].map(s=>{
      const byTime=new Map(s.values.map(v=>[v.t,v.value]));
      const min=s.values.reduce((a,b)=>a.value<b.value?a:b),max=s.values.reduce((a,b)=>a.value>b.value?a:b);
      return {...s,min,max,values:samples.map(v=>({t:v.t,value:byTime.has(v.t)?byTime.get(v.t):null}))};
    });
    return {request:{...request},targetLabel:pi>=0?'P'+(pi+1):'L'+(li+1),series:output,samples:count,failures,duration:range?duration:0,time:t0,range:range?'scan':'current',extrema:'采样极值，不代表严格数学极值'};
  }
  root.MechAnalysis={compute};if(typeof module!=='undefined')module.exports=root.MechAnalysis;
})(globalThis);
