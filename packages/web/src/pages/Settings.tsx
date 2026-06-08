export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
        <p className="text-gray-500 mt-1">تكوين المنظومة والمتغيرات</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">حالة النظام</p>
              <p className="text-sm text-gray-500">Jojo Unified Platform v1.0.0</p>
            </div>
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">نشط</span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">قاعدة البيانات</p>
              <p className="text-sm text-gray-500">PostgreSQL 15 على localhost:5432</p>
            </div>
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">متصل</span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Redis Cache</p>
              <p className="text-sm text-gray-500">Redis 7 على localhost:6379</p>
            </div>
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">متصل</span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">n8n Integration</p>
              <p className="text-sm text-gray-500">dodgeqtr.app.n8n.cloud</p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">مُهيأ</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">متغيرات البيئة</h3>
          <div className="space-y-2">
            {['N8N_API_URL', 'N8N_API_KEY', 'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'].map((key) => (
              <div key={key} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <code className="text-sm text-gray-700">{key}</code>
                <span className="text-sm text-gray-400">••••••••</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
