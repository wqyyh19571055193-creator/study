/* In-app instructions; opening help never applies a model or starts a calculation. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),dialog=document.createElement('dialog');
  dialog.id='web-help-dialog';dialog.className='web-help-dialog guide-dialog';dialog.setAttribute('aria-labelledby','guide-title');
  dialog.innerHTML=`
    <div class="guide-head"><div><small>MECHLAB / USER GUIDE</small><h2 id="guide-title">操作指南</h2></div><button class="act" id="web-help-close" aria-label="关闭操作指南">关闭 ×</button></div>
    <div class="guide-layout">
      <nav class="guide-nav" aria-label="操作指南目录">
        <button type="button" data-guide-topic="start" aria-current="location">01 快速上手</button>
        <button type="button" data-guide-topic="drawing">02 构图与尺寸</button>
        <button type="button" data-guide-topic="supports">03 固定端与铰链</button>
        <button type="button" data-guide-topic="sliders">04 滑块与导轨</button>
        <button type="button" data-guide-topic="text">05 文字建模</button>
        <button type="button" data-guide-topic="results">06 运动与计算</button>
        <button type="button" data-guide-topic="keys">07 快捷键</button>
        <button type="button" data-guide-topic="faq">08 保存与常见问题</button>
      </nav>
      <div class="guide-content" tabindex="0" aria-label="操作步骤">
        <p class="guide-intro">先完成几何和约束，再设置驱动，最后选取需要计算的对象。左侧负责构图，顶部按需展开属性、滑块、复合铰链、计算和分析。</p>
        <details id="guide-start" open><summary>01 / 第一次使用：先运行一个机构</summary><div class="guide-section">
          <ol><li>点击左下角<strong>“从典型机构开始”</strong>，选择“对心曲柄滑块”。载入会替换当前模型，需要保留时先点顶部“下载模型”。</li>
          <li>点击画布下方<strong>“运动”</strong>查看机构运动，再点击暂停。左栏的“机构运转示意”是独立动画，不代表当前模型的计算。</li>
          <li>点击顶部<strong>“选择”</strong>，在画布点选滑块铰点；打开<strong>“计算”</strong>，核对分析对象，勾选“速度”或“加速度”。</li>
          <li>选择“当前位形”，点击<strong>“计算所选结果”</strong>。查看中文结论、数值和单位；需要整段数据时改为扫描并设置时长。</li></ol>
          <div class="guide-actions"><button class="act" data-guide-open="presets">去选典型机构 ↗</button><button class="act" data-guide-open="calculate">打开计算面板 ↗</button></div>
          <p class="guide-tip">指南中的跳转按钮只打开对应面板；机构载入、模型修改和计算都需要你在目标面板中操作。</p>
        </div></details>
        <details id="guide-drawing"><summary>02 / 像 CAD 一样构图与设置尺寸</summary><div class="guide-section">
          <ol><li>点<strong>“新建”</strong>会先显示空白草稿，确认“应用到画布”后才清空；可撤销。也可直接在当前机构上继续画。</li>
          <li>点<strong>“直线 L”</strong>或按 L，单击起点、再单击终点；也可按住鼠标拖出一根杆。开启“端点捕捉”可连接已有点，F8 切换水平／竖直正交绘图。</li>
          <li>按 V 返回选择；Ctrl 点击可增选，Shift 拖动可框选。空白处拖动平移，按 + / − 缩放，点“适应画布”重新取景。</li>
          <li>选一根杆或两个点，按 D 打开<strong>“尺寸”</strong>。选择距离、水平差、垂直差或夹角，输入目标值并应用。夹角需要按顺序选两根两点杆。</li></ol>
          <p>“驱动尺寸”用于约束初始草图，“参考尺寸”用于测量。已有尺寸与新尺寸冲突时会拒绝修改；通过“属性 → 智能尺寸”可移除原约束。</p>
          <p>底部命令栏可输入精确坐标，回车生成预览，再确认应用：</p><pre>LINE 0,0 100,0
LINE 100,0 @50&lt;30</pre><p>第一条画到绝对坐标 (100, 0)；第二条从 (100, 0) 画一根长 50 mm、方向 30° 的杆。每次输入一条命令；相同坐标会共用铰点。</p>
        </div></details>
        <details id="guide-supports"><summary>03 / 多固定端与独立复合铰链</summary><div class="guide-section">
          <ol><li><strong>固定铰：</strong>先选中一个或多个铰点，再点左栏“固定铰”。未选点时，该按钮进入连续放置固定铰模式。</li>
          <li><strong>固定构件：</strong>先选中一个或多个构件，再点“固定构件”设为机架。需要释放时选中对应点／构件，点“取消固定”。</li>
          <li><strong>普通连接：</strong>同一个点最多一个转动副。固定点的机架也参与连接计数，接入更多活动构件时会提示启用复合铰链。</li>
          <li><strong>复合铰链：</strong>先选铰点，打开顶部独立“复合铰链”面板，再点“启用所选复合铰链”，然后连接更多构件。可在该面板合并点、建立交点连接或拆分连接。</li></ol>
          <p class="guide-tip">如果实际连接仍需要多个转动副，不能直接改回普通连接；先拆分多余连接，再恢复普通铰链。</p>
          <div class="guide-actions"><button class="act" data-guide-open="joints">打开复合铰链 ↗</button></div>
        </div></details>
        <details id="guide-sliders"><summary>04 / 滑块与导轨：选构件，再定方向</summary><div class="guide-section">
          <ol><li>先画出滑块对应的构件，按<strong> S </strong>或点顶部<strong>“滑块 S”</strong>。在下拉列表中选构件，或点“在画布选取构件”；Ctrl 可多选。</li>
          <li>点击<strong>“水平”／“竖直”</strong>，或在面板展开时按 H / V。滑块会添加相对机架的固定导轨；已有移动副会被更新，不会重复叠加。</li>
          <li>倾斜导轨可输入角度，按回车或点“应用角度”。角度以水平向右为 0°、逆时针为正。已有固定导轨可用 <strong>[ / ]</strong> 或 −15° / +15° 按钮微调，轴心保持。</li>
          <li>要让导轨随另一根杆运动，展开<strong>“随构件运动的导轨”</strong>，选择参考构件后应用。参考杆控制方向，因此单独旋转按钮会禁用；上方方向按钮会改为固定导轨。</li>
          <li>状态框显示滑块编号、导轨类型和角度。可点“移除滑槽”，或“撤销”恢复；Esc 收起面板并恢复原选择范围。</li></ol>
          <p class="guide-tip">手机点“在画布选取构件”后会先收起面板，选中后自动返回。含固定铰点的构件不能直接作为滑块，应先取消相应固定约束。滑槽只限制运动方向与相对转角，不包含端部挡块或碰撞。</p>
          <div class="guide-actions"><button class="act" data-guide-open="sliders">打开滑块 / 导轨 ↗</button></div>
        </div></details>
        <details id="guide-text"><summary>05 / 用文字生成机构草稿</summary><div class="guide-section">
          <ol><li>点<strong>“文字建模”</strong>，选择新建替换或追加，输入参数；长度用 mm，角度用度，转速用 rpm。</li>
          <li>点击<strong>“生成草稿”</strong>，检查预览图、尺寸和提示。生成草稿不会直接改动画布。</li>
          <li>确认后点<strong>“应用到画布”</strong>；需要放弃就关闭窗口或放弃草稿。应用后仍可撤销。</li></ol>
          <pre>创建曲柄滑块机构，曲柄50mm，连杆150mm，偏距0mm，滑块长30mm，初始角60度，转速60rpm</pre>
          <p>也可逐行输入“点 A 0,0 固定”“点 B 30,40”“杆 AB A B”“驱动 AB 60rpm”。目前支持本地规则和模板，不是任意自然语言 AI；不支持的描述会提示错误。文字模板的质量和惯量默认 0，受力分析前需要填写实际参数。</p>
          <div class="guide-actions"><button class="act" data-guide-open="text">打开文字建模 ↗</button></div>
        </div></details>
        <details id="guide-results"><summary>06 / 驱动、运动与中文计算结果</summary><div class="guide-section">
          <ol><li>在<strong>“属性 → 驱动与运动参数”</strong>中选择原动件、转动／直线驱动和数值。转动驱动使用 rpm，直线驱动使用 mm/s；驱动数量应与机构自由度匹配。</li>
          <li>点画布下方<strong>“运动”</strong>预览，再暂停到需要的时刻。循环进度也可在驱动参数中调整。</li>
          <li><strong>选点</strong>可算位置、速度、加速度和铰链反力；<strong>选构件</strong>可算角运动与驱动力。在“计算”面板核对分析对象，也可点“使用当前选择”。</li>
          <li>勾选所需物理量，选择“当前位形”或“从初始位形扫描”，点击<strong>“计算所选结果”</strong>。扫描需设置时长，会生成曲线和逐时刻数据。</li>
          <li>结果包含中文解释、数值、单位与方向。可点<strong>“下载文字报告”</strong>保存 TXT，或<strong>“导出 CSV”</strong>保存数值。</li></ol>
          <p>模型或计算条件变化后，旧结果会标记过期，需要重新计算。扫描极值是采样得到的近似值；失败时刻保留空值。受力计算前在属性中填写质量、惯量与荷载。</p>
          <p>遇到机构无法求解时，先打开“分析”查看结构与约束诊断；“原理”中可查看约束说明和平衡方程。</p>
          <div class="guide-actions"><button class="act" data-guide-open="properties">打开模型属性 ↗</button><button class="act" data-guide-open="calculate">打开计算面板 ↗</button></div>
        </div></details>
        <details id="guide-keys"><summary>07 / 常用快捷键与手机操作</summary><div class="guide-section">
          <div class="guide-table-wrap"><table><thead><tr><th>按键</th><th>操作</th><th>使用范围</th></tr></thead><tbody>
          <tr><td>F1</td><td>打开操作指南</td><td>未打开其他弹窗时</td></tr>
          <tr><td>L / V / D</td><td>画直线 / 选择 / 尺寸</td><td>建模页；滑块面板展开时 V 为竖直导轨</td></tr>
          <tr><td>F8</td><td>切换正交绘图</td><td>建模页</td></tr>
          <tr><td>S</td><td>展开 / 收起滑块面板</td><td>建模页</td></tr>
          <tr><td>H / V</td><td>水平 / 竖直固定导轨</td><td>滑块面板展开，且已选构件</td></tr>
          <tr><td>[ / ]</td><td>固定导轨 −15° / +15°</td><td>滑块面板展开；收起时为循环进度步进</td></tr>
          <tr><td>Enter</td><td>应用角度 / 预览命令</td><td>对应角度框 / 底部命令栏</td></tr>
          <tr><td>Ctrl+Z / Ctrl+Y</td><td>撤销 / 重做</td><td>画布操作；输入框保留文字编辑行为</td></tr>
          <tr><td>Ctrl 点击 / Shift 框选</td><td>增选对象 / 框选对象</td><td>选择工具</td></tr>
          <tr><td>Space / + / −</td><td>播放暂停 / 放大 / 缩小</td><td>建模页</td></tr>
          <tr><td>Delete / Esc</td><td>删除所选对象 / 取消当前步骤</td><td>选择后删除；Esc 也可关闭弹窗</td></tr>
          </tbody></table></div>
          <p>工具快捷键需要先离开输入框。手机使用“搭建工具”抽屉与屏幕按钮，顶部“多选”可连续增选；工具栏可左右滑动。复杂机构可使用横屏。</p>
        </div></details>
        <details id="guide-faq"><summary>08 / 保存模型与排查问题</summary><div class="guide-section">
          <dl><dt>怎样保存到另一台设备？</dt><dd>顶部“下载模型”保存 JSON；另一设备点击“打开模型”导入。浏览器存档只保留在当前浏览器，清理浏览器数据前请先下载。</dd>
          <dt>为什么滑槽按钮不可用？</dt><dd>先选择构件，而不是只选铰点。旋转按钮需要所有选中构件都有固定导轨；随杆导槽由参考构件控制方向。</dd>
          <dt>为什么画好后不运动或无法计算？</dt><dd>检查是否已连接共用铰点、设置固定端和移动副，再检查驱动数量及输入参数。打开“分析”查看诊断；只是画出外形还不等于机构约束完整。</dd>
          <dt>为什么不能在同一点再连一根杆？</dt><dd>普通点最多一个转动副。确实需要共轴多构件连接时，先在独立“复合铰链”面板显式启用。</dd>
          <dt>为什么找不到需要的结果？</dt><dd>点与构件的可计算项目不同，先核对分析对象。选铰点看速度等线运动量；选构件看角运动与驱动力。修改模型后需要重新计算。</dd>
          <dt>画布不见了或视图太小？</dt><dd>收起右侧面板，点击“适应画布”。左栏示意动画可由顶部“暂停界面动效”单独关闭。</dd></dl>
        </div></details>
      </div>
    </div>`;
  document.body.append(dialog);
  const content=dialog.querySelector('.guide-content'),links=[...dialog.querySelectorAll('[data-guide-topic]')];
  function topic(key){const section=$('guide-'+key);if(!section)return;section.open=true;links.forEach(b=>{if(b.dataset.guideTopic===key)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');});const nav=dialog.querySelector('.guide-nav'),active=links.find(b=>b.dataset.guideTopic===key);if(nav.scrollWidth>nav.clientWidth)nav.scrollLeft+=active.getBoundingClientRect().left-nav.getBoundingClientRect().left-8;content.scrollTop=Math.max(0,content.scrollTop+section.getBoundingClientRect().top-content.getBoundingClientRect().top-8);section.querySelector('summary').focus({preventScroll:true});}
  function open(key){if(!dialog.open)dialog.showModal();if(key)topic(key);}
  $('web-help').textContent='操作指南';$('web-help').title='操作指南 F1';$('web-help').onclick=()=>open();
  $('web-help-close').onclick=()=>dialog.close();
  links.forEach(b=>b.onclick=()=>topic(b.dataset.guideTopic));
  dialog.querySelectorAll('[data-guide-open]').forEach(b=>b.onclick=()=>{
    const key=b.dataset.guideOpen;dialog.close();
    document.querySelector('[data-tab="rig"]').click();$('web-tools-close')?.click();
    if(key==='text')$('cad-text').click();
    else {MechStudio.show(key,false);if(key==='calculate')$('wb-use-selection').click();}
  });
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  // Keep reading/navigation keys from reaching the modeling tools behind this modal.
  window.addEventListener('keydown',e=>{
    if(dialog.open){e.stopImmediatePropagation();if(e.key==='F1')e.preventDefault();if(e.key==='Escape'){e.preventDefault();dialog.close();}return;}
    if(e.key==='F1'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopImmediatePropagation();open();}
  },true);
  const help=document.createElement('button');help.className='act studio-slot-help';help.id='studio-slot-help';help.textContent='查看滑块操作步骤';help.onclick=()=>open('sliders');
  document.querySelector('[data-drawer="sliders"]').append(help);
})();
