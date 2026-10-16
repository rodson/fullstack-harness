import { TaskBoard } from '@/components/task-board'

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">任务</h1>
        <p className="text-sm text-muted-foreground">
          示例模块：契约在 packages/shared，接口在 apps/api，需求文档见 specs/archive/。
        </p>
      </header>
      <TaskBoard />
    </main>
  )
}
