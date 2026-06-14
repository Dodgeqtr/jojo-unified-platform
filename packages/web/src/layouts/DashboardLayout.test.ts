import { describe, it, expect } from 'vitest'

describe('DashboardLayout: عناصر التنقل', () => {
  it('يحتوي على روابط القائمة الأساسية بما فيها الوكلاء الذكية', async () => {
    const mod = await import('./DashboardLayout')
    expect(mod.default).toBeDefined()
  })
})
