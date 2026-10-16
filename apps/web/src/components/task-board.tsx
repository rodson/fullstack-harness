'use client'

import { CreateTaskInput, type Task, type TaskStatus } from '@app/shared'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@app/ui'
import { type FormEvent, useState } from 'react'
import { ApiError } from '@/lib/api'
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '@/lib/queries'

const STATUS_LABEL: Record<TaskStatus, string> = { todo: '待办', doing: '进行中', done: '已完成' }
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { todo: 'doing', doing: 'done', done: 'todo' }

export function TaskBoard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>任务列表</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <CreateTaskForm />
        <TaskList />
      </CardContent>
    </Card>
  )
}

function CreateTaskForm() {
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const create = useCreateTask()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = CreateTaskInput.safeParse({ title })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '输入无效')
      return
    }
    setError(null)
    create.mutate(parsed.data, {
      onSuccess: () => setTitle(''),
      onError: (err) => setError(err.message),
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          aria-label="任务标题"
          placeholder="要做什么？"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={error ? true : undefined}
          disabled={create.isPending}
        />
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? '添加中…' : '添加'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}

function TaskList() {
  const { data, error, isPending, refetch } = useTasks({ limit: 50 })

  if (isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        加载中…
      </p>
    )
  }

  if (error) {
    if (
      error instanceof ApiError &&
      (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN')
    ) {
      return (
        <p role="alert" className="text-sm text-muted-foreground">
          无权限查看任务，请联系管理员。
        </p>
      )
    }
    return (
      <div role="alert" className="flex items-center gap-3 text-sm">
        <span className="text-destructive">加载失败：{error.message}</span>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          重试
        </Button>
      </div>
    )
  }

  if (data.items.length === 0) {
    return <p className="text-sm text-muted-foreground">还没有任务，先添加一个吧。</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {data.items.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  )
}

function TaskItem({ task }: { task: Task }) {
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const busy = update.isPending || remove.isPending
  const failure = update.error ?? remove.error

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className={task.status === 'done' ? 'text-muted-foreground line-through' : ''}>
          {task.title}
        </span>
        {failure && (
          <span role="alert" className="text-xs text-destructive">
            操作失败：{failure.message}
          </span>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          aria-label={`切换状态：${task.title}`}
          onClick={() =>
            update.mutate({ id: task.id, input: { status: NEXT_STATUS[task.status] } })
          }
        >
          {STATUS_LABEL[task.status]}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          aria-label={`删除：${task.title}`}
          onClick={() => remove.mutate(task.id)}
        >
          删除
        </Button>
      </div>
    </li>
  )
}
