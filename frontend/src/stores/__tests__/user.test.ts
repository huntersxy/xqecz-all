import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../user'

// Mock API
vi.mock('@/api', () => ({
  authApi: {
    login: vi.fn(),
    getMe: vi.fn(),
    logout: vi.fn(),
  },
}))

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const store = useUserStore()

    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('should login successfully', async () => {
    const { authApi } = await import('@/api')
    const mockUser = {
      id: 1,
      username: 'testuser',
      is_admin: false,
      is_banned: false,
      created_at: 1710230400,
      updated_at: 1710230400,
    }

    vi.mocked(authApi.login).mockResolvedValue({
      code: 200,
      message: 'success',
      data: { user: mockUser },
    })

    const store = useUserStore()
    const result = await store.login('testuser', 'password')

    expect(result).toBe(true)
    expect(store.user).toEqual(mockUser)
    expect(store.isLoggedIn).toBe(true)
  })

  it('should handle login failure', async () => {
    const { authApi } = await import('@/api')

    vi.mocked(authApi.login).mockResolvedValue({
      code: 401,
      message: '用户名或密码错误',
      data: null as any,
    })

    const store = useUserStore()
    const result = await store.login('wrong', 'wrong')

    expect(result).toBe(false)
    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('should logout correctly', async () => {
    const { authApi } = await import('@/api')

    // First login
    const mockUser = {
      id: 1,
      username: 'testuser',
      is_admin: false,
      is_banned: false,
      created_at: 1710230400,
      updated_at: 1710230400,
    }

    vi.mocked(authApi.login).mockResolvedValue({
      code: 200,
      message: 'success',
      data: { user: mockUser },
    })

    vi.mocked(authApi.logout).mockResolvedValue({
      code: 200,
      message: 'success',
      data: null as any,
    })

    const store = useUserStore()
    await store.login('testuser', 'password')
    expect(store.isLoggedIn).toBe(true)

    await store.logout()
    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('should check auth status', async () => {
    const { authApi } = await import('@/api')
    const mockUser = {
      id: 1,
      username: 'testuser',
      is_admin: false,
      is_banned: false,
      created_at: 1710230400,
      updated_at: 1710230400,
    }

    vi.mocked(authApi.getMe).mockResolvedValue({
      code: 200,
      message: 'success',
      data: mockUser,
    })

    const store = useUserStore()
    await store.checkAuth()

    expect(store.user).toEqual(mockUser)
    expect(store.isLoggedIn).toBe(true)
  })

  it('should handle check auth failure', async () => {
    const { authApi } = await import('@/api')

    vi.mocked(authApi.getMe).mockRejectedValue(new Error('Unauthorized'))

    const store = useUserStore()
    await store.checkAuth()

    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })
})