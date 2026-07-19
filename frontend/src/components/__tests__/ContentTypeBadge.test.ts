import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ContentTypeBadge from '../ContentTypeBadge.vue'

describe('ContentTypeBadge', () => {
  it('renders video type correctly', () => {
    const wrapper = mount(ContentTypeBadge, {
      props: { type: 'video' },
    })

    expect(wrapper.text()).toBe('视频')
    expect(wrapper.classes()).toContain('text-[var(--theme-danger)]')
  })

  it('renders image type correctly', () => {
    const wrapper = mount(ContentTypeBadge, {
      props: { type: 'image' },
    })

    expect(wrapper.text()).toBe('图片')
    expect(wrapper.classes()).toContain('text-[var(--theme-success)]')
  })

  it('renders text type correctly', () => {
    const wrapper = mount(ContentTypeBadge, {
      props: { type: 'text' },
    })

    expect(wrapper.text()).toBe('文字')
    expect(wrapper.classes()).toContain('text-[var(--theme-primary)]')
  })

  it('renders link type correctly', () => {
    const wrapper = mount(ContentTypeBadge, {
      props: { type: 'link' },
    })

    expect(wrapper.text()).toBe('链接')
    expect(wrapper.classes()).toContain('text-[var(--theme-secondary)]')
  })

  it('has correct base classes', () => {
    const wrapper = mount(ContentTypeBadge, {
      props: { type: 'video' },
    })

    expect(wrapper.classes()).toContain('px-2')
    expect(wrapper.classes()).toContain('py-0.5')
    expect(wrapper.classes()).toContain('rounded-full')
    expect(wrapper.classes()).toContain('text-xs')
    expect(wrapper.classes()).toContain('font-medium')
  })
})