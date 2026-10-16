import { CreateTaskInput, ListTasksQuery, TaskIdParam, UpdateTaskInput } from '@app/shared'
import { Hono } from 'hono'
import { validate } from '../../lib/validate'
import type { TaskService } from './tasks.service'

/** handler 只做校验与编排；业务在 service，数据访问在 repository */
export function taskRoutes(service: TaskService) {
  return new Hono()
    .get('/', validate('query', ListTasksQuery), async (c) =>
      c.json(await service.list(c.req.valid('query'))),
    )
    .post('/', validate('json', CreateTaskInput), async (c) =>
      c.json(await service.create(c.req.valid('json')), 201),
    )
    .get('/:id', validate('param', TaskIdParam), async (c) =>
      c.json(await service.get(c.req.valid('param').id)),
    )
    .patch('/:id', validate('param', TaskIdParam), validate('json', UpdateTaskInput), async (c) =>
      c.json(await service.update(c.req.valid('param').id, c.req.valid('json'))),
    )
    .delete('/:id', validate('param', TaskIdParam), async (c) => {
      await service.remove(c.req.valid('param').id)
      return c.body(null, 204)
    })
}
