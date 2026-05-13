import { BarChart3, Map, Menu, X } from 'lucide-react'
import { useState } from 'react'
import type { ActiveView } from '../../types'

interface HeaderProps {
  activeView: ActiveView
  onViewChange: (v: ActiveView) => void
  onReportClick: () => void
}

export default function Header({ activeView, onViewChange, onReportClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">RW</span>
          </div>
          <div className="leading-tight">
            <span className="font-bold text-gray-900 text-sm tracking-tight">RoadWatch</span>
            <span className="text-xs text-orange-600 font-medium block -mt-0.5">Bangalore</span>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onViewChange('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'map'
                ? 'bg-orange-50 text-orange-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Map size={15} />
            Map
          </button>
          <button
            onClick={() => onViewChange('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'dashboard'
                ? 'bg-orange-50 text-orange-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <BarChart3 size={15} />
            Dashboard
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onReportClick}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            + Report Issue
          </button>
          <button
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-2 flex gap-2">
          <button
            onClick={() => { onViewChange('map'); setMenuOpen(false) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium flex-1 justify-center ${
              activeView === 'map' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Map size={15} /> Map
          </button>
          <button
            onClick={() => { onViewChange('dashboard'); setMenuOpen(false) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium flex-1 justify-center ${
              activeView === 'dashboard' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 size={15} /> Dashboard
          </button>
        </div>
      )}
    </header>
  )
}
