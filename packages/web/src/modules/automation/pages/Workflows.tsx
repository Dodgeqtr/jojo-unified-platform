import { useState, useEffect } from 'react'

interface Workflow {
  id: string
  name: string
  active: boolean
  updatedAt?: string
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  async function fetchWorkflows() {
    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:3000/api/workflows')
      if (!res.ok) throw new Error('Failed to fetch workflows')
      const data = await res.json()
      setWorkflows(data.workflows || [])
      setError(null)
    } catch (err: any) {
      console.error(err)
      setError('⚠️ عذراً، لم نتمكن من الاتصال بالـ n8n API. تأكد من إعداد المفاتيح بشكل صحيح.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setActioningId(id)
    const endpoint = currentStatus ? 'deactivate' : 'activate'
    try {
      const res = await fetch(`http://localhost:3000/api/workflows/${id}/${endpoint}`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Toggle action failed')
      
      // Update local state
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, active: !currentStatus } : w))
      )
    } catch (err) {
      console.error(err)
      alert('⚠️ فشل تغيير حالة سير العمل.')
    } finally {
      setActioningId(null)
    }
  }

  const handleRunWorkflow = async (id: string) => {
    setActioningId(id)
    try {
      const res = await fetch(`http://localhost:3000/api/workflows/${id}/execute`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Execute action failed')
      const data = await res.json()
      alert(`✅ تم إطلاق سير العمل بنجاح! رقم التنفيذ: ${data.executionId}`)
    } catch (err) {
      console.error(err)
      alert('⚠️ فشل تشغيل سير العمل.')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سير العمل والأتمتة</h1>
          <p className="text-gray-500 mt-1">مراقبة وتشغيل أكثر من 35 سير عمل (Workflows) مفعل بالمنظومة</p>
        </div>
        <button
          onClick={fetchWorkflows}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 font-medium text-gray-700 shadow-sm transition-colors disabled:opacity-50"
        >
          {isLoading ? 'جاري التحديث...' : 'تحديث القائمة 🔄'}
        </button>
      </div>

      {error ? (
        <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl">
          {error}
        </div>
      ) : isLoading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <span className="inline-block animate-spin text-3xl mb-2">⚙️</span>
          <p>جاري تحميل قائمة سير العمل من n8n...</p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <p>لا توجد سير عمل نشطة حالياً.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-sm font-semibold text-gray-700">
            <span>سير العمل</span>
            <div className="flex gap-8">
              <span className="w-24 text-center">الحالة الحالية</span>
              <span className="w-48 text-center">الإجراءات التشغيلية</span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {workflows.map((wf) => (
              <div key={wf.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/55 transition-colors">
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{wf.name}</h3>
                  <p className="text-xs text-gray-400">المعرف: {wf.id}</p>
                </div>

                <div className="flex gap-8 items-center">
                  {/* زر التفعيل/الإلغاء */}
                  <div className="w-24 flex justify-center">
                    <button
                      onClick={() => handleToggleActive(wf.id, wf.active)}
                      disabled={actioningId === wf.id}
                      className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-colors ${
                        wf.active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {wf.active ? '🟢 نشط' : '🔴 متوقف'}
                    </button>
                  </div>

                  {/* زر التشغيل اليدوي */}
                  <div className="w-48 flex justify-center">
                    <button
                      onClick={() => handleRunWorkflow(wf.id)}
                      disabled={actioningId === wf.id}
                      className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
                    >
                      تشغيل يدوي ⚡
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
