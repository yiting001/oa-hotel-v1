# ADR-0003: 前端呈现层按 MiniMax 体系重做，并采用「双呈现」自适应

- 状态：已接受
- 日期：2026-09-24
- 取代：ADR-0002（暖奶油编辑式体系）

## 背景

ADR-0002 的暖奶油体系是在旧页面上换令牌与排版，页面模板、桌面/手机结构基本沿用。实际使用中暴露出三类问题：

1. **同页多套控件尺寸/配色**，ant-design-vue 与 Element Plus 两套库靠 CSS 互相覆写，ant 的 CSS-in-JS 优先级还高过样式表，改样式经常不生效。
2. **手机端只是把桌面表格压小**：同一份数据同时挂载表格与卡片，用 CSS 隐藏其中一套，分页与记录范围在两端还不一致。
3. 视觉语言缺乏统一依据，页面靠逐页调参收敛。

## 决策

1. **呈现层整体重做**，采用 MiniMax 式界面语言：白画布、浅灰分区、近黑文字、黑色胶囊主按钮、蓝色聚焦环、DM Sans（本地打包，中文回退系统无衬线）。旧模板与旧样式不作为新设计模板。
2. **组件库收敛到 Element Plus 一套**，移除 ant-design-vue 与 @ant-design/icons-vue 及其覆写层（`apps/web/src/styles/*` 全部删除）。主题令牌集中在 `src/ui/tokens.css`，基础样式与外壳在 `src/ui/system.css`。
3. **自适应 = 两套呈现结构，而不是缩放桌面版**：`src/ui/useLayoutMode.ts` 按可用宽度选择 `desktop` / `compact`（同时写 `html[data-layout]` 供样式辅助），`src/ui/UiDataList.vue` 在电脑上渲染表格、在紧凑模式渲染卡片，**同一时刻只挂载一套**；`UiPagination`、`UiDialog` 同理（紧凑模式为全屏弹层）。
4. **状态归控制器，呈现归视图**：筛选、分页、勾选、草稿、校验与命令留在页面/Store，视图只读取同一份状态，因此切换宽窄不丢数据、不改变记录范围。
5. **业务协议不变**：路由、权限、API、金额分单位、日期字符串格式、状态机、幂等键、版本不可变、A4 纸面尺寸与历史模板绑定都保持原样。

## 后果

- 去掉第二个组件库后主包体积从 2.19 MB 降到 1.10 MB。
- 新增页面必须使用 `src/ui` 的呈现组件与全局工具类（`.ui-page/.ui-toolbar/.ui-actions/.ui-fields/.ui-section/.ui-summary/.ui-text-muted`），不再逐页引入组件库覆写。
- 旧骨架类名（`.enterprise-*`、`.portal-*`、`.iam-*` 等）随旧样式一并移除；e2e 中依赖旧结构的定位断言已按新结构（角色 + testid）重写，业务断言保持不变。
- 组件库主题的映射口只剩 `src/ui/tokens.css`：`--el-*` 变量与设计令牌同源，改一处即可全局生效。

## 踩坑记录

- **不要在 scoped 样式里写 `:global(html[data-layout='compact']) .x { … }`**：当前 Vue 版本的 scoped 编译会丢掉后代选择器，规则会落到 `html` 自身，曾导致窄屏整页 `display: none`。正确做法是在组件根节点绑定 `:data-compact="isCompact"`，再写 `.root[data-compact='true'] .x { … }`。
- Element Plus 输入框边框由 `box-shadow` inset 绘制，`box-shadow: none` 会连边框一起清掉；日期等复合控件用双类选择器锁高，覆写时要带上同等权重。
- ant-design-vue 的表格样式由 CSS-in-JS 注入，选择器优先级高于外部样式表，若保留该库必须走 ConfigProvider 组件 token。
