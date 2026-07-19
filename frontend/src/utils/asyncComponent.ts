import { defineAsyncComponent, type AsyncComponentOptions, type Component } from 'vue'

/**
 * 创建带错误处理的异步组件
 * @param loader 组件加载函数
 * @param options 可选配置
 */
export function createAsyncComponent(
  loader: () => Promise<Component>,
  options?: Partial<AsyncComponentOptions>,
) {
  return defineAsyncComponent({
    loader,
    delay: 200,
    timeout: 10000,
    ...options,
  })
}
