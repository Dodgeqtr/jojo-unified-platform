import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
  { path: '/contacts', label: 'جهات الاتصال', icon: '📇' },
  { path: '/properties', label: 'العقارات', icon: '🏠' },
  { path: '/workflows', label: 'سير العمل', icon: '⚙️' },
  { path: '/agents', label: 'الوكلاء الذكية', icon: '🧠' },
  { path: '/settings', label: 'الإعدادات', icon: '🔧' },
]

export default function DashboardLayout() {
  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      <aside className="w-64 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Jojo Platform</h1>
          <p className="text-sm text-gray-500 mt-1">نظام الإدارة الموحد</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            النظام活跃
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Jojo Unified Platform</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">john@jojo.com</span>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                J
              </div>
            </div>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
