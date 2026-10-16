'use client'

import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from '@app/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (query: Partial<ListTasksQuery>) => [...taskKeys.all, 'list', query] as const,
}

export function useTasks(query: Partial<ListTasksQuery> = {}) {
  return useQuery({ queryKey: taskKeys.list(query), queryFn: () => api.listTasks(query) })
}

function useInvalidateTasks() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: taskKeys.all })
}

export function useCreateTask() {
  const onSuccess = useInvalidateTasks()
  return useMutation({ mutationFn: (input: CreateTaskInput) => api.createTask(input), onSuccess })
}

export function useUpdateTask() {
  const onSuccess = useInvalidateTasks()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      api.updateTask(id, input),
    onSuccess,
  })
}

export function useDeleteTask() {
  const onSuccess = useInvalidateTasks()
  return useMutation({ mutationFn: (id: string) => api.deleteTask(id), onSuccess })
}
