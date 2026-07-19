/**
 * Web Vitals 性能监控工具
 * 跟踪 LCP、FID、CLS、TTFB 等核心指标
 */

export interface WebVitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
}

type MetricCallback = (metric: WebVitalMetric) => void

// 阈值配置 (基于 Web Vitals 推荐)
const thresholds = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[name as keyof typeof thresholds]
  if (!threshold) return 'good'

  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

function generateId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`
}

/**
 * 观察 LCP (Largest Contentful Paint)
 */
function observeLCP(callback: MetricCallback): void {
  if (!('PerformanceObserver' in globalThis)) return

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries.at(-1) as (PerformanceEntry & { startTime: number }) | undefined

      if (lastEntry) {
        callback({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: getRating('LCP', lastEntry.startTime),
          delta: lastEntry.startTime,
          id: generateId(),
        })
      }
    })

    observer.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch (e) {
    console.warn('LCP observation failed:', e)
  }
}

/**
 * 观察 FID (First Input Delay)
 */
function observeFID(callback: MetricCallback): void {
  if (!('PerformanceObserver' in globalThis)) return

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEntry & { processingStart: number; startTime: number }
        const fid = fidEntry.processingStart - fidEntry.startTime

        callback({
          name: 'FID',
          value: fid,
          rating: getRating('FID', fid),
          delta: fid,
          id: generateId(),
        })
      })
    })

    observer.observe({ type: 'first-input', buffered: true })
  } catch (e) {
    console.warn('FID observation failed:', e)
  }
}

/**
 * 观察 CLS (Cumulative Layout Shift)
 */
function observeCLS(callback: MetricCallback): void {
  if (!('PerformanceObserver' in globalThis)) return

  let clsValue = 0

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        const clsEntry = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value
        }
      })

      callback({
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        delta: clsValue,
        id: generateId(),
      })
    })

    observer.observe({ type: 'layout-shift', buffered: true })
  } catch (e) {
    console.warn('CLS observation failed:', e)
  }
}

/**
 * 观察 TTFB (Time to First Byte)
 */
function observeTTFB(callback: MetricCallback): void {
  if (!('performance' in globalThis) || !('timing' in performance)) return

  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

  if (navEntry) {
    const ttfb = navEntry.responseStart - navEntry.requestStart

    callback({
      name: 'TTFB',
      value: ttfb,
      rating: getRating('TTFB', ttfb),
      delta: ttfb,
      id: generateId(),
    })
  }
}

/**
 * 观察 FCP (First Contentful Paint)
 */
function observeFCP(callback: MetricCallback): void {
  if (!('PerformanceObserver' in globalThis)) return

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          callback({
            name: 'FCP',
            value: entry.startTime,
            rating: getRating('FCP', entry.startTime),
            delta: entry.startTime,
            id: generateId(),
          })
        }
      })
    })

    observer.observe({ type: 'paint', buffered: true })
  } catch (e) {
    console.warn('FCP observation failed:', e)
  }
}

/**
 * 初始化性能监控
 */
export function initWebVitals(callback?: MetricCallback): void {
  const defaultCallback = (metric: WebVitalMetric) => {
    // 仅开发环境打印到控制台；生产环境应改为发送到分析服务，避免噪音日志
    if (!import.meta.env.DEV) return
    let emoji = '❌'
    if (metric.rating === 'good') {
      emoji = '✅'
    } else if (metric.rating === 'needs-improvement') {
      emoji = '⚠️'
    }
    console.log(`${emoji} [Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`)

    // 可以在这里发送到分析服务
    // sendToAnalytics(metric)
  }

  const metricCallback = callback || defaultCallback

  // 等待页面加载完成后开始观察
  if (document.readyState === 'complete') {
    startObservers(metricCallback)
  } else {
    globalThis.addEventListener('load', () => {
      // 延迟一点确保所有指标都已记录
      setTimeout(() => startObservers(metricCallback), 0)
    })
  }
}

function startObservers(callback: MetricCallback): void {
  observeLCP(callback)
  observeFID(callback)
  observeCLS(callback)
  observeTTFB(callback)
  observeFCP(callback)
}

/**
 * 获取当前页面性能指标
 */
export function getPerformanceMetrics(): Record<string, number> {
  const metrics: Record<string, number> = {}

  if (!('performance' in globalThis)) return metrics

  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

  if (navEntry) {
    metrics.dns = navEntry.domainLookupEnd - navEntry.domainLookupStart
    metrics.tcp = navEntry.connectEnd - navEntry.connectStart
    metrics.ttfb = navEntry.responseStart - navEntry.requestStart
    metrics.download = navEntry.responseEnd - navEntry.responseStart
    metrics.domInteractive = navEntry.domInteractive
    metrics.domComplete = navEntry.domComplete
    metrics.loadComplete = navEntry.loadEventEnd
  }

  return metrics
}

/**
 * 发送指标到分析服务 (示例实现)
 */
export function sendToAnalytics(metric: WebVitalMetric): void {
  // 使用 sendBeacon API 异步发送
  if ('navigator' in globalThis && 'sendBeacon' in navigator) {
    // 替换为实际的分析端点
    // navigator.sendBeacon('/api/analytics', JSON.stringify({
    //   name: metric.name,
    //   value: metric.value,
    //   rating: metric.rating,
    //   page: globalThis.location.pathname,
    //   timestamp: Date.now(),
    // }))
  }
}