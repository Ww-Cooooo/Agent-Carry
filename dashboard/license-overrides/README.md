# 许可证来源补充

生产依赖许可证清单通常直接读取已安装 npm 包内的 `LICENSE`、`COPYING` 或 `NOTICE`。如果上游 npm 发布包漏装许可证文件，但包元数据仍声明开源许可，则在这里保存一份来自上游官方仓库的固定副本，避免构建时联网或静默省略声明。

当前只有 `react-remove-scroll-bar@2.3.8` 需要补充：该 npm 包声明 MIT，但发布包的 `files` 白名单没有包含 `LICENSE`。副本取自上游官方仓库提交 `8ca9ba5ea52de03308fe8ced94f7b159a44d28ff`，来源：<https://github.com/theKashey/react-remove-scroll-bar/blob/8ca9ba5ea52de03308fe8ced94f7b159a44d28ff/LICENSE>。

这里不是通用兜底目录。增加补充文件时必须同时记录准确包版本、官方来源和固定提交；不能凭许可证标识自行编造版权声明。
