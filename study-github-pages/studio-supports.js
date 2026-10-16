(function(root){
  'use strict';
  // Pure model operations: every edit is atomic and can use the existing undo stack.
  function guide(model,ids,angle,guideId=null){
    if(!ids.length)throw Error('先选择一个或多个滑块构件。');
    if(!Number.isFinite(angle))throw Error('请输入有效的导轨角度。');
    const m=JSON.parse(JSON.stringify(model)),gi=guideId===null?-1:m.links.findIndex(l=>l.id===guideId);
    if(guideId!==null&&gi<0)throw Error('导轨构件不存在。');
    let dx=Math.cos((angle%360)*Math.PI/180),dy=Math.sin((angle%360)*Math.PI/180);
    if(gi>=0){const g=m.links[gi],a=m.points[g.pts[0]],b=m.points[g.pts[1]],d=Math.hypot(b.x-a.x,b.y-a.y);if(d<1e-8)throw Error('导轨构件长度不能为零。');dx=(b.x-a.x)/d;dy=(b.y-a.y)/d;}
    for(const id of new Set(ids)){
      const li=m.links.findIndex(l=>l.id===id),l=m.links[li];
      if(!l)throw Error('所选构件不存在。');
      if(li===gi)throw Error('滑块和导轨不能是同一个构件。');
      if(l.pts.some(i=>m.points[i].ground))throw Error('滑块构件含固定铰点，请先取消固定约束。');
      const p=m.points[l.pts[0]],old=m.prisms.find(x=>x.link===li),keep=gi<0&&old&&(old.guide==null||old.guide<0);
      const pr={link:li,guide:gi,ax:keep?old.ax:p.x,ay:keep?old.ay:p.y,dx,dy};
      m.prisms=m.prisms.filter(x=>x.link!==li);m.prisms.push(pr);
    }
    return m;
  }
  function rotate(model,ids,degrees){
    if(!ids.length)throw Error('先选择需要调整的滑块构件。');
    if(!Number.isFinite(degrees))throw Error('请输入有效的转角。');
    const m=JSON.parse(JSON.stringify(model)),a=(degrees%360)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    for(const id of new Set(ids)){
      const li=m.links.findIndex(l=>l.id===id),pr=m.prisms.find(x=>x.link===li);
      if(li<0||!pr)throw Error('所选构件尚未设置滑槽，请先选择水平、竖直或指定角度。');
      if(pr.guide!=null&&pr.guide>=0)throw Error('随杆导槽方向由参考构件决定；请调整参考构件，或明确改用固定导轨。');
      const d=Math.hypot(pr.dx,pr.dy);if(d<1e-8)throw Error('导轨方向无效，请重新设置。');
      const x=pr.dx/d,y=pr.dy/d;pr.dx=c*x-s*y;pr.dy=s*x+c*y;
    }
    return m;
  }
  function remove(model,ids){const m=JSON.parse(JSON.stringify(model));const set=new Set(ids.map(id=>m.links.findIndex(l=>l.id===id)));m.prisms=m.prisms.filter(p=>!set.has(p.link));return m;}
  root.MechSupports={guide,remove,rotate};
  if(typeof module!=='undefined')module.exports=root.MechSupports;
})(globalThis);
