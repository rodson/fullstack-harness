import type { Task } from '@app/shared'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '@/lib/api'
import { TaskBoard } from './task-board'

const task = (overrides: Partial<Task> = {}): Task => ({
  id: '7f1c2f7e-0000-4000-8000-000000000001',
  title: '示例任务',
  status: 'todo',
  createdAt: '2026-10-16T00:00:00.000Z',
  updatedAt: '2026-10-16T00:00:00.000Z',
  ...overrides,
})

function renderBoard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TaskBoard />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TaskBoard', () => {
  it('TC-007 先显示加载中，无数据时显示空状态', async () => {
    vi.spyOn(api, 'listTasks').mockResolvedValue({ items: [], nextOffset: null })
    renderBoard()
    expect(screen.getByRole('status')).toHaveTextContent('加载中')
    expect(await screen.findByText('还没有任务，先添加一个吧。')).toBeInTheDocument()
  })

  it('TC-008 加载失败显示错误与重试，重试成功后展示列表', async () => {
    const list = vi
      .spyOn(api, 'listTasks')
      .mockRejectedValueOnce(new ApiError(500, { code: 'INTERNAL', message: '服务器内部错误' }))
    renderBoard()
    expect(await screen.findByText('加载失败：服务器内部错误')).toBeInTheDocument()

    list.mockResolvedValueOnce({ items: [task({ title: '恢复了' })], nextOffset: null })
    await userEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(await screen.findByText('恢复了')).toBeInTheDocument()
  })

  it('TC-008 无权限时显示无权限提示而不是通用错误', async () => {
    vi.spyOn(api, 'listTasks').mockRejectedValue(
      new ApiError(403, { code: 'FORBIDDEN', message: 'forbidden' }),
    )
    renderBoard()
    expect(await screen.findByText('无权限查看任务，请联系管理员。')).toBeInTheDocument()
  })

  it('TC-009 提交表单创建任务；空标题提示错误且不发请求', async () => {
    vi.spyOn(api, 'listTasks').mockResolvedValue({ items: [], nextOffset: null })
    const create = vi.spyOn(api, 'createTask').mockResolvedValue(task({ title: '写周报' }))
    const user = userEvent.setup()
    renderBoard()

    await user.click(screen.getByRole('button', { name: '添加' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('标题不能为空')
    expect(create).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('任务标题'), '  写周报 ')
    await user.click(screen.getByRole('button', { name: '添加' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith({ title: '写周报' }))
  })
})
