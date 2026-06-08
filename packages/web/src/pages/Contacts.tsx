export default function Contacts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">جهات الاتصال</h1>
        <p className="text-gray-500 mt-1">إدارة العملاء وجهات الاتصال</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
        <span className="text-6xl mb-4">📇</span>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">قيد التطوير</h2>
        <p className="text-gray-500 max-w-md">
          هذه الوحدة قيد الإنشاء حاليًا. سيتم إضافة إدارة جهات الاتصال،
          البحث المتقدم، واستيراد/تصدير البيانات قريبًا.
        </p>
        <div className="mt-6 flex gap-2">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">API Ready</span>
          <span className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm">UI قيد الإنشاء</span>
        </div>
      </div>
    </div>
  )
}
