# UI 实现规范与历史缺陷规避清单

本文是 [响应式 UI/UX 规范](02-ui-ux.md) 的落地配套：前者说明"界面应该长什么样"，本文说明"代码里必须怎么写"，并把已经踩过的坑逐条固化，避免重复发生。

适用对象：新增页面、修改筛选/工具条、迁移或合并 CSS、调整 Element Plus 用法。

## 1. 样式出口与分层

| 层 | 文件 | 允许放什么 |
| --- | --- | --- |
| 设计令牌 | `apps/web/src/ui/tokens.css` | 颜色、字体、间距、圆角、控件尺寸档、筛选控件宽度档，以及 Element Plus `--el-*` 映射 |
| 基础样式与工具类 | `apps/web/src/ui/system.css` | 元素级基线、组件库覆写、外壳（侧栏/顶栏/底部导航）、工具类与紧凑模式规则 |
| 共享组件 | `apps/web/src/shared/components/*`、`apps/web/src/ui/*` | 组件的结构 + 自己的 scoped 样式 |
| 页面 | `apps/web/src/modules/**/pages/*.vue` | 只引用令牌与工具类，**不写控件尺寸魔法数字** |

铁律：**页面不逐页覆写组件库的尺寸与间距**。需要新尺寸时先加令牌（tokens.css），再加工具类（system.css），最后页面引用。

## 2. 控件尺寸与间距规范

### 2.1 数字档位

| 场景 | 桌面 | 紧凑 | 令牌 |
| --- | --- | --- | --- |
| 单行控件高度（输入、下拉、日期、按钮） | 40px | 44px | `--control-h` |
| 小号控件（表格内、分页内、工具条内小按钮） | 32px | 36px | `--control-h-sm` |
| 行内文字按钮（`is-link`/`is-text`） | 28px | 28px | `--control-h-inline` |
| 圆形图标按钮（`is-circle`） | 36px | 44px | 见 `system.css` |
| 搜索输入框宽度 | 280px | 100% | `--control-w-search` |
| 下拉 / 数字输入宽度 | 168px | 100% | `--control-w-select` |
| 日期区间宽度 | 280px | 100% | `--control-w-date` |
| 筛选项之间的间距 | 12px | 12px | `--filter-gap` |
| 页面区块之间的间距 | 24px | 20px | `.ui-page` |
| 工具条与下方内容的间距 | 16px | 16px | `.ui-toolbar` |

### 2.2 Element Plus 的默认值不可信

Element Plus 自身的默认尺寸并不统一，必须依赖 `system.css` 的覆写：

- `.el-button` 默认 `height: 32px`（固定值，不跟随 `--el-component-size`）。
- `.el-select__wrapper` 默认 `min-height: 32px`。
- `.el-input__wrapper` / 日期控件跟随 `--el-component-size`（本仓库映射为 `--control-h`，即 40/44px）。
- `.el-date-editor--daterange` 默认宽 350px，与其它控件不同源。

因此 `system.css` 已统一为：按钮、下拉、日期控件的默认高度都取 `--control-h`，小号档取 `--control-h-sm`，行内文字按钮保持 28px。**页面里不要再写 `height`/`min-height`/`width` 去修控件尺寸**，只允许使用 2.3 的工具类。

### 2.3 工具类与组件

| 用途 | 用法 |
| --- | --- |
| 筛选条 / 工具条容器 | `class="ui-toolbar"`；只放控件，控件自动获得统一宽度与 12px 间距 |
| 收尾操作（查询/重置/清空） | `<div class="ui-toolbar__end">`（贴右，紧凑模式整行等分） |
| 弹层内的筛选表单（多列） | `class="ui-filter-grid"`（3 列，子项自动铺满；紧凑模式单列） |
| 列表页标准筛选条（含结果条数） | 共享组件 `WorkspaceFilterBar`（`search`/`filters`/`actions` 插槽 + `resultLabel`） |
| 工作台/审批中心筛选 | `WorkbenchFilterControls`（桌面直接嵌入 `ui-toolbar`，抽屉内传 `stacked`） |
| 页头 | `AppPageHeader`（`title`/`description`/`eyebrow` + `#actions`/`#meta`），紧凑模式自动纵向 |
| 页面根 | `class="ui-page"`（提供 24/20px 纵向节奏） |
| 表单字段栅格 | `ui-fields` + `ui-field-full` |

筛选条的推荐写法：

```vue
<div class="ui-toolbar">
  <el-input v-model="keyword" clearable placeholder="搜索标题" />
  <el-select v-model="status" clearable placeholder="全部状态"><!-- ... --></el-select>
  <el-date-picker v-model="range" type="daterange" />
  <div class="ui-toolbar__end">
    <el-button type="primary" :icon="Search" @click="search">查询</el-button>
    <el-button :icon="Refresh" @click="reset">重置</el-button>
  </div>
</div>
```

## 3. 响应式实现约定

