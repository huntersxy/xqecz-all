# AGENTS.md

## 关键命令

```bash
# 启动开发服务器（热更新，API 代理到 localhost:8080）
npm run dev

# 生产构建（先 type-check 再 vite build）
npm run build

# 仅 TypeScript 类型检查（不构建）
npm run type-check

# 完整 lint：oxlint + eslint 自动修复
npm run lint

# Prettier 格式化 src/ 下所有文件
npm run format
```

---

## 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Vue | ^3.5 | Composition API + `<script setup>` |
| 语言 | TypeScript | ~6.0 | strict 模式，全量类型覆盖 |
| 构建 | Vite | ^8.0 | 开发/构建，插件生态 |
| 路由 | vue-router | ^5.0 | hash 模式，懒加载，路由守卫 |
| 状态 | Pinia | ^3.0 | Setup Store 语法 |
| CSS | Tailwind CSS | ^4.3 | 原子类优先，`@theme` 自定义变量 |
| HTTP | ofetch | ^1.5 | 统一封装，自动重试，超时控制 |
| Markdown | marked + DOMPurify | ^18.0 / ^3.4 | 渲染 + XSS 防护 |
| 动画 | motion-v | ^2.2 | 声明式动画 |
| 校验 | oxlint | ~1.60 | Rust 高性能 lint（correctness 规则） |
| 校验 | ESLint | ^10.2 | vue-ts + oxlint 插件 |
| 格式化 | Prettier | 3.8 | 统一代码风格 |
| 图像 | vite-plugin-image-optimizer | ^1.1 | 构建时压缩 PNG/JPEG/WebP/AVIF/SVG |

---

## 架构

### 目录结构

```
src/
├── api/              # HTTP 请求层，按业务域分模块导出
│   └── index.ts      # authApi / contentApi / commentApi / pollApi / adminApi
├── assets/
│   └── main.css      # Tailwind 入口 + 基础样式（不含主题变量）
├── themes/           # 主题 .vue 文件，自动扫描注册
│   ├── DefaultTheme.vue
│   └── BilibiliStyleTheme.vue
├── components/
│   ├── admin/        # 后台管理组件（Sass + antd）
│   └── *.vue         # 通用 UI 组件
├── composables/      # 组合式函数
│   └── useThemeRegistry.ts  # 主题注册 + applyThemeColors
├── router/
│   └── index.ts      # 路由表 + 导航守卫 + 后台预加载队列
├── stores/           # Pinia 全局状态
│   ├── theme.ts      # 主题切换（currentTheme + mode）
│   ├── home.ts       # 首页搜索/筛选/分页/滚动位置缓存
│   └── user.ts       # 登录态 / 用户信息
├── types/
│   └── index.ts      # 所有 TypeScript 类型定义
├── utils/
│   ├── index.ts      # getImageUrl / formatTime / renderMarkdown / getPreviewText
│   └── constants.ts  # CC 协议文本 / 视频条款文本
├── views/            # 页面级组件（薄路由层，逻辑下沉到 composables）
├── App.vue           # 根组件：导航栏/页脚/Toast/Confirm 容器
└── main.ts           # 入口：createApp → Pinia → Router → mount
```

### 数据流

```
View（薄层，组装组件）
  └── Composable（业务逻辑，调用 API + Store）
        ├── Store（Pinia，跨组件共享状态）
        └── API（ofetch，HTTP 通信）
              └── Type（types/index.ts，请求/响应类型约束）
```

- **View 只管渲染**：从 composable 取数据，绑定到模板，不直接调 API
- **Composable 管逻辑**：拥有本地状态，调用 API 和 Store，暴露方法给 View
- **Store 管全局状态**：theme / home / user 三个领域，Setup Store 语法

### 主题系统（Sass + Tailwind CSS）

一个主题一个 `.vue` 文件，放在 `src/themes/`，自动扫描注册。每个主题包含 `themeMeta` 导出（含 light/dark 两套颜色），运行时通过 `applyThemeColors()` 注入 CSS 变量。

1. **主题文件**（`src/themes/*.vue`）：`<script>` 导出 `themeMeta`，`<script setup>` 定义布局，`<style lang="scss" scoped>` 定义样式
2. **注册中心**（`composables/useThemeRegistry.ts`）：`import.meta.glob` 同步扫描，`registerTheme()` 注册
3. **状态管理**（`stores/theme.ts`）：`currentTheme` + `mode`（light/dark），切换时调用 `applyThemeColors()`
4. **后台适配**：antd `ConfigProvider` + `darkAlgorithm` 自动处理暗色，自定义样式用 CSS 变量

