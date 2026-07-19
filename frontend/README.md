# 小泉动漫二创平台

基于 Vue 3 + TypeScript + Vite 的动漫二创内容分享平台，支持动态主题切换和响应式布局。

![Vue](https://img.shields.io/badge/Vue-3.5-4fc08d?logo=vuedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8.0-646cff?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-06b6d4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-GPLv3-blue)

## 特性

-   **双主题系统** — 默认 macOS 风格 + Bilibili 大屏网格布局，运行时动态切换
-   **日间/暗色模式** — 每个主题内置 light / dark 两套配色，CSS 变量即时注入
-   **响应式设计** — 移动端优先，适配手机 / 平板 / 桌面
-   **用户认证** — 登录注册、会话持久化、管理员权限
-   **内容浏览** — 支持视频、图片、文字、链接四种类型，标签筛选 + 关键词搜索
-   **推荐系统** — 首页推荐内容 + 可刷新
-   **投票互动** — 内置投票组件
-   **后台管理** — 内容审核、用户管理、举报处理（需管理员权限）
-   **性能监控** — Web Vitals 跟踪（LCP / FID / CLS / TTFB / FCP）
-   **PWA 支持** — Service Worker 离线缓存 + manifest
-   **可访问性** — WCAG 2.1 AA 级 ARIA 标注、键盘导航
-   **安全渲染** — DOMPurify XSS 防护、marked + DOMPurify 安全 Markdown

## 技术栈

| 技术 | 说明 |
| ---- | ---- |
| Vue 3.5 | Composition API + `<script setup>` |
| TypeScript 6.0 | strict 模式，全量类型覆盖 |
| Vite 8.0 | 开发 / 构建，插件生态 |
| Pinia 3.0 | Setup Store 语法状态管理 |
| Tailwind CSS 4.3 | 原子类优先，`@theme` 自定义变量 |
| Vue Router 5.0 | hash 模式，懒加载 + 路由守卫 |
| ofetch | HTTP 客户端，自动重试 / 超时 |
| marked + DOMPurify | Markdown 渲染 + XSS 防护 |
| @tanstack/vue-query | 数据请求与竞态处理 |
| motion-v | 声明式动画 |
| ant-design-vue | 后台管理 UI 组件 |

## 快速开始

```bash
# 克隆项目
git clone https://github.com/huntersxy/xqecz.git
cd xqecz

# 安装依赖
npm install

# 启动开发服务器（热更新，API 代理到 localhost:8080）
npm run dev

# 生产构建
npm run build

# TypeScript 类型检查
npm run type-check

# 运行测试
npm test

# 代码格式化
npm run format
```

## 项目结构

```
src/
├── api/              # HTTP 请求层（authApi / contentApi / commentApi / pollApi / adminApi）
├── assets/           # 静态资源（Logo、背景图、Tailwind 入口 CSS）
├── themes/           # 主题文件，自动扫描注册
│   ├── DefaultTheme.vue       # macOS 卡片风格
│   └── BilibiliStyleTheme.vue # 大屏网格布局
├── components/       # 通用 UI 组件
│   ├── admin/        # 后台管理专用组件
│   ├── ErrorBoundary.vue      # 错误边界
│   ├── MarkdownModal.vue      # 公告弹窗
│   ├── PollComponent.vue      # 投票
│   ├── ConfirmDialog.vue      # 全局确认对话框
│   └── HomeContentCard.vue    # 内容卡片
├── composables/      # 组合式函数
│   ├── useThemeRegistry.ts    # 主题自动注册 + applyThemeColors
│   ├── useSearchFilter.ts     # 搜索 / 标签筛选 + localStorage 缓存
│   ├── useContentLoader.ts    # 内容加载 + @tanstack/vue-query
│   ├── useRecommendLoader.ts  # 推荐内容加载
│   ├── useHomeLogic.ts        # 首页业务编排
│   └── useToast.ts            # Toast + Confirm 全局单例
├── router/
│   └── index.ts      # 路由表 + 导航守卫 + 后台预加载
├── stores/           # Pinia 全局状态
│   ├── theme.ts      # 主题切换（currentTheme + mode）
│   ├── home.ts       # 首页状态缓存（搜索 / 分页 / 滚动位置）
│   └── user.ts       # 登录态 / 用户信息
├── types/
│   └── index.ts      # 全局 TypeScript 类型定义
├── utils/
│   ├── index.ts             # 图片 URL / 时间 / Markdown 渲染工具
│   ├── constants.ts         # 共享常量（CC 协议文本等）
│   └── webVitals.ts         # Web Vitals 性能监控
├── views/            # 页面级组件（薄路由层）
├── App.vue           # 根组件（导航 / 页脚 / Toast / Confirm 容器）
└── main.ts           # 入口（createApp → Pinia → Router → mount）
```

## 页面路由

| 路径 | 说明 | 权限 |
| ---- | ---- | ---- |
| `/` | 首页 — 推荐内容 + 搜索 + 标签筛选 | 公开 |
| `/content/:id` | 内容详情 | 公开 |
| `/login` | 登录 / 注册 | 公开 |
| `/easter-egg` | 彩蛋空间 | 公开 |
| `/theme` | 主题设置 | 公开 |
| `/music` | 音乐播放器 | 公开 |
| `/admin` | 后台管理（内容审核 / 用户管理 / 举报） | 管理员 |

## 主题系统

主题系统通过 `import.meta.glob` 自动扫描 `src/themes/` 下的 `.vue` 文件，无须手动注册。

### 内置主题

| 主题 | key | 说明 |
| ---- | --- | ---- |
| 默认主题 | `default` | macOS 风格卡片布局，窗口圆点标题栏 |
| Bilibili 风格 | `bilibiliStyle` | 大屏网格布局，B 站蓝粉配色，无限滚动 |

### 创建新主题

参考 [theme.md](./theme.md) 获取完整主题开发指南。核心步骤：

1. 在 `src/themes/` 创建 `XxxTheme.vue`
2. `<script lang="ts">` 导出 `themeMeta`（key / name / colors 等）
3. `<script setup>` 中实现布局和数据加载
4. 保存即生效，系统自动注册

### 日间 / 暗色切换

每个主题的 `themeMeta.colors` 包含 `light` 和 `dark` 两套配色。`applyThemeColors()` 运行时注入 CSS 变量，`ConfigProvider` + `darkAlgorithm` 自动处理 antd 组件暗色适配。

## 数据流

```
View（薄层，组装组件）
  └── Composable（业务逻辑，调用 API + Store）
        ├── Store（Pinia，跨组件共享状态）
        └── API（ofetch，HTTP 通信）
              └── Type（types/index.ts，请求 / 响应类型约束）
```

-   View 只管渲染，不直接调 API
-   Composable 管逻辑，拥有本地状态
-   Store 管全局状态（theme / home / user 三个领域）

## 开发规范

-   `<script setup lang="ts">` — 所有组件统一语法
-   Props 用纯类型 `defineProps<Props>()`
-   Tailwind 原子类优先，非必要不写 CSS
-   样式必须加 `scoped`
-   使用 `@/` 别名导入，禁止相对路径
-   API 调用必须通过 `@/api` 模块，禁止组件内直接调 `fetch`
-   所有 async 函数用 try / catch 包裹

## 环境变量

```bash
# API 基础地址
VITE_API_BASE_URL=http://localhost:8080/api

# 生产环境
VITE_API_BASE_URL=https://xqapi.xiey.work/api
```

## 许可证

本项目采用 **GNU General Public License v3.0** 许可证。详见 [LICENSE](./LICENSE)。
