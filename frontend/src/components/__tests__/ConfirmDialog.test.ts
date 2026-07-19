import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '../ConfirmDialog.vue'

// Mock useConfirm composable
const mockRespond = vi.fn()
const mockPendingConfirm = ref<any>(null)

vi.mock('@/composables/useToast', () => ({
  useConfirm: vi.fn(() => ({
    pendingConfirm: mockPendingConfirm,
    respond: mockRespond,
  })),
}))

describe('ConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPendingConfirm.value = null
  })

  it('does not render when no pending confirm', () => {
    const wrapper = mount(ConfirmDialog)
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    wrapper.unmount()
  })

  it('renders dialog when pending confirm exists', () => {
    mockPendingConfirm.value = {
      message: '确定要删除吗？',
    }

    const wrapper = mount(ConfirmDialog)

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog!.textContent).toContain('确定要删除吗？')
    wrapper.unmount()
  })

  it('has correct accessibility attributes', () => {
    mockPendingConfirm.value = {
      message: '测试消息',
    }

    const wrapper = mount(ConfirmDialog)

    const dialog = document.body.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-dialog-title')
    expect(dialog.getAttribute('aria-describedby')).toBe('confirm-dialog-message')
    wrapper.unmount()
  })

  it('renders title correctly', () => {
    mockPendingConfirm.value = {
      message: '测试消息',
    }

    const wrapper = mount(ConfirmDialog)

    const title = document.body.querySelector('#confirm-dialog-title')
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('确认操作')
    wrapper.unmount()
  })

  it('renders message correctly', () => {
    mockPendingConfirm.value = {
      message: '这是一条测试消息',
    }

    const wrapper = mount(ConfirmDialog)

    const message = document.body.querySelector('#confirm-dialog-message')
    expect(message).not.toBeNull()
    expect(message!.textContent).toBe('这是一条测试消息')
    wrapper.unmount()
  })

  it('calls respond with false when cancel button clicked', () => {
    mockPendingConfirm.value = {
      message: '测试消息',
    }

    const wrapper = mount(ConfirmDialog)

    const cancelButton = document.body.querySelector('button[aria-label="取消操作"]') as HTMLButtonElement
    cancelButton.click()
    expect(mockRespond).toHaveBeenCalledWith(false)
    wrapper.unmount()
  })

  it('calls respond with true when confirm button clicked', () => {
    mockPendingConfirm.value = {
      message: '测试消息',
    }

    const wrapper = mount(ConfirmDialog)

    const confirmButton = document.body.querySelector('button[aria-label="确认操作"]') as HTMLButtonElement
    confirmButton.click()
    expect(mockRespond).toHaveBeenCalledWith(true)
    wrapper.unmount()
  })

  it('calls respond with false when close button clicked', () => {
    mockPendingConfirm.value = {
      message: '测试消息',
    }

    const wrapper = mount(ConfirmDialog)

    const closeButton = document.body.querySelector('button[aria-label="关闭对话框"]') as HTMLButtonElement
    closeButton.click()
    expect(mockRespond).toHaveBeenCalledWith(false)
    wrapper.unmount()
  })
})
