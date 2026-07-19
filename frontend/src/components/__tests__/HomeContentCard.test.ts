import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeContentCard from '../HomeContentCard.vue'
import type { Content } from '@/types'

const mockContent: Content = {
  id: 1,
  title: '测试标题',
  type: 'image',
  text: '',
  url: '',
  thumb: 'test-thumb.jpg',
  video: '',
  img: 'test-img.jpg',
  file_size: 1024,
  user: {
    id: 1,
    username: 'testuser',
    is_admin: false,
    is_banned: false,
    created_at: 1710230400,
    updated_at: 1710230400,
  },
  tags: ['tag1', 'tag2'],
  view_count: 100,
  created_at: 1710230400,
  updated_at: 1710230400,
}

describe('HomeContentCard', () => {
  it('renders content title correctly', () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
      },
    })

    expect(wrapper.text()).toContain('测试标题')
  })

  it('renders content type badge', () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
      },
    })

    expect(wrapper.text()).toContain('图片')
  })

  it('renders user information', () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
      },
    })

    expect(wrapper.text()).toContain('testuser')
  })

  it('renders tags', () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
      },
    })

    expect(wrapper.text()).toContain('tag1')
    expect(wrapper.text()).toContain('tag2')
  })

  it('renders view count', () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
      },
    })

    expect(wrapper.text()).toContain('100')
  })

  it('emits click event when clicked', async () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')?.[0]).toEqual([mockContent])
  })

  it('applies compact class when compact prop is true', () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
        compact: true,
      },
    })

    expect(wrapper.classes()).toContain('overflow-hidden')
  })

  it('handles NSFW content correctly', () => {
    const nsfwContent: Content = {
      ...mockContent,
      tags: ['nsfw'],
    }

    const wrapper = mount(HomeContentCard, {
      props: {
        content: nsfwContent,
      },
    })

    expect(wrapper.text()).toContain('不适合在工作期间访问')
  })

  it('handles AI content correctly', () => {
    const aiContent: Content = {
      ...mockContent,
      tags: ['ai-generated'],
    }

    const wrapper = mount(HomeContentCard, {
      props: {
        content: aiContent,
      },
    })

    expect(wrapper.text()).toContain('AI生成')
  })

  it('handles video content correctly', () => {
    const videoContent: Content = {
      ...mockContent,
      type: 'video',
    }

    const wrapper = mount(HomeContentCard, {
      props: {
        content: videoContent,
      },
    })

    expect(wrapper.text()).toContain('视频')
  })

  it('handles link content correctly', () => {
    const linkContent: Content = {
      ...mockContent,
      type: 'link',
    }

    const wrapper = mount(HomeContentCard, {
      props: {
        content: linkContent,
      },
    })

    expect(wrapper.text()).toContain('链接')
  })

  it('handles text content correctly', () => {
    const textContent: Content = {
      ...mockContent,
      type: 'text',
      text: '这是一段测试文本内容',
    }

    const wrapper = mount(HomeContentCard, {
      props: {
        content: textContent,
      },
    })

    expect(wrapper.text()).toContain('文字')
  })

  it('applies dark variant styles', () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
        variant: 'dark',
      },
    })

    expect(wrapper.classes()).toContain('overflow-hidden')
  })

  it('applies liquid glass variant styles', () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
        variant: 'liquidGlass',
      },
    })

    expect(wrapper.classes()).toContain('glass-card')
  })

  it('has correct accessibility attributes', () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
      },
    })

    const article = wrapper.find('article')
    expect(article.attributes('tabindex')).toBe('0')
    expect(article.element.tagName).toBe('ARTICLE')
    expect(article.attributes('aria-label')).toContain('测试标题')
  })

  it('supports keyboard navigation', async () => {
    const wrapper = mount(HomeContentCard, {
      props: {
        content: mockContent,
      },
    })

    const article = wrapper.find('article')
    await article.trigger('keydown.enter')
    expect(wrapper.emitted('click')).toBeTruthy()

    await article.trigger('keydown.space')
    expect(wrapper.emitted('click')?.length).toBeGreaterThan(1)
  })
})