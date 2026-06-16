import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import { DEFAULT_ORG_ID } from '../../../lib/constants'

interface Property {
  id: string
  name: string
  property_type?: string | null
  price?: number | string | null
  size_sqm?: number | string | null
  status?: string | null
  location?: string | null
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [propertyType, setPropertyType] = useState('شقة')
  const [price, setPrice] = useState('')
  const [sizeSqm, setSizeSqm] = useState('')
  const [status, setStatus] = useState('متاح')
  const [location, setLocation] = useState('')

  const fetchProperties = async () => {
    setIsLoading(true)
    try {
      const data = await api.properties.list.query({
        org_id: DEFAULT_ORG_ID,
        limit: 100,
        offset: 0,
      })
      setProperties((data as any)?.items ?? data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price || !sizeSqm) return

    try {
      await api.properties.create.mutate({
        org_id: DEFAULT_ORG_ID,
        name,
        property_type: propertyType,
        price: parseFloat(price),
        size_sqm: parseFloat(sizeSqm),
        status,
        location: location || undefined,
      })

      // Reset form
      setName('')
      setPropertyType('شقة')
      setPrice('')
      setSizeSqm('')
      setStatus('متاح')
      setLocation('')
      setShowAddModal(false)
      fetchProperties() // Refresh list
    } catch (err) {
      console.error(err)
      alert('⚠️ فشل إضافة العقار.')
    }
  }

  // Stats
  const totalCount = properties.length
  const availableCount = properties.filter((p) => p.status === 'متاح' || p.status === 'available').length
  const rentedCount = properties.filter((p) => p.status === 'مؤجر' || p.status === 'rented' || p.status === 'sold' || p.status === 'مباع').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">العقارات والممتلكات</h1>
          <p className="text-gray-500 mt-1">إدارة المحفظة العقارية والوحدات المتاحة</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
        >
          إضافة عقار جديد 🏠
        </button>
      </div>

      {/* شريط الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">إجمالي العقارات</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{isLoading ? '...' : totalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">الوحدات المتاحة</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{isLoading ? '...' : availableCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">الوحدات المؤجرة/المباعة</p>
          <p className="text-3xl font-bold text-indigo-600 mt-1">{isLoading ? '...' : rentedCount}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <span className="inline-block animate-spin text-3xl mb-2">🔄</span>
          <p>جاري تحميل العقارات...</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          <p>لا توجد عقارات مسجلة حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
              {/* صورة رمزية للعقار */}
              <div className="h-40 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold">
                🏢
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded">
                      {p.property_type || '—'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      p.status === 'متاح' || p.status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {p.status || '—'}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{p.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.location || 'لا يوجد موقع محدد.'}</p>
                </div>

                <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block">السعر المطلوب</span>
                    <span className="font-bold text-gray-900">{p.price ? Number(p.price).toLocaleString() : '—'} ر.ق</span>
                  </div>
                  <div className="text-left">
                    <span className="text-xs text-gray-400 block">المساحة</span>
                    <span className="font-semibold text-gray-800">{p.size_sqm ?? '—'} م²</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* مودال الإضافة */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl border border-gray-100" dir="rtl">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">إضافة عقار جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">اسم/عنوان العقار *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="شقة فاخرة في اللؤلؤة"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">نوع العقار</label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="شقة">شقة</option>
                    <option value="فيلا">فيلا</option>
                    <option value="أرض">أرض</option>
                    <option value="مكتب">مكتب</option>
                    <option value="محل تجاري">محل تجاري</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">الحالة</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="متاح">متاح</option>
                    <option value="مؤجر">مؤجر</option>
                    <option value="مباع">مباع</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">السعر (ر.ق) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="1,200,000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">المساحة (م²) *</label>
                  <input
                    type="number"
                    required
                    value={sizeSqm}
                    onChange={(e) => setSizeSqm(e.target.value)}
                    placeholder="150"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">الموقع</label>
                <textarea
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="حي اللؤلؤة، الدوحة..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="pt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm"
                >
                  حفظ العقار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
