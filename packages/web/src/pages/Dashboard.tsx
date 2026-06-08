import { useState, useEffect } from 'react'

interface ServiceStatus {
  name: string
  status: 'active' | 'inactive' | 'error'
  url: string
  latency: number
}

const defaultServices: ServiceStatus[] = [
  { name: 'Operations API', status: 'active', url: 'http://localhost:3000', latency: 0 },
  { name: 'CRM Service', status: 'active', url: 'http://localhost:3001', latency: 0 },
  { name: 'n8n Service', status: 'active', url: 'http://localhost:3002', latency: 0 },
  { name: 'PostgreSQL', status: 'active', url: 'localhost:5432', latency: 0 },
  { name: 'Redis', status: 'active', url: 'localhost:6379', latency: 0 },
]

export default function Dashboard() {
  const [services, setServices] = useState<ServiceStatus[]>(defaultServices)
  const [workflowCount, setWorkflowCount] = useState(28)
  const [errorCount, setErrorCount] = useState(0)

  useEffect(() => {
    async function checkHealth() {
      const updated = await Promise.all(
        services.map(async (svc) => {
          const start = Date.now()
          try {
            const res = await fetch(`${svc.url}/health`, { signal: AbortSignal.timeout(3000) })
            const latency = Date.now() - start
            return { ...svc, status: res.ok ? 'active' as const : 'error' as const, latency }
          } catch {
            return { ...svc, status: 'error' as const, latency: Date.now() - start }
          }
        })
      )
      setServices(updated)
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
        <p className="text-gray-500 mt-1">نظرة عامة على حالة المنظومة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">حالة النظام</p>
              <p className="text-2xl font-bold text-green-600 mt-1">نشط</p>
            </div>
            <span className="text-3xl">🟢</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">سير العمل النشط</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{workflowCount}</p>
            </div>
            <span className="text-3xl">⚙️</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">الأخطاء اليوم</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{errorCount}</p>
            </div>
            <span className="text-3xl">🔴</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">حالة الخدمات</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {services.map((svc) => (
            <div key={svc.name} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  svc.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="font-medium text-gray-900">{svc.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{svc.url}</span>
                <span className={svc.status === 'active' ? 'text-green-600' : 'text-red-600'}>
                  {svc.status === 'active' ? `${svc.latency}ms` : 'معطل'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
