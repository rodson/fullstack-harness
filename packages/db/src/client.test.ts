import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDb, type DbHandle } from './client'
import { tasks } from './schema'

describe('db', () => {
  let handle: DbHandle

  beforeAll(async () => {
    handle = await createTestDb()
  })
  afterAll(async () => {
    await handle.close()
  })

  it('迁移后可读写 tasks，默认值生效', async () => {
    const [row] = await handle.db.insert(tasks).values({ title: 'hello' }).returning()
    expect(row).toMatchObject({ title: 'hello', status: 'todo', deletedAt: null })
    expect(row?.createdAt).toBeInstanceOf(Date)

    const found = await handle.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, row?.id ?? ''))
    expect(found).toHaveLength(1)
  })
})
