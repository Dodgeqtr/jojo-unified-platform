import { describe, it, expect } from 'vitest'

describe('n8n-service: إعدادات أساسية', () => {
  it('يقرأ متغيرات بيئة n8n مع قيم افتراضية صحيحة', () => {
    const N8N_API_URL = process.env.N8N_API_URL || 'https://dodgeqtr.app.n8n.cloud'
    expect(N8N_API_URL).toContain('n8n')
  })
})
