# 第三方组件与字体声明

AI Carry 看板是可直接通过 `file://` 打开的离线产物。React、Three.js、Motion、React Flow、Lenis、Radix UI、Tailwind CSS、Lucide 及其生产依赖已经编译进 `dashboard/dist/index.html`；经修改的 shadcn/ui 源码模板、字体、快照和许可证文件作为本地同级资源分发。运行时不读取 CDN，也不要求用户安装 Node、框架或系统中文字体。

## 经修改并纳入源码的组件模板

`dashboard/src/components/ui/button.tsx`、`badge.tsx`、`dialog.tsx` 与 `dashboard/src/lib/utils.ts` 由 [shadcn/ui](https://github.com/shadcn-ui/ui) 的 New York v4 模板改写而来，`dashboard/src/index.css` 也沿用了其 Tailwind v4 主题脚手架结构后进行了大幅重写。项目修改了尺寸、视觉、中文无障碍文案、设计令牌和应用集成；上游部分仍适用 MIT 许可证及 `Copyright (c) 2023 shadcn` 声明。

固定上游提交、逐文件映射、修改关系和许可证摘要位于 `dashboard/public/licenses/source-code/source-components.json`，准确 MIT 文本位于同目录的 `shadcn-ui-MIT.txt`；两者都会复制到最终离线产物。shadcn/ui 不是本项目的 npm 运行依赖，因此必须在生产依赖自动清单之外单独保留这份声明。

## 随看板分发的字体

| 字体 | 看板职责 | 版本 | 许可 |
| --- | --- | --- | --- |
| Noto Sans SC | 中文正文、界面标签、英文与数字 | 2.004-H2，可变字重 100–900 | SIL OFL 1.1 |
| Space Grotesk | 品牌字样、展示标题、大数字 | 2.000，可变字重 300–700 | SIL OFL 1.1 |
| Noto Sans Mono CJK SC | 代码、路径、ID、中英技术文本；Regular 与 Bold | 2.004 | SIL OFL 1.1 |

精确来源、上游文件与产物 SHA-256、格式转换说明见 `dashboard/public/fonts/font-manifest.json`。每个字体家族的原始 OFL 文本位于 `dashboard/public/licenses/fonts/`，并会复制到最终 `dashboard/dist/licenses/fonts/`。格式转换只把上游 TTF／OTF 转成 WOFF2，不裁剪字符、不修改字形。

Noto Sans SC 的上游版权声明保留了 Adobe 的 Reserved Font Name `Source`；本项目未以 `Source` 命名转换产物。Noto Sans Mono CJK SC 的上游包未声明 Reserved Font Name，Space Grotesk 的 OFL 头也未声明 Reserved Font Name。四个 WOFF2 产物均已核对转换前后的版权、名称、版本、商标、OFL 元数据、字形数量和 Unicode 映射数量一致；许可证文本也与固定来源逐字节规范化摘要一致。

## 看板直接运行依赖

准确版本以 `dashboard/package-lock.json` 为准。当前构建基线的直接运行依赖如下：

| 包 | 版本 | 许可 |
| --- | --- | --- |
| React / React DOM | 19.2.8 | MIT |
| Three.js | 0.185.1 | MIT |
| Motion | 12.43.0 | MIT |
| React Flow (`@xyflow/react`) | 12.11.3 | MIT |
| Lenis | 1.3.26 | MIT |
| Radix UI | 1.6.7 | MIT |
| Tailwind CSS | 4.3.3 | MIT |
| Lucide React | 1.31.0 | ISC |
| class-variance-authority | 0.7.1 | Apache-2.0 |
| clsx | 2.1.1 | MIT |
| tailwind-merge | 3.6.0 | MIT |

直接与传递生产依赖的机器可读清单和准确许可证全文分别位于：

- `dashboard/public/licenses/dashboard-production-dependencies.json`
- `dashboard/public/licenses/dashboard-production-dependencies.txt`

它们由 `npm run licenses:generate` 从锁文件中已安装的非 dev 依赖生成；正式构建会先验证其与当前锁文件和包元数据一致，再把它们复制到离线产物。

## 仅用于源码构建的工具

Vite 8.2.1、TypeScript 6.0.3、`@vitejs/plugin-react` 6.0.5、`@tailwindcss/vite` 4.3.3 以及 `@types/*` 只用于维护者从源码构建；最终用户双击看板时不会加载这些工具。它们的准确解析版本仍由锁文件固定，许可证随各 npm 包发布。

当前锁文件中的构建专用直接与传递条目只包含 MIT、Apache-2.0、ISC、0BSD、BSD-3-Clause 与 MPL-2.0。`rollup-plugin-visualizer` 只在维护者主动运行包体分析时生成本地报告，不进入页面或最终安装包；MPL-2.0 条目来自 Lightning CSS 的平台构建包。这些工具及 `node_modules` 不进入仓库候选、离线看板或安装压缩包。构建产物继续按其实际包含的运行依赖和改写源码分别携带声明。

## 未使用的外部素材与名称说明

当前仓库没有随包截图，也没有第三方随包图片、照片、插画、音视频、3D 模型、外部贴图、闭源 SDK 或付费 UI 资源；`docs/assets/project-assets.json` 当前为空。行星场景和纹理由项目代码运行时程序化生成；根看板图标是项目内联的简单几何 SVG；界面图标来自已登记的 Lucide React 依赖。文档中出现的 Codex、Claude Code、DeepSeek、QoderWork 等名称只用于说明兼容场景，不包含其商标、Logo 或产品素材，也不表示从属、授权或背书关系。

AI Carry 自身的原创代码、配置、模板和文档采用根目录 `LICENSE` 中的 Apache License 2.0。本文件只记录第三方材料；这些材料继续适用各自的许可证，不因 AI Carry 的项目许可证而改变。完整合规边界与贡献检查见 `docs/open-source-compliance.md`。正式公开发布前仍须按最终候选文件集合复核许可证文件、第三方声明、版权署名和隐私边界。