### 路由懒加载 + 预加载

- 所有视图使用 `defineAsyncComponent` 按需加载
- 首页加载后通过 `requestIdleCallback` 按优先级延迟预加载其他视图

---

## 规范

### 一、Vue 组件

#### 1.1 模板
- **必须**使用 `<script setup lang="ts">`
- Props 用纯类型语法 `defineProps<Props>()`，默认值用 `withDefaults`
- Emits 用类型语法 `defineEmits<{ event: [payload: Type] }>()`
- 需要暴露给父组件的方法/状态用 `defineExpose({ ... })`
- 样式**必须**加 `scoped`

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
})

const emit = defineEmits<{
  submit: [value: string]
  cancel: []
}>()
</script>

<template>
  <div class="...">{{ props.title }}</div>
</template>

<style scoped>
/* 仅当 Tailwind 无法实现时写在这里 */
</style>
```

#### 1.2 组件拆分
- View 组件尽量薄，不超过 **200 行**
- 通用组件不超过 **500 行**
- 业务逻辑必须下沉到 composable
- `components/admin/` 下为后台专用组件，`components/home-themes/` 下为主题布局组件

#### 1.3 组件通信
- 父子：Props down / Emits up
- 跨组件共享状态：Pinia Store
- 临时跨层级：`provide/inject`（仅在主题配置等场景）

### 二、样式

#### 2.1 Tailwind 优先（强制）
**能用 Tailwind 原子类实现的效果，禁止写普通 CSS。**

- 间距、颜色、字体、边框、阴影、圆角等一律用 Tailwind 类
- 响应式用 `sm:` / `lg:` / `xl:` 前缀
- 暗色模式用 `dark:` 前缀（如项目引入）
- 状态变体：`hover:` / `focus:` / `disabled:`
- 过渡动画：`transition-*` / `duration-*` / `ease-*`

```vue
<!-- 正确 -->
<div class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">

<!-- 错误 -->
<div style="padding: 8px 16px; background: #3b82f6;">
```

#### 2.2 主题变量
项目通过 `applyThemeColors()` 运行时注入 CSS 变量，可直接用 Tailwind 任意值语法：

```vue
<span class="text-[var(--theme-text)]">...</span>
<div class="bg-[var(--theme-card-bg)] rounded-xl shadow-md">...</div>
```

常用变量：`--theme-text`、`--theme-text-secondary`、`--theme-primary`、`--theme-surface`、`--theme-card-bg`、`--theme-card-border`、`--theme-hover-bg`、`--theme-bg-color`、`--admin-bg`（完整列表见 `theme.md`）

### 三、TypeScript

- 开启 `strict: true`
- 类型定义集中于 `src/types/index.ts`
- 环境变量类型定义在 `env.d.ts`
- 统一使用 `@/` 别名导入（对应 `src/`），禁止相对路径 `../../`
- `vue-router` 的 RouteMeta 通过 `declare module` 扩展
- 禁止 `any`，除非是第三方库的不得已场景

```ts
// 正确
import { useUserStore } from '@/stores/user'
import type { Content } from '@/types'

// 错误
import { useUserStore } from '../../stores/user'
```

### 四、API 层

- 所有 HTTP 请求通过 `@/api` 统一出口，禁止在组件中直接调用 `ofetch`
- 按业务域分模块：`authApi` / `contentApi` / `commentApi` / `pollApi` / `adminApi`
- 统一响应格式：

```ts
interface ApiResponse<T = unknown> {
  code: number    // 200 = 成功
  message: string
  data: T
}
```

- 文件上传使用 `FormData` + `XMLHttpRequest`（需要进度回调）
- 普通请求使用 `ofetch`，内置 3 次重试、10 秒超时
- 拦截器通过 `addInterceptor()` 注册（统一处理 401 跳转登录等）

```ts
// 正确：通过 api 模块调用
import { contentApi } from '@/api'
const res = await contentApi.list({ page: 1 })

