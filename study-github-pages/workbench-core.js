/* Shared deterministic editing operations. No DOM, network or generated code. */
(function (root) {
  'use strict';
  const clone = x => JSON.parse(JSON.stringify(x));
  let serial = 0;
  function ensure(m) {
    for (const key of ['points','links','prisms','gears','loads']) if (!Array.isArray(m[key])) m[key]=[];
    if (!Array.isArray(m.drivers)) m.drivers=m.driver?[clone(m.driver)]:[];
    const used = new Set();
    for (const kind of ['points', 'links']) for (const o of m[kind] || []) {
      if (typeof o.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(o.id) || used.has(o.id)) {
        do { o.id = `${kind === 'points' ? 'p' : 'l'}_${Date.now().toString(36)}_${++serial}`; } while (used.has(o.id));
      }
      used.add(o.id);
    }
    if (!Array.isArray(m.dimensions)) m.dimensions = [];
    m.dimensions = m.dimensions.filter(d => d && Array.isArray(d.points) && d.points.every(id => m.points.some(p => p.id === id)));
    return m;
  }
  function index(m, kind, id) {
    const i = m[kind].findIndex(x => x.id === id);
    if (i < 0) throw Error('对象已不存在，请重新选择。');
    return i;
  }
  const distance = (a,b) => Math.hypot(b.x-a.x,b.y-a.y);
  const wrap = a => Math.atan2(Math.sin(a),Math.cos(a));
  function measure(m,d) {
    const p = d.points.map(id => m.points[index(m,'points',id)]);
    if (d.kind === 'distance') return distance(p[0],p[1]);
    if (d.kind === 'horizontal') return p[1].x-p[0].x;
    if (d.kind === 'vertical') return p[1].y-p[0].y;
    if (d.kind === 'angle') return wrap(Math.atan2(p[3].y-p[2].y,p[3].x-p[2].x)-Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x))*180/Math.PI;
    throw Error('不支持的尺寸类型。');
  }
  function linear(A,b) {
    A=A.map((r,i)=>[...r,b[i]]); const n=b.length;
    for(let k=0;k<n;k++) {
      let p=k; for(let i=k+1;i<n;i++) if(Math.abs(A[i][k])>Math.abs(A[p][k]))p=i;
      if(Math.abs(A[p][k])<1e-18)return null;
      [A[k],A[p]]=[A[p],A[k]];
      for(let i=k+1;i<n;i++){const f=A[i][k]/A[k][k];for(let j=k;j<=n;j++)A[i][j]-=f*A[k][j];}
    }
    const x=Array(n).fill(0);
    for(let i=n-1;i>=0;i--){let v=A[i][n];for(let j=i+1;j<n;j++)v-=A[i][j]*x[j];x[i]=v/A[i][i];}
    return x;
  }
  function geometry(original, dimensions, pin=null, replaced=null) {
    const m=ensure(clone(original));
    if(m.points.length>120)throw Error('智能尺寸首版最多支持 120 个铰点。');
    const constraints=[]; const pairs=new Set();
    const freePair=replaced && replaced.kind==='distance' ? [...replaced.points].sort().join('|') : null;
    for(const l of m.links) for(let a=0;a<l.pts.length;a++)for(let b=a+1;b<l.pts.length;b++) {
      const i=l.pts[a],j=l.pts[b],key=[m.points[i].id,m.points[j].id].sort().join('|');
      if(key===freePair || pairs.has(key))continue;
      pairs.add(key); const len=distance(m.points[i],m.points[j]);
      constraints.push(()=>distance(m.points[i],m.points[j])-len);
    }
    for(const d of dimensions.filter(d=>d.mode==='driving')) {
      constraints.push(()=>d.kind==='angle' ? wrap((measure(m,d)-d.value)*Math.PI/180)*100 : measure(m,d)-d.value);
    }
    // Preserve prismatic joints in the initial sketch, including guides mounted on a moving body.
    for(const pr of m.prisms){
      const sl=m.links[pr.link];if(!sl||sl.pts.length<2)continue;
      const s0=original.links[pr.link].pts.map(i=>original.points[i]);
      const thetaS0=Math.atan2(s0[1].y-s0[0].y,s0[1].x-s0[0].x);
      const guide=pr.guide>=0?m.links[pr.guide]:null;
      const g0=guide?original.links[pr.guide].pts.map(i=>original.points[i]):null;
      const thetaG0=g0?Math.atan2(g0[1].y-g0[0].y,g0[1].x-g0[0].x):0;
      const guidePose=()=>{
        if(!guide)return{ax:pr.ax,ay:pr.ay,dx:pr.dx,dy:pr.dy,angle:0};
        const a=m.points[guide.pts[0]],b=m.points[guide.pts[1]],angle=Math.atan2(b.y-a.y,b.x-a.x),delta=angle-thetaG0,co=Math.cos(delta),sn=Math.sin(delta),x=pr.ax-g0[0].x,y=pr.ay-g0[0].y;
        return{ax:a.x+co*x-sn*y,ay:a.y+sn*x+co*y,dx:co*pr.dx-sn*pr.dy,dy:sn*pr.dx+co*pr.dy,angle};
      };
      constraints.push(()=>{const g=guidePose(),p=m.points[sl.pts[0]];return(p.x-g.ax)*g.dy-(p.y-g.ay)*g.dx;});
      constraints.push(()=>{const g=guidePose(),a=m.points[sl.pts[0]],b=m.points[sl.pts[1]];return wrap(Math.atan2(b.y-a.y,b.x-a.x)-g.angle-(thetaS0-thetaG0))*100;});
    }
    if(pin){const p=m.points[index(m,'points',pin.id)];constraints.push(()=>p.x-pin.x,()=>p.y-pin.y);}
    const vars=[];
    m.points.forEach((p,i)=>{if(!p.ground){vars.push([i,'x'],[i,'y']);}});
    const residual=()=>constraints.map(f=>f());
    const norm=r=>Math.max(0,...r.map(Math.abs));
    let r=residual();
    for(let iter=0;iter<100 && norm(r)>1e-6;iter++) {
      if(!vars.length)break;
      const J=r.map(()=>Array(vars.length));
      vars.forEach(([i,k],j)=>{const v=m.points[i][k],h=1e-4;m.points[i][k]=v+h;const rp=residual();m.points[i][k]=v-h;const rm=residual();m.points[i][k]=v;for(let a=0;a<r.length;a++)J[a][j]=(rp[a]-rm[a])/(2*h);});
      // Minimum norm update Jᵀ(JJᵀ + μI)⁻¹(-r), so underconstrained sketches stay near their original pose.
      const A=J.map((row,a)=>J.map((rr,b)=>row.reduce((s,v,j)=>s+v*rr[j],0)+(a===b?1e-8:0)));
      const y=linear(A,r.map(v=>-v)); if(!y)break;
      const dx=vars.map((_,j)=>J.reduce((s,row,a)=>s+row[j]*y[a],0));
      const old=vars.map(([i,k])=>m.points[i][k]);let accepted=false;
      for(let scale=1;scale>=1/256;scale/=2){vars.forEach(([i,k],j)=>{m.points[i][k]=old[j]+scale*dx[j];});const rr=residual();if(norm(rr)<norm(r)){r=rr;accepted=true;break;}}
      if(!accepted){vars.forEach(([i,k],j)=>{m.points[i][k]=old[j];});break;}
    }
    if(norm(residual())>1e-4)throw Error('尺寸与固定点、其他杆长或已有尺寸冲突，未修改模型。可改为参考尺寸，或先删除冲突尺寸。');
    for(const p of m.points)if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('几何求解失败。');
    m.dimensions=dimensions; return m;
  }
  function dimension(original,spec) {
    const m=ensure(clone(original));
    if(!['distance','horizontal','vertical','angle'].includes(spec.kind))throw Error('尺寸类型无效。');
    if(!['driving','reference'].includes(spec.mode))throw Error('尺寸模式无效。');
    if(!Array.isArray(spec.points)||spec.points.length!==(spec.kind==='angle'?4:2))throw Error('请选择两个点、一根两点杆，或两根杆测量夹角。');
    spec.points.forEach(id=>index(m,'points',id));
    if(spec.points[0]===spec.points[1] || (spec.kind==='angle' && spec.points[2]===spec.points[3]))throw Error('尺寸端点不能重合。');
    if(spec.mode==='driving' && (!Number.isFinite(spec.value) || (spec.kind==='distance'&&spec.value<=0)))throw Error('请输入有效尺寸；杆长必须大于零。');
    if(spec.kind==='angle' && spec.mode==='driving' && Math.abs(spec.value)>180)throw Error('有向夹角范围为 -180° 至 180°。');
    if(spec.kind==='distance' && spec.mode==='driving' && m.links.some(l=>l.pts.length>2 && spec.points.every(id=>l.pts.includes(index(m,'points',id)))))throw Error('多点刚体暂不支持改变内部杆长，可添加参考尺寸。');
    const key=d=>d.kind+'|'+d.points.join('|');
    const old=m.dimensions.find(d=>key(d)===key(spec) && d.mode===spec.mode);
    const d={...clone(spec),id:old?.id || 'dim_'+Date.now().toString(36)+'_'+(++serial)};
    if(d.mode==='reference')d.value=measure(m,d);
    const dims=m.dimensions.filter(x=>x.id!==d.id);dims.push(d);
    if(d.mode==='reference'){m.dimensions=dims;return m;}
    return geometry(m,dims,null,d);
  }
  function merge(original,ids) {
    const m=ensure(clone(original));ids=[...new Set(ids)];
    if(ids.length<2)throw Error('请先多选至少两个铰点。');
    const nums=ids.map(id=>index(m,'points',id)),target=nums[0],set=new Set(nums);
    for(const l of m.links)if(l.pts.filter(p=>set.has(p)).length>1)throw Error('同一构件的两个铰点不能合并，否则会改变刚体拓扑。');
    const anchored=nums.filter(i=>m.points[i].ground);
    if(anchored.some(i=>distance(m.points[i],m.points[target])>1e-6))throw Error('固定铰点位置不同。请先取消相关固定约束，或先选固定点作为目标。');
    m.points[target].ground=anchored.length>0;
    const keep=m.points.map((_,i)=>i).filter(i=>i===target||!set.has(i));
    const remap=i=>keep.indexOf(set.has(i)?target:i);
    m.links.forEach(l=>l.pts=l.pts.map(remap));
    m.points=keep.map(i=>m.points[i]);
    m.dimensions.forEach(d=>d.points=d.points.map(id=>ids.includes(id)?ids[0]:id));
    m.dimensions=m.dimensions.filter(d=>d.points[0]!==d.points[1] && (d.kind!=='angle'||d.points[2]!==d.points[3]));
    for(const d of m.dimensions.filter(d=>d.mode==='driving'))if(Math.abs(measure(m,d)-d.value)>1e-4)throw Error('合并会破坏驱动尺寸，请先移除对应尺寸。');
    return m;
  }
  function split(original,pointId,linkId) {
    const m=ensure(clone(original)),pi=index(m,'points',pointId),li=index(m,'links',linkId);
    if(!m.links[li].pts.includes(pi))throw Error('所选构件不连接该铰点。');
    if(m.links.filter(l=>l.pts.includes(pi)).length<2)throw Error('此点没有多个构件连接。');
    const p={...m.points[pi],ground:false,jointType:'single'}; delete p.id;m.points.push(p);ensure(m);
    m.links[li].pts=m.links[li].pts.map(i=>i===pi?m.points.length-1:i);
    // Existing dimensions stay attached to the original joint; the split point is explicitly new.
    return m;
  }
  function intersect(original,ids) {
    const m=ensure(clone(original));if(ids.length!==2)throw Error('请选择两根杆。');
    const ls=ids.map(id=>m.links[index(m,'links',id)]);
    if(ls.some(l=>l.pts.length!==2))throw Error('交点连接只支持两根两点杆。');
    if(ls[0].pts.some(i=>ls[1].pts.includes(i)))throw Error('这两根杆已共用铰点。');
    const [a,b]=ls[0].pts.map(i=>m.points[i]),[c,d]=ls[1].pts.map(i=>m.points[i]);
    const ux=b.x-a.x,uy=b.y-a.y,vx=d.x-c.x,vy=d.y-c.y,det=ux*vy-uy*vx;
    if(Math.abs(det)<1e-9)throw Error('杆件平行或重合，无法确定唯一交点。');
    const t=((c.x-a.x)*vy-(c.y-a.y)*vx)/det,u=((c.x-a.x)*uy-(c.y-a.y)*ux)/det;
    if(t<0||t>1||u<0||u>1)throw Error('两根杆的线段范围内没有交点。');
    const ends=[t<1e-8?ls[0].pts[0]:t>1-1e-8?ls[0].pts[1]:null,u<1e-8?ls[1].pts[0]:u>1-1e-8?ls[1].pts[1]:null];
    if(ends[0]!=null&&ends[1]!=null)return merge(m,ends.map(i=>m.points[i].id));
    let pi=ends.find(i=>i!=null);
    if(pi==null){pi=m.points.length;m.points.push({x:a.x+t*ux,y:a.y+t*uy,ground:false});}
    for(const l of ls)if(!l.pts.includes(pi))l.pts.push(pi);
    return ensure(m);
  }
  function ground(original,kind,ids,on) {
    const m=ensure(clone(original));if(!ids.length)throw Error('请先选择对象。');
    const nums=ids.map(id=>index(m,kind,id));
    if(kind==='points')nums.forEach(i=>m.points[i].ground=!!on);
    else {
      const protectedPoints=new Set();
      if(!on)m.links.forEach((l,i)=>{if(!nums.includes(i)&&l.pts.every(p=>m.points[p].ground))l.pts.forEach(p=>protectedPoints.add(p));});
      nums.forEach(i=>m.links[i].pts.forEach(p=>{if(!protectedPoints.has(p))m.points[p].ground=!!on;}));
    }
    // Do not silently assign a new driver; diagnosis tells the user to choose one.
    return m;
  }
  root.MechEdit={clone,ensure,index,measure,dimension,geometry,merge,split,intersect,ground};
  if(typeof module!=='undefined')module.exports=root.MechEdit;
})(globalThis);
