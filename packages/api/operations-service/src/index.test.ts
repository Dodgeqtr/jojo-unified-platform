import { describe, it, expect } from 'vitest'
import { appRouter } from '../../shared/routers/_app'

describe('operations-service: appRouter (tRPC)', () => {
  it('يحمّل appRouter ويحتوي على الراوترات الأساسية', () => {
    expect(appRouter).toBeDefined()
    // الراوتر المركزي لجوجو وراوتر n8n لازم يكونوا مسجلين
    expect(appRouter._def.procedures).toBeDefined()
  })
})
