# 机械原理学习台 · GitHub Pages 分享版

纯静态机械原理实验室，无需安装依赖或构建。支持智能尺寸、复合铰链、多选固定端、按需计算、曲线与结果导出、手机触摸、模型 JSON 导入导出。

发布配置完成后的地址：https://wqyyh19571055193-creator.github.io/study/

## 发布

1. 本项目仓库为 wqyyh19571055193-creator/study。
2. 将本目录中的网页文件上传到仓库根目录（index.html 必须在根目录，不要再套一层文件夹）。
3. 仓库 Settings → Pages → Build and deployment，选择 Deploy from a branch，分支 main，目录 / (root)，点击 Save。
4. 等待 GitHub Pages 构建完成后，复制 Pages 页面显示的网址，即可分享给其他人。

官方说明：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 使用

所有机械建模与计算在浏览器运行。浏览器本地保存不会在用户之间共享；跨设备可下载/打开模型 JSON。复杂机构建议使用电脑或平板横屏。

## AI 边界

GitHub Pages 不运行服务器代码。本版本明确关闭在线 AI 输入，保留本地机构检查。接入 AI 时需另行部署含身份校验、额度限制的后端，再修改接口地址。不要将模型密钥放入网页、仓库或浏览器。

## 本地预览

安装 Node.js 后运行 node tests/serve.mjs，然后打开 http://127.0.0.1:8790/mech-lab/ 。此预览刻意使用子路径，以检查 GitHub 项目站点资源路径。
