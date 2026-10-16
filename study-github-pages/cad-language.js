(function(root){
  'use strict';
  const num='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
  const rx=s=>new RegExp(s,'i');
  const clone=x=>JSON.parse(JSON.stringify(x));
  const empty=()=>({points:[],links:[],prisms:[],gears:[],drivers:[],loads:[],dimensions:[],useGravity:false,useInertia:true,useFriction:false,f:.1,rj:8});
  function finite(x){const n=Number(x);if(!Number.isFinite(n)||Math.abs(n)>1e7)throw Error('数值无效或超出范围。');return n;}
  function template(text){
    const slider=/曲柄滑块/.test(text),four=/四杆/.test(text);if(!slider&&!four)return null;
    const parts=text.split(/[,，;；\n]+/).map(x=>x.trim()).filter(Boolean);
    if(!/^(?:(?:创建|建立|生成|画)(?:一个)?)?(?:平面)?(?:四杆|曲柄滑块)(?:机构)?$/.test(parts[0]))throw Error('请以“创建四杆机构”或“创建曲柄滑块机构”开头，参数之间用逗号分隔。');
    const allowed=slider?['曲柄','连杆','偏距','初始角','转速','滑块长']:['曲柄','连杆','摇杆','机架','初始角','转速'];
    const p=slider?{曲柄:50,连杆:150,偏距:0,初始角:60,转速:60,滑块长:30}:{曲柄:30,连杆:90,摇杆:70,机架:100,初始角:60,转速:60};const specified=new Set();
    for(const part of parts.slice(1)){const a=part.match(rx('^('+allowed.join('|')+')\\s*(?:为|=|:|：)?\\s*('+num+')\\s*(mm|毫米|°|度|rpm|转/分)?$'));if(!a)throw Error('不能识别参数“'+part+'”，请按示例填写。');const k=a[1],u=(a[3]||'').toLowerCase();if(specified.has(k))throw Error('参数“'+k+'”重复。');if(u&&!(k==='转速'?['rpm','转/分']:k==='初始角'?['°','度']:['mm','毫米']).includes(u))throw Error(k+' 的单位不正确。');specified.add(k);p[k]=finite(a[2]);}
    for(const k of allowed.filter(k=>!['转速','偏距','初始角'].includes(k)))if(p[k]<=0)throw Error(k+' 必须大于 0 mm。');
    if(Math.abs(p.转速)>10000)throw Error('转速绝对值不能超过 10000 rpm。');
    const m=empty(),phi=p.初始角*Math.PI/180,a=p.曲柄,b=p.连杆;
    const P=(x,y,ground=false)=>{m.points.push({id:'cadp_'+(m.points.length+1),x,y,ground});return m.points.length-1;};
    const L=(i,j)=>{m.links.push({id:'cadl_'+(m.links.length+1),pts:[i,j],m:0,J:0});return m.links.length-1;};
    const A=P(0,0,true),B=P(a*Math.cos(phi),a*Math.sin(phi));let C;
    if(slider){const e=p.偏距,dy=e-m.points[B].y,disc=b*b-dy*dy;if(disc<=1e-8)throw Error('连杆无法到达这条滑槽，请增大连杆或调整初始角/偏距。');C=P(m.points[B].x+Math.sqrt(disc),e);const E=P(m.points[C].x+p.滑块长,e);L(A,B);L(B,C);const li=L(C,E);m.prisms.push({link:li,guide:-1,ax:m.points[C].x,ay:e,dx:1,dy:0});}
    else{const c=p.摇杆,d=p.机架,dx=d-m.points[B].x,dy=-m.points[B].y,r=Math.hypot(dx,dy);if(r<1e-8)throw Error('初始位置退化，请调整初始角。');const x=(b*b-c*c+r*r)/(2*r),yy=b*b-x*x;if(yy<=1e-8)throw Error('杆长无法组成非退化四杆，请检查尺寸与初始角。');const y=Math.sqrt(yy);C=P(m.points[B].x+x*dx/r-y*dy/r,m.points[B].y+x*dy/r+y*dx/r);const D=P(d,0,true);L(A,B);L(B,C);L(C,D);}
    m.drivers.push({link:0,type:'rot',n:p.转速,v:100});
    return {model:m,notes:['已建立'+(slider?'曲柄滑块':'四杆')+'机构。',...allowed.map(k=>k+' '+p[k]+(k==='转速'?' rpm':k==='初始角'?'°':' mm')+(specified.has(k)?'':'（默认）')),'构件质量和转动惯量默认 0；受力分析前请在属性中填写实际参数。']};
  }
  function build(text,base,options={}){
    if(typeof text!=='string'||!text.trim())throw Error('请输入建模文字或命令。');if(text.length>12000)throw Error('一次最多输入 12000 个字符。');
    const normalized=text.replace(/（/g,'(').replace(/）/g,')').replace(/，/g,',').replace(/＜/g,'<').trim();
    const t=template(normalized);if(t){if(options.append)throw Error('参数化整机构请使用“新建替换”模式。');return t;}
    const m=options.append&&base?clone(base):empty();for(const k of ['points','links','prisms','gears','drivers','loads','dimensions'])m[k]||=[];
    const lines=normalized.split(/[;；\n]+/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));if(lines.length>200)throw Error('一次最多 200 条命令。');
    const aliases=new Map(),linkAliases=new Map();m.points.forEach((p,i)=>{aliases.set('P'+(i+1),i);aliases.set(p.id,i);if(p.id?.startsWith('cadp_'))aliases.set(p.id.slice(5),i);});m.links.forEach((l,i)=>{linkAliases.set('L'+(i+1),i);linkAliases.set(l.id,i);if(l.id?.startsWith('cadl_'))linkAliases.set(l.id.slice(5),i);});
    let serial=0;const id=(prefix,list)=>{let v;do{v=prefix+'draw_'+(++serial);}while(list.some(x=>x.id===v));return v;};
    const point=(ref)=>{const i=aliases.get(ref);if(i===undefined)throw Error('找不到铰点 '+ref+'。');return i;};
    const link=ref=>{const i=linkAliases.get(ref);if(i===undefined)throw Error('找不到构件 '+ref+'。');return i;};
    const addPoint=(x,y,name=null,ground=false)=>{x=finite(x);y=finite(y);if(name&&aliases.has(name))throw Error('铰点名称重复：'+name);let i=name?-1:m.points.findIndex(p=>Math.hypot(p.x-x,p.y-y)<1e-7);if(i<0){i=m.points.length;m.points.push({id:name?'cadp_'+name:id('cadp_',m.points),x,y,ground});}if(name)aliases.set(name,i);aliases.set('P'+(i+1),i);return i;};
    function coord(v,origin=null){let a=v.match(rx('^@('+num+')<('+num+')$'));if(a){if(!origin)throw Error('极坐标需要起点。');const len=finite(a[1]),th=finite(a[2])*Math.PI/180;if(len<=0)throw Error('长度必须大于 0。');return{x:origin.x+len*Math.cos(th),y:origin.y+len*Math.sin(th)};}a=v.match(rx('^(@)?\\(?('+num+'),('+num+')\\)?$'));if(!a)throw Error('坐标格式：0,0；相对坐标 @100,0；极坐标 @100<30。');if(a[1]&&!origin)throw Error('相对坐标需要起点。');return{x:finite(a[2])+(a[1]?origin.x:0),y:finite(a[3])+(a[1]?origin.y:0)};}
    const notes=[];
    lines.forEach((line,k)=>{try{let a;
      if((a=line.match(/^(?:点|POINT)\s+([A-Za-z][\w-]*)\s+(\S+)(?:\s+(固定))?$/i))){const q=coord(a[2]);addPoint(q.x,q.y,a[1],!!a[3]);}
      else if((a=line.match(/^(?:杆|BAR)\s+([A-Za-z][\w-]*)\s+([\w-]+)\s+([\w-]+)$/i))){if(linkAliases.has(a[1]))throw Error('构件名称重复。');const i=point(a[2]),j=point(a[3]);if(i===j||Math.hypot(m.points[i].x-m.points[j].x,m.points[i].y-m.points[j].y)<1e-7)throw Error('杆长不能为零。');const n=m.links.length;m.links.push({id:'cadl_'+a[1],pts:[i,j],m:0,J:0});linkAliases.set(a[1],n);linkAliases.set('L'+(n+1),n);}
      else if((a=line.match(/^(?:LINE|直线)\s+(\S+)\s+(\S+)$/i))){const p=coord(a[1]),q=coord(a[2],p);if(Math.hypot(p.x-q.x,p.y-q.y)<1e-7)throw Error('杆长不能为零。');const i=addPoint(p.x,p.y),j=addPoint(q.x,q.y),n=m.links.length;m.links.push({id:id('cadl_',m.links),pts:[i,j],m:0,J:0});linkAliases.set('L'+(n+1),n);}
      else if((a=line.match(/^(复合铰链|COMPOUND|普通铰链|SINGLE)\s+(.+)$/i))){const type=/^(复合铰链|COMPOUND)$/i.test(a[1])?'compound':'single';for(const ref of a[2].split(/\s+/))m.points[point(ref)].jointType=type;}
      else if((a=line.match(/^(固定|FIX|释放|FREE)\s+(.+)$/i))){const g=/^(固定|FIX)$/i.test(a[1]);for(const ref of a[2].split(/\s+/))m.points[point(ref)].ground=g;}
      else if((a=line.match(rx('^(?:驱动|DRIVE)\\s+([\\w-]+)\\s+('+num+')\\s*(?:rpm|转/分)?$')))){const li=link(a[1]),n=finite(a[2]);if(Math.abs(n)>10000)throw Error('转速绝对值不能超过 10000 rpm。');m.drivers=m.drivers.filter(d=>d.link!==li&&d.link>=0);m.drivers.push({link:li,type:'rot',n,v:100});}
      else if((a=line.match(rx('^(?:滑槽|SLOT)\\s+([\\w-]+)\\s+(水平|竖直|'+num+')(?:°|度)?$')))){const li=link(a[1]),l=m.links[li];if(l.pts.some(i=>m.points[i].ground))throw Error('滑块含固定点，请先释放固定。');const deg=a[2]==='水平'?0:a[2]==='竖直'?90:finite(a[2]),p=m.points[l.pts[0]],th=deg*Math.PI/180;m.prisms=m.prisms.filter(p=>p.link!==li);m.prisms.push({link:li,guide:-1,ax:p.x,ay:p.y,dx:Math.cos(th),dy:Math.sin(th)});}
      else throw Error('不支持这条指令，请参考下方语法示例。');
      if(m.points.length>120||m.links.length>120)throw Error('文字建模最多支持 120 个点和 120 个构件。');notes.push('第 '+(k+1)+' 行：'+line);
    }catch(e){throw Error('第 '+(k+1)+' 行：'+e.message);}});
    if(!lines.length)throw Error('没有可执行的建模指令。');if(root.MechJoints)root.MechJoints.assert(m);return{model:m,notes};
  }
  root.MechLanguage={build,template};if(typeof module!=='undefined')module.exports=root.MechLanguage;
})(globalThis);
