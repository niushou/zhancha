# 地藏占察法 · 木轮相法

![项目首页](docs/homepage.jpg)

一个以《占察善恶业报经》为依据的线上木轮占察网页。暂时没有实体占察木轮时，可用网页起轮、记录轮相并对照经文；页面尽量把经文、后代仪轨说明和现代白话分开呈现。

## 功能

- 按经文介绍十九枚木轮、三组轮相与占察流程。
- 提供礼敬、发愿、供养、称名和乞请等前行文本，并标注经文内容与后代仪轨范文的来源差别。
- 支持十轮、三轮及六枚轮连续三掷，展示实际显出的轮面、每掷合数和第三轮总数。
- 按 1–189 总数对照《占察善恶业报经》轮相条目，提供现代白话说明和计算明细。
- 提供规则图鉴、术语、经文来源及占察忏法资料导读。
- 桌面和移动布局、减弱动效偏好支持；不需要账户或服务器。

## 本机运行

需要 Node.js 和 pnpm。

```bash
pnpm install
pnpm dev
```

开发服务器启动后，按终端提示打开本机地址。

```bash
pnpm check
pnpm build
```

## 项目结构

```text
src/App.tsx                         页面、导航和占察流程状态
src/components/ThreeWheelTray.tsx   三维木轮与轮面动画
src/components/AsyncWheelTray.tsx   三维组件延迟加载与回退
src/data/wheelData.ts               轮相、映射与起轮逻辑
src/data/189WheelSigns.json         一百八十九条轮相数据
src/data/wheelSignTranslations.ts   轮相现代白话说明
src/data/gameContent.ts             前行文本与流程说明
src/data/sources.ts                 资料来源
src/styles.css                      页面样式
scripts/extract_189.py              轮相数据提取与维护脚本
docs/homepage.jpg                   README 首页截图
```

## 经典与使用边界

网页依据经文和所列资料呈现线上起轮。程序生成的轮相是线上随机结果，不能伪称实体木轮，也不宣称能够断定个人命运或保证应验。经文原文、现代白话和线上程序结果在页面中分层显示；白话用于帮助阅读，不是经文原句。

网页不会要求输入姓名或所问之事，也没有账户或应用后端。请勿将轮相用于医疗、法律、财务等现实专业决策。严肃修持请依原典并参考正规的佛教机构或法师指导；占察忏法属于另行说明的修持法门，不应和单次线上起轮流程混为一谈。

## 技术栈

React、TypeScript、Vite、Three.js。
