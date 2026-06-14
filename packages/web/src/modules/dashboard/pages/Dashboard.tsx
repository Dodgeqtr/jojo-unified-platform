import { useState, useEffect } from 'react'

interface ServiceStatus {
  name: string
  status: 'active' | 'inactive' | 'error'
  url: string
  latency: number
}

interface StorageInfo {
  master: string
  disk_g_connected: boolean
  storage: {
    total_gb: number
    used_gb: number
    free_gb: number
  } | string
}

const defaultServices: ServiceStatus[] = [
  { name: 'Operations API', status: 'active', url: 'http://localhost:3000', latency: 0 },
  { name: 'CRM Service', status: 'active', url: 'http://localhost:3001', latency: 0 },
  { name: 'n8n Service', status: 'active', url: 'http://localhost:3002', latency: 0 },
  { name: 'Sovereign FastAPI Hub', status: 'active', url: 'http://localhost:8000', latency: 0 },
]

export default function Dashboard() {
  const [services, setServices] = useState<ServiceStatus[]>(defaultServices)
  const [workflowStats, setWorkflowStats] = useState({ active: 0, total: 0 })
  const [dbCounts, setDbCounts] = useState({ contacts: 0, properties: 0 })
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [systemStatus, setSystemStatus] = useState('operational')

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/dashboard')
      if (!res.ok) throw new Error('Dashboard API error')
      const data = await res.json()
      setWorkflowStats(data.workflows)
      setDbCounts({ contacts: data.contacts, properties: data.properties })
      setSystemStatus(data.system_status)
    } catch (err) {
      console.error(err)
      setSystemStatus('degraded')
    }
  }

  const fetchStorageData = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/system/storage')
      if (!res.ok) throw new Error('Storage API error')
      const data = await res.json()
      setStorageInfo(data)
    } catch (err) {
      console.error(err)
    }
  }

  const checkHealth = async () => {
    const updated = await Promise.all(
      services.map(async (svc) => {
        const start = Date.now()
        try {
          const res = await fetch(`${svc.url}/health`, { signal: AbortSignal.timeout(3000) })
          const latency = Date.now() - start
          return { ...svc, status: res.ok ? 'active' as const : 'error' as const, latency }
        } catch {
          // Fallback for root status checks
          try {
            const res = await fetch(`${svc.url}/`, { signal: AbortSignal.timeout(3000) })
            const latency = Date.now() - start
            return { ...svc, status: res.ok ? 'active' as const : 'error' as const, latency }
          } catch {
            return { ...svc, status: 'error' as const, latency: Date.now() - start }
          }
        }
      })
    )
    setServices(updated)
  }

  useEffect(() => {
    fetchDashboardData()
    fetchStorageData()
    checkHealth()

    const interval = setInterval(() => {
      fetchDashboardData()
      fetchStorageData()
      checkHealth()
    }, 20000)

    return () => clearInterval(interval)
  }, [])

  // Storage metrics calculations
  const hasStorageData = storageInfo && typeof storageInfo.storage === 'object'
  const storageDetails = hasStorageData ? (storageInfo?.storage as { total_gb: number; used_gb: number; free_gb: number }) : null
  const usedPercent = storageDetails ? Math.round((storageDetails.used_gb / storageDetails.total_gb) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم المركزية</h1>
          <p className="text-gray-500 mt-1">نظرة عامة حية على حالة خادمك، قاعدة البيانات، وسير العمل</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-semibold shadow-sm">
          <span>المسؤول:</span>
          <span className="text-indigo-600">{storageInfo?.master || 'بوحمد'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">حالة النظام</p>
              <p className={`text-2xl font-bold mt-1 ${
                systemStatus === 'operational' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {systemStatus === 'operational' ? 'نشط بالكامل' : 'أداء جزئي'}
              </p>
            </div>
            <span className="text-3xl">{systemStatus === 'operational' ? '🟢' : '🟡'}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">سير العمل (n8n)</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {workflowStats.active} / {workflowStats.total}
              </p>
            </div>
            <span className="text-3xl">⚙️</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{dbCounts.contacts}</p>
            </div>
            <span className="text-3xl">👥</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">المحفظة العقارية</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{dbCounts.properties}</p>
            </div>
            <span className="text-3xl">🏠</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* حالة مساحة الخادم HP / G Drive */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">سعة الخوادم والتخزين</h2>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              storageInfo?.disk_g_connected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              القرص G (Kok): {storageInfo?.disk_g_connected ? 'متصل ✅' : 'منفصل ⚠️'}
            </span>
          </div>

          {hasStorageData && storageDetails ? (
            <div className="space-y-4">
              <div className="flex justify-between items-end text-sm">
                <div>
                  <span className="text-xs text-gray-400 block">المستخدم من المساحة</span>
                  <span className="font-bold text-gray-900 text-lg">
                    {storageDetails.used_gb} GB / {storageDetails.total_gb} GB
                  </span>
                </div>
                <span className="font-semibold text-indigo-600">{usedPercent}%</span>
              </div>
              {/* شريط التقدم */}
              <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden flex flex-row-reverse">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 pt-2">
                <span>المساحة المتبقية: {storageDetails.free_gb} GB</span>
                <span>المساحة الإجمالية</span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              ⚠️ عذراً، خادم التخزين المساعد (FastAPI Hub) غير متصل حالياً لعرض تفاصيل القرص.
            </div>
          )}
        </div>

        {/* حالة المنافذ والخدمات */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">مراقبة المنافذ والخدمات</h2>
          </div>
          <div className="divide-y divide-gray-100 flex-1">
            {services.map((svc) => (
              <div key={svc.name} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    svc.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="font-semibold text-gray-800 text-sm">{svc.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className={svc.status === 'active' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {svc.status === 'active' ? `${svc.latency}ms` : 'معطل'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
