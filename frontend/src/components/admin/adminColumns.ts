import type { TableColumnsType } from 'ant-design-vue'

export const ACTION_COL: TableColumnsType[number] = {
  title: '操作', key: 'actions', width: 100, align: 'center',
}

export const STATUS_COL: TableColumnsType[number] = {
  title: '状态', key: 'status', width: 90, align: 'center',
}

export const TIME_COL: TableColumnsType[number] = {
  title: '时间', key: 'time', width: 160,
}

export const CONTENT_COL: TableColumnsType[number] = {
  title: '内容', key: 'content', minWidth: 200,
}

export const USER_COL: TableColumnsType[number] = {
  title: '用户名', key: 'username', minWidth: 140,
}

export const ROLE_COL: TableColumnsType[number] = {
  title: '角色', key: 'role', width: 100, align: 'center',
}

export const REASON_COL: TableColumnsType[number] = {
  title: '理由', key: 'reason', minWidth: 160,
}

export const CLAIMER_COL: TableColumnsType[number] = {
  title: '认领者', key: 'claimer', width: 100,
}

export const REPORTER_COL: TableColumnsType[number] = {
  title: '举报人', key: 'reporter', width: 100,
}

export const TEXT_CELL_STYLE = 'font-size: 13px; color: var(--theme-text-secondary)'
export const SECONDARY_STYLE = 'font-size: 13px; color: var(--admin-text-tertiary)'
