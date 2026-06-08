export default function Workflows() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">سير العمل</h1>
        <p className="text-gray-500 mt-1">إدارة ومراقبة أتمتة n8n</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
        <span className="text-6xl mb-4">⚙️</span>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">منصة الأتمتة</h2>
        <p className="text-gray-500 max-w-md mb-6">
          تمتلك حاليًا 28 سير عمل نشط في n8n. لوحة التحكم المركزية
          ستتيح مراقبتها وإدارتها من هنا.
        </p>
        <a
          href="http://localhost:5678"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          فتح n8n Dashboard
          <span>↗</span>
        </a>
        <div className="mt-6 flex gap-2">
          <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">28 نشط</span>
          <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-full text-sm">7 متوقف</span>
        </div>
      </div>
    </div>
  )
}
