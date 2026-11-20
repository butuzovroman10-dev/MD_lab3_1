import React from 'react';
import {
  ArrowLeftRight,
  Database,
  LayoutGrid,
  Palette,
  PenTool,
  Table2,
  Terminal,
  X,
} from 'lucide-react';
import { DatabaseState, ScreenId, TABLE_ORDER, TABLE_SCHEMAS, TableName } from '../data/schema';

interface SidebarProps {
  activeScreen: ScreenId;
  activeTable: TableName;
  db: DatabaseState;
  onNavigate: (screen: ScreenId, table?: TableName) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: ScreenId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'overview', label: 'Обзор и ER-схема', icon: LayoutGrid },
  { id: 'tables', label: 'Таблицы данных', icon: Table2 },
  { id: 'sql', label: 'SQL-запросы', icon: Terminal },
  { id: 'import-export', label: 'Импорт / Экспорт', icon: ArrowLeftRight },
];

const DESIGN_NAV: NavItem[] = [
  { id: 'wireframes', label: 'Wireframes и потоки', icon: PenTool },
  { id: 'design-system', label: 'Дизайн-система', icon: Palette },
];

export function Sidebar({
  activeScreen,
  activeTable,
  db,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleNav = (screen: ScreenId, table?: TableName) => {
    onNavigate(screen, table);
    onCloseMobile();
  };

  const sidebarContent = (
    <div
      data-surface="sidebar"
      className="flex h-full w-64 flex-col border-r border-slate-200 bg-white select-none"
    >
      {/* Brand header — single clean wordmark */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
        <button
          type="button"
          onClick={() => handleNav('overview')}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          <Database className="h-5 w-5 text-blue-700 shrink-0" />
          <span className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            RaceDB Studio
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Закрыть меню"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable navigation tree */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Section 1: Main screens */}
        <div>
          <p className="px-2.5 pb-2 text-xs font-medium text-slate-500">
            Рабочая область
          </p>
          <nav className="space-y-0.5" aria-label="Основная навигация">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 2: Quick access to all 8 ER tables */}
        <div>
          <div className="flex items-center justify-between px-2.5 pb-2">
            <p className="text-xs font-medium text-slate-500">Таблицы БД</p>
            <span className="font-mono text-xs tabular-nums text-slate-400">
              {TABLE_ORDER.length}
            </span>
          </div>
          <nav className="space-y-0.5" aria-label="Таблицы базы данных">
            {TABLE_ORDER.map((tableName) => {
              const schema = TABLE_SCHEMAS[tableName];
              const isCurrentTable =
                activeScreen === 'tables' && activeTable === tableName;
              const count = db[tableName].length;

              return (
                <button
                  key={tableName}
                  type="button"
                  onClick={() => handleNav('tables', tableName)}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                    isCurrentTable
                      ? 'bg-slate-900 text-white font-medium'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="font-mono text-xs truncate">{schema.name}</span>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isCurrentTable ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section 3: UX / Design documentation */}
        <div>
          <p className="px-2.5 pb-2 text-xs font-medium text-slate-500">
            Проектирование UI
          </p>
          <nav className="space-y-0.5" aria-label="Проектирование интерфейса">
            {DESIGN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Quiet schema footer summary */}
      <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <span>Схема автоспорта</span>
          <span className="font-mono tabular-nums text-slate-600">
            {Object.values(db).reduce((sum, rows) => sum + rows.length, 0)} зап.
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block shrink-0">{sidebarContent}</aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
