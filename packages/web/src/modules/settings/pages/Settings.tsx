import { useState } from 'react'

export default function Settings() {
  const [installingApp, setInstallingApp] = useState<string | null>(null)
  const [installMessage, setInstallMessage] = useState<string | null>(null)

  const appsToInstall = [
    { name: 'Google Chrome', id: 'Google.Chrome', icon: '🌐' },
    { name: 'Visual Studio Code', id: 'Microsoft.VisualStudioCode', icon: '💻' },
    { name: 'Git', id: 'Git.Git', icon: '🐙' },
    { name: 'Docker Desktop', id: 'Docker.DockerDesktop', icon: '🐳' },
    { name: 'Node.js LTS', id: 'OpenJS.NodeJS.LTS', icon: '🟢' },
  ]

  const handleInstallApp = async (appId: string, name: string) => {
    setInstallingApp(appId)
    setInstallMessage(null)
    try {
      const res = await fetch('http://localhost:3000/api/system/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId }),
      })
      if (!res.ok) throw new Error('Install trigger failed')
      await res.json()
      setInstallMessage(`✅ تم إطلاق أمر تثبيت ${name} في الخلفية بنجاح!`)
    } catch (err) {
      console.error(err)
      setInstallMessage(`⚠️ فشل تشغيل تثبيت ${name}. تأكد من اتصال خادم FastAPI (FastAPI Hub).`)
    } finally {
      setInstallingApp(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات والأنظمة</h1>
        <p className="text-gray-500 mt-1">تكوين المنظومة وتثبيت البرمجيات السيادية محلياً</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* حالة النظام والمتغيرات */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">حالة النظام المركزي</p>
                <p className="text-xs text-gray-500">Jojo Unified Platform v2.0.0</p>
              </div>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">نشط</span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">قاعدة البيانات الرسمية</p>
                <p className="text-xs text-gray-500">PostgreSQL على localhost:5432</p>
              </div>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold">متصل</span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">n8n Gateway</p>
                <p className="text-xs text-gray-500">dodgeqtr.app.n8n.cloud</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">مُهيأ</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4 text-sm">متغيرات البيئة الفعالة (Environment Keys)</h3>
            <div className="space-y-2">
              {['N8N_API_URL', 'N8N_API_KEY', 'DATABASE_URL', 'OLLAMA_URL', 'GEMINI_API_KEY'].map((key) => (
                <div key={key} className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-lg border border-gray-100">
                  <code className="text-xs font-mono text-gray-700">{key}</code>
                  <span className="text-xs text-gray-400 font-mono">••••••••</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* مثبت البرامج الصامت */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">مثبت البرامج الذكي (Silent Installer)</h3>
            <p className="text-xs text-gray-500 mt-1">تثبيت التطبيقات المطلوبة للحصن في الخلفية بنقرة زر</p>
          </div>

          {installMessage && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-xs leading-relaxed">
              {installMessage}
            </div>
          )}

          <div className="space-y-3">
            {appsToInstall.map((app) => (
              <div key={app.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between hover:bg-gray-100/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{app.icon}</span>
                  <span className="text-xs font-semibold text-gray-800">{app.name}</span>
                </div>
                <button
                  onClick={() => handleInstallApp(app.id, app.name)}
                  disabled={installingApp !== null}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded text-[11px] font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {installingApp === app.id ? 'جاري البدء...' : 'تثبيت ⚡'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
