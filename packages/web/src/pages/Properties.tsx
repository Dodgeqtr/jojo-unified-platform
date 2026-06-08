export default function Properties() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">العقارات</h1>
        <p className="text-gray-500 mt-1">إدارة العقارات والوحدات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">إجمالي العقارات</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">متاحة</p>
          <p className="text-3xl font-bold text-green-600 mt-1">—</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">مؤجرة</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">—</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
        <span className="text-6xl mb-4">🏗️</span>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">قريبًا</h2>
        <p className="text-gray-500 max-w-md">
          وحدة إدارة العقارات قيد التطوير. ستشمل إضافة وتحرير العقارات،
          رفع الصور، وجدولة الزيارات.
        </p>
      </div>
    </div>
  )
}
