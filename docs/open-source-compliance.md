# 开源合规与第三方来源

本文说明 Agent Carry 怎样区分项目原创内容、npm 依赖、改写源码、字体、构建工具和仅供参考的外部资料。它面向维护者和贡献者，不进入普通助手启动上下文，也不代替任何许可证正文或法律意见。

## 1. 许可边界

- Agent Carry 原创代码、配置、模板和文档按根目录 `LICENSE` 中的 Apache License 2.0 提供。
- 第三方内容不因进入 Agent Carry 而改用 Apache-2.0；其原许可证、版权、NOTICE、修改要求和其他条件继续有效。
- 贡献者只能提交自己有权按项目许可证提供的内容，或明确登记并遵守上游许可证的第三方内容。
- 未确认公开版权主体名称时，不猜写维护者个人身份；Git 历史、贡献记录与将来经维护者确认的公开署名分别处理。

正式第三方声明真源是根目录 `THIRD_PARTY_NOTICES.md`。随离线看板分发的机器清单和许可证正文位于 `dashboard/public/licenses/`，构建后原样复制到 `dashboard/dist/licenses/`。

## 2. 当前资产分类

### 项目原创或程序化生成

当前 Markdown／TOML 架构、任务协议、看板业务代码、Agent Carry 品牌几何图形、内联 favicon、CSS 视觉设计以及 Three.js 行星场景由本项目形成。行星纹理、光晕、轨道和卫星在本地运行时由代码生成，不包含外部图片或模型。

仓库当前除 README 使用的一张本项目看板截图外，没有随包照片、插画、音视频、3D 模型、外部贴图、PDF 素材、WASM、闭源 SDK、付费字体或付费 UI 包。项目自己生成的文档截图登记在 `docs/assets/project-assets.json`，保存页面来源、SHA-256 与项目许可证；第三方二进制素材还必须登记来源、版权、许可证和修改情况。自动门禁会拒绝未登记的二进制资产。

### npm 运行依赖

准确生产依赖闭包来自 `dashboard/package-lock.json` 中非开发条目。当前去重后的生产包使用 MIT、Apache-2.0、ISC、0BSD 或 BSD-3-Clause；其中 BSD-3-Clause 来自 React Flow 关系布局所需的 `d3-ease`，许可证正文随离线产物保留。准确数量由机器清单给出。机器清单与完整许可证／NOTICE 文本分别是：

- `dashboard/public/licenses/dashboard-production-dependencies.json`
- `dashboard/public/licenses/dashboard-production-dependencies.txt`

`dashboard/scripts/generate-third-party-notices.mjs` 从已安装的锁定版本重新生成它们；正式构建先检查清单没有漂移。上游 npm 包漏装许可证时，只能在 `dashboard/license-overrides/` 保存来自固定官方提交的准确副本并说明原因，不能根据 SPDX 名称自行编造版权文字。

### 改写后留在仓库中的第三方源码

按钮、徽章、对话框和 `cn` 工具函数来自 shadcn/ui 的 New York v4 模板并经过项目修改，部分 Tailwind v4 主题脚手架结构也用于 `dashboard/src/index.css`。这类代码不是 npm 依赖，必须单独登记：

- 来源映射：`dashboard/public/licenses/source-code/source-components.json`
- MIT 正文：`dashboard/public/licenses/source-code/shadcn-ui-MIT.txt`

来源映射固定到完整上游提交，列出本地文件、上游文件、修改关系、版权与许可证摘要。以后复制新的组件、代码片段或模板时必须新增映射，不能只因为代码“可以复制”就省略许可证。

### 字体

当前分发三个 OFL-1.1 字体家族、四个字体面：Noto Sans SC、Space Grotesk，以及 Noto Sans Mono CJK SC Regular／Bold。`dashboard/public/fonts/font-manifest.json` 固定上游提交或 Release、原文件／压缩包摘要、产物摘要、版权、Reserved Font Name 审核、许可证摘要和转换验证结果。

