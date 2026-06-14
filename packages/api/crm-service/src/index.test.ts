import { describe, it, expect } from 'vitest'
import { query, queryOne, getDb } from '../../shared/core/db'

describe('crm-service: shared db adapter', () => {
  it('يصدّر الدوال الأساسية للتعامل مع قاعدة البيانات', () => {
    expect(typeof query).toBe('function')
    expect(typeof queryOne).toBe('function')
    expect(typeof getDb).toBe('function')
    expect(getDb()).toHaveProperty('query')
  })
})