// 错误：直接调 ofetch
import { ofetch } from 'ofetch'
const res = await ofetch('/api/content/list')
```

### 五、Composable（组合式函数）

- 文件名以 `use` 开头，camelCase：`useContentLoader.ts`
- 函数名与文件名一致
- 返回**对象**（非数组），便于按需解构
- 有副作用的逻辑（watch/onMounted）放在 composable 内，不在 View 中

```ts
// src/composables/useXxx.ts
export function useXxx() {
  const data = ref<Type[]>([])
  const loading = ref(false)

  async function fetch() { /* ... */ }

  return { data, loading, fetch }
}
```

### 六、Pinia Store

- 使用 Setup Store 语法（`defineStore('name', () => { ... })`）
- Store 文件命名：`stores/<domain>.ts`
- Store 命名：`use<Domain>Store`
- 仅存放真正需要跨组件/跨路由共享的状态

```ts
export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<ThemeType>(getDefaultTheme())

  function setTheme(theme: ThemeType) { /* ... */ }

  return { currentTheme, setTheme }
})
```

### 七、命名规范

| 对象 | 规范 | 示例 |
|------|------|------|
| Vue 组件 | PascalCase | `HomeContentCard.vue` |
| 视图组件 | PascalCase + `View` 后缀 | `HomeView.vue` |
| Composable | camelCase + `use` 前缀 | `useContentLoader` |
| Pinia Store | camelCase + `use` 前缀 + `Store` 后缀 | `useThemeStore` |
| API 模块 | camelCase + `Api` 后缀 | `contentApi` |
| Type 文件 | 集中 `types/index.ts` | — |
| 常量 | SCREAMING_SNAKE_CASE | `CC_LICENSE_TEXT` |
| CSS 变量 | kebab-case + `--theme-` 前缀 | `--theme-primary` |

### 八、错误处理

- 所有 async 函数内用 try/catch 包裹
- catch 中至少 `console.error` 记录
- 用户可见错误通过 `emit('message', text)` 或 toast 反馈
- 请求竞态用**自增 requestId** 模式防抖：

```ts
let requestId = 0

async function load() {
  const currentId = ++requestId
  const res = await api()
  if (currentId !== requestId) return  // 过期响应，丢弃
  data.value = res.data
}
```

### 九、格式化

所有项目文件必须符合以下规则（由 Prettier + EditorConfig 强制）：

| 规则 | 值 |
|------|-----|
| 缩进 | 2 空格 |
| 分号 | 无 |
| 引号 | 单引号 |
| 行宽 | 100 字符 |
| 换行符 | LF |
| 编码 | UTF-8 |
| 行尾空格 | 自动去除 |
| 文件末尾 | 保留空行 |

### 十、性能

- **路由懒加载**：所有 view 使用 `defineAsyncComponent` + `() => import(...)`，禁止同步 import
- **后台预加载**：首页渲染后，低优先级 view 通过 `requestIdleCallback` 按延迟队列预加载
- **标签缓存**：标签列表用 `localStorage` 按天缓存，减少 API 请求
- **图片懒加载**：`<img loading="lazy">`（已默认）
- **构建分包**：vite config 中 `manualChunks` 分离 vue-vendor / utils-vendor / motion-vendor

### 十一、主题开发

新增主题步骤（详见 `theme.md`）：

1. 在 `src/themes/` 创建 `XxxTheme.vue`（文件名自动注册，无编号前缀）
2. `<script>` 中导出 `themeMeta`，包含 key/name/colors 等元数据
3. `<script setup>` 中使用 `useHomeLogic()` 获取数据
4. 布局使用 `theme-*` 工具类或 Tailwind 任意值语法 `bg-[var(--theme-primary)]`
5. `<style lang="scss" scoped>` 中使用 Sass 定义样式

主题注册规则：
- 自动扫描 `src/themes/*.vue`，从导出的 `themeMeta` 获取元数据
- 每个主题包含 `colors.light` 和 `colors.dark` 两套配色
- 后台管理通过 antd `darkAlgorithm` 自动适配暗色

### 十二、分析规范

**对项目文件存在性、结构、状态的任何断言，必须先实际读取再下结论，禁止凭记忆或推测。**

- 判断目录是否为空 → 先 `read` 该目录
- 判断文件是否存在 → 先 `glob` 或 `read`
- 判断某功能是否已实现 → 先 `grep` 搜索关键代码
- 判断依赖是否被使用 → 先 `grep` 搜索 import 语句
- 评估项目质量 → 逐项核实后列出，标注"已确认"和"未确认"

```bash
# 错误：凭印象断言
"CI/CD 是空的"  # 未实际读取 .github/workflows/

# 正确：先读取再下结论
read .github/workflows/ → 确认有 deploy.yml 和 deploy-ftp.yml
```

### 十三、CI/CD

项目已有 GitHub Actions 工作流：

| 文件 | 触发条件 | 流程 |
|------|---------|------|
| `.github/workflows/deploy.yml` | 推送到 `dev` 分支 | `npm ci` → `npm run build` → 部署到 GitHub Pages |
| `.github/workflows/deploy-ftp.yml` | 推送到 `master` 分支 | `npm ci` → `npm run build` → FTP 部署到服务器 |

两者均包含 `npm run build`（type-check + vite build），确保推送代码至少能通过编译。