WOFF2 转换只进行格式压缩，不裁剪 Unicode、不修改字形。根据 OFL 对 Web 字体与 Reserved Font Name 的要求，发布前必须确认转换前后的版权、名称、版本、商标、许可证元数据、字形数量和字符映射保持一致；否则应视为修改版并重新评估命名。准确 OFL 文本随字体一起分发。

### 构建工具

Vite、TypeScript、Tailwind 构建插件、类型包及其传递依赖只用于生成离线看板，不随最终安装包分发，`node_modules` 也绝不进入候选。当前锁文件内构建条目的许可证集合为 MIT、Apache-2.0、ISC、0BSD、BSD-3-Clause 与 MPL-2.0；MPL-2.0 条目是 Lightning CSS 的平台构建包，不是浏览器运行代码。

锁文件仍保留准确版本和 SPDX 元数据。若构建工具代码、二进制或 NOTICE 将来被直接复制进分发包，就必须改按“随包第三方内容”登记，不能继续只视为本地工具。

### 外部资料和产品名称

架构文档会引用 Anthropic、CloudEvents、Kubernetes、Microsoft、RFC、Three.js、Motion、Radix、Astro、Lenis 等官方资料来解释设计依据。这些链接是参考来源，不表示其网页正文或示例代码已复制进项目。需要复制内容时必须重新判断许可证、引用范围与声明义务。

Codex、Claude Code、DeepSeek、QoderWork 等名称只用于兼容示例。项目不随包提供其 Logo、模型、客户端或商标素材，也不暗示从属、授权或背书关系。

## 3. 自动门禁

看板目录提供三层检查：

1. `npm run check:licenses`：生产依赖清单、版本、许可证文本和 NOTICE 与锁文件保持一致。
2. `npm run check:compliance`：检查项目许可证、已审核 SPDX 集合、shadcn/ui 来源映射、字体来源与转换证据、许可证摘要，以及未登记二进制文件和误提交的 `node_modules`。
3. `npm run build`：在前两项通过后生成离线看板，并再次确认最终 `dist` 包含字体、依赖声明、改写源码许可证且没有远程资源。

README 等文档中的项目截图也属于受管资产。门禁会根据 `docs/assets/project-assets.json` 核对路径、SHA-256、生成来源和 Apache-2.0 声明，避免个人实例截图或来源不明的视觉素材被顺手提交。

门禁只证明候选符合已经编码的规则，不代替人工来源判断。新增第三方内容时应先审查再登记，不能先把未知内容加入允许集合以消除报错。

## 4. 新增内容检查

贡献者加入代码、字体、图标、图片、模型、动画、模板、数据集或文档摘录前，至少回答：

1. 谁创建了它，来源能否固定到官方页面、版本、提交或文件摘要？
2. 许可证是否允许复制、修改、商业使用和开源再分发？
3. 是否含 NC、ND、仅限个人使用、仅限某平台、不可再分发或来源不明条款？这些内容默认不能进入公开候选。
4. 是否必须保留版权、许可证、NOTICE、作者名单、修改说明、同许可源码或 Reserved Font Name？
5. 它是实际随包内容、改写源码、运行依赖、构建工具，还是只在文档中引用？声明位置必须与真实关系一致。
6. 最终离线包是否仍能找到许可证和来源说明？

无法确认时先停止纳入候选，保留本地研究记录并向维护者说明不确定性；不能把“网上能下载”“免费”“AI 生成”或“别的开源项目也用了”当作开源授权。

## 5. 公开候选复核

每次公开候选仍需以最终文件集合重新检查，而不是沿用旧报告：

- 根 `LICENSE`、`THIRD_PARTY_NOTICES.md` 与本文件存在；
- npm 许可证清单与准确锁文件一致；
- 字体、改写源码及所有新增二进制素材都有固定来源、摘要和随包许可证；
- 没有维护者私密流程、本地工具链、`node_modules`、缓存、日志、秘密凭据或个人实例数据；
- 候选 ZIP 解压后仍能离线打开，并能从最终目录访问许可证材料。

公开发布仍须遵循私密维护流程中的独立授权；完成合规检查不等于授权创建仓库、推送、打标签或发布 Release。