1. 用 `useLayoutMode()` 的 `isCompact` 决定结构（`v-if`），同一时刻只挂载一套呈现；纯样式差异用 `html[data-layout='compact'] .xxx` 选择器，**不要用 `@media` 切换布局**（媒体查询只用于打印）。
2. 紧凑模式下：筛选控件单列铺满（`ui-toolbar` 的工具类已覆盖）、页头纵向、列表转卡片（`UiDataList`）、弹层全屏（`UiDialog`）。
3. 触控目标不小于 44px。

## 4. 历史缺陷与规避清单

以下问题都在本仓库真实发生过，逐条给出"现象 → 根因 → 正确做法"。

### 4.1 同一行里按钮比输入框矮一截

- 现象：筛选行里下拉、按钮比输入框和日期控件矮 8px，全站每个页面都有。
- 根因：Element Plus 的 button/select 是固定 32px，input 跟随 `--el-component-size`（40px）。
- 做法：由 `system.css` 统一高度（见 2.2），页面不写高度。

### 4.2 筛选控件"零间距"、操作按钮垂直悬空

- 现象：筛选控件挤在一起没有间距、日期控件莫名换到第二行、右侧"重置"按钮悬在两行中间。
- 根因：筛选控件被放进一个**块级容器**（`display: block`），子元素退化成内联流排版；Vue 模板会把标签之间的空白压缩掉，于是控件之间**间距为 0**；同时外层 flex 的 `align-items: center` 让按钮对着"两行高"的容器做垂直居中。
- 做法：筛选容器必须是 flex/grid，并显式给 `gap`（用 `ui-toolbar` 或 `--filter-gap`），操作按钮放进 `ui-toolbar__end`。

### 4.3 同类控件在不同页面尺寸不同

- 现象：搜索框 130/160/180/320/360/380/420px，下拉 140–180px，日期 240/270/280/350px 各写各的。
- 根因：页面各自写魔法数字，组件库默认值又各不相同。
- 做法：只用 `--control-w-search` / `--control-w-select` / `--control-w-date` 三个宽度档。

### 4.4 共享组件的样式前缀与根元素类名不一致

- 现象 1：`WorkspaceFilterBar` 的边距、宽度、紧凑模式规则全部失效（涉及合同、印章、物资总览、零星采买物资库四个页面）——组件 scoped 样式全部以 `.workspace-filter-bar` 为前缀，但根元素 class 里根本没有这个类。
- 现象 2：门户「栏目内容」抽屉改版后，模板用 `portal-category-list` / `portal-category-pagination`，样式却写成了模板里不存在的 `portal-content-list-drawer*`，等于没写。
- 做法：组件样式前缀必须出现在根元素上；模板类名与样式选择器必须逐一对得上；E2E 用 `data-testid` 定位，不依赖样式类名。

### 4.5 把表单栅格当筛选条用

- 现象：按钮被拉成 248px 宽的整列。
- 根因：`.ui-filter-grid` 是 3 列等分栅格，按钮作为栅格子项被拉满一列。
- 做法：筛选条用 `ui-toolbar`，操作按钮放 `ui-toolbar__end`；`ui-filter-grid` 只用于弹层内的字段栅格。

### 4.6 页面根缺 `ui-page`，区块零间距并出现双发丝线

- 现象：内容管理页页头与指标带直接贴合（两条 1px 线叠成双线），指标带紧贴筛选条。
- 根因：页面根没有 `ui-page`（或等价 `gap`），区块间距靠各区块自己的 margin 拼凑。
- 做法：页面根一律 `class="ui-page"`；区块间距由容器 `gap` 统一提供，区块自身不写纵向 margin。

### 4.7 CSS 合并/删除文件后类名仍在被引用

- 现象：`src/styles/*.css`、`modules/*/styles/*.css` 被删除合并后，一批组件整块失去样式：`/start` 发起申请页（标题、搜索框、卡片列表全部裸奔）、工作台页头（刷新按钮掉到描述下方）、工作台待阅/已阅列表（红点与分隔线消失）、审批单据抽屉（工作台任务详情无版式）、工作台标签间距、门户内容编辑抽屉（无 2 列栅格、富文本编辑器无边框与工具条）、门户栏目内容抽屉、门户内容审计抽屉、账号安全面板图标。
- 根因：迁移时按"文件"删除，而不是按"类名"核对引用方；且这些组件散落在页面、弹层、抽屉里，只看首屏看不出来。
- 做法：删除任何 CSS 文件前，按第 5 节做两遍核对——静态一遍（模板类名 ↔ 全站样式定义），有弹层/抽屉的再逐个打开跑一遍运行时审计；对每个"无定义"的类名逐个确认是迁移到位还是无样式钩子。

### 4.8 紧凑模式纵向 flex 中的 `flex-basis`

- 现象：手机端页头下方出现约 200px 空白。
- 根因：`.page-header__copy { flex: 1 1 320px }` 在桌面横向布局合理，切到 `flex-direction: column` 后 320px 变成了"高度"。
- 做法：切换到纵向时把 `flex` 改成 `0 0 auto`。

### 4.9 同一文件里两段重复且冲突的样式块

- 现象：统计看板工具条的控件宽度在两段规则里各不相同，最终生效的与设计意图不符。
- 根因：改样式时新增了一段，忘了删除旧段。
- 做法：合并同类规则，组件样式块保持单一职责；改动后检查是否存在同选择器重复定义。

### 4.10 写了类名但没有对应样式

- 现象：工作台移动端筛选抽屉里控件零间距堆叠。
- 根因：`stacked` 只输出了 `is-stacked` 类名，全站没有任何 `.is-stacked` 规则。
- 做法：模板新增类名前先确认样式；把"模板类名 ↔ 样式定义"的核对放进自查清单。

### 4.11 数字输入框在工具条里过宽

- 现象：`el-input-number`（金额下限/上限）用搜索框宽度档时，加减按钮被拉到两端，中间大片空白。
- 做法：`ui-toolbar` 中 `el-input-number` 使用 `--control-w-select`（168px）。

## 5. 类名与样式审计方法

### 5.1 静态一遍：模板类名 ↔ 全站样式定义

在仓库根目录执行，列出"模板里在用、但全站没有任何样式定义"的类名（`el-*`、状态类等前缀已排除）。它会带来少量表达式误报，需要人工扫一眼：

```bash
node -e '
const fs = require("fs"), path = require("path");
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules") walk(p, out); }
    else if (/\.(vue|css)$/.test(e.name)) out.push(p);
  }
  return out;
};
const defined = new Set(), used = new Map();
for (const f of walk("apps/web/src")) {
  const text = fs.readFileSync(f, "utf8");
  const styles = f.endsWith(".css") ? [text] : (text.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []);
  for (const s of styles) for (const m of s.match(/\.[a-zA-Z][a-zA-Z0-9_-]*/g) || []) defined.add(m.slice(1));
  if (!f.endsWith(".vue")) continue;
  const template = (text.match(/<template>([\s\S]*)<\/template>/) || ["", ""])[1];
  for (const m of template.match(/class="([^"]*)"/g) || [])
    for (const c of m.slice(7, -1).split(/\s+/)) if (c) used.set(c, f);
}
for (const [c, f] of [...used].sort())
  if (!defined.has(c) && !/^(el-|is-|v-|js-|vue-flow)/.test(c) && c.length > 2) console.log(c, "<-", f);
'
```

### 5.2 运行时一遍：把弹层、抽屉都打开

在浏览器控制台执行。**注意：开发模式下 Vite 把大部分组件样式注入 `document.adoptedStyleSheets`，只遍历 `document.styleSheets` 会漏掉它们，导致误报。**

```js
(() => {
  const defined = new Set();
  const sheets = [...document.styleSheets, ...(document.adoptedStyleSheets || [])];
  for (const sheet of sheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    const walk = (list) => {
      for (const rule of list || []) {
        if (rule.selectorText) {
          for (const m of rule.selectorText.match(/\.[a-zA-Z][a-zA-Z0-9_-]*/g) || []) {
            defined.add(m.slice(1));
          }
        } else if (rule.cssRules) {
          walk(rule.cssRules);
        }
      }
    };
    walk(rules);
  }
  const domClasses = new Set();
  for (const el of document.querySelectorAll('*')) {
    for (const c of el.classList) domClasses.add(c);
  }
  const skip = /^(el-|is-|v-|js-|vue-flow|arrow|d-arrow|number|connectable|nodrag|nopan|source|target|cell|hidden-columns|btt|rtl|available|today|prev-month|next-month|btn-prev|btn-next|asterisk)/;
  return [...domClasses].filter((c) => !defined.has(c) && !skip.test(c) && c.length > 2).sort();
})();
```

对每个页面（含弹层、抽屉打开状态）执行一次，输出即"当前页面用了但没有任何样式定义"的类名；结合"是否是页面语义钩子"判断，是真缺失就补样式。

## 6. 提交前自查清单

- [ ] 新增/修改的控件尺寸只用了令牌，没有 `height`/`min-height`/`width` 魔法数字。
- [ ] 筛选条使用 `ui-toolbar` 或 `WorkspaceFilterBar`；操作按钮在 `ui-toolbar__end`；同一行控件等宽等高。
- [ ] 页面根是 `ui-page`；区块间距由 `gap` 提供，没有区块自带纵向 margin 造成叠加。
- [ ] 组件 scoped 样式的前缀类名出现在根元素上；模板里新增的语义类名都有对应样式（或明确是无样式钩子）。
- [ ] 紧凑模式（桌面窗口缩到 390px 或用移动端项目）验证过：筛选控件单列铺满、操作按钮等分、页头无异常留白。
- [ ] 删除或迁移 CSS 文件时，用第 5 节脚本核对过所有页面与弹层。
- [ ] 移动端弹层/抽屉内的控件也验证过间距与高度。
- [ ] 运行 `npm run lint`、`npm run typecheck -w @oa/web`、`npm run test -w @oa/web`；涉及布局的改动再跑 `npx playwright test`。

## 7. 相关文档

- [响应式 UI/UX 规范](02-ui-ux.md)：页面清单、信息架构、视觉取向、可访问性与打印要求
- [ADR-0003 前端呈现层按 MiniMax 体系重做（现行）](../adr/0003-minimax-frontend-rewrite.md)
- [ADR-0001 Element Plus 平台 UI](../adr/0001-element-plus-platform-ui.md)
