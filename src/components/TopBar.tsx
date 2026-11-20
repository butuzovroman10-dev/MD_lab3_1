import React from 'react';
import { ChevronRight, Menu, Plus, Play, Download, Eye, Layers } from 'lucide-react';
import { ScreenId, TABLE_SCHEMAS, TableName } from '../data/schema';

interface TopBarProps {
  activeScreen: ScreenId;
  activeTable: TableName;
  wireframeMode: boolean;
  onToggleWireframeMode: () => void;
  onOpenMobileMenu: () => void;
  onPrimaryAction: () => void;
}

const SCREEN_TITLES: Record<ScreenId, string> = {
  overview: 'Обзор и ER-схема',
  tables: 'Таблицы данных',
  sql: 'SQL-запросы',
  'import-export': 'Импорт и экспорт',
  wireframes: 'Wireframes и потоки',
  'design-system': 'Дизайн-система',
};

export function TopBar({
  activeScreen,
  activeTable,
  wireframeMode,
  onToggleWireframeMode,
  onOpenMobileMenu,
  onPrimaryAction,
}: TopBarProps) {
  const renderPrimaryCta = () => {
    switch (activeScreen) {
      case 'tables':
        return (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить запись
          </button>
        );
      case 'sql':
        return (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
          >
            <Play className="h-3.5 w-3.5" />
            Выполнить SQL
          </button>
        );
      case 'import-export':
        return (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
          >
            <Download className="h-3.5 w-3.5" />
            Экспортировать
          </button>
        );
      default:
        return (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
          >
            <Play className="h-3.5 w-3.5" />
            Запустить сценарий
          </button>
        );
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      {/* Left zone: Mobile menu button + Breadcrumb trail */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Открыть навигацию"
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden shrink-0"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav aria-label="Хлебные крошки" className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="hidden sm:inline text-slate-500 whitespace-nowrap">База данных</span>
          <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span
            className={`truncate ${
              activeScreen === 'tables'
                ? 'text-slate-500'
                : 'font-medium text-slate-900'
            }`}
          >
            {SCREEN_TITLES[activeScreen]}
          </span>
          {activeScreen === 'tables' && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-mono text-xs font-semibold text-slate-900 truncate">
                {TABLE_SCHEMAS[activeTable].name}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right zone: Wireframe preview switch + 1 primary action */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onToggleWireframeMode}
          title="Переключить режим отображения между каркасом (Wireframe) и чистовым интерфейсом (UI)"
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            wireframeMode
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          {wireframeMode ? (
            <>
              <Eye className="h-3.5 w-3.5" />
              Режим UI
            </>
          ) : (
            <>
              <Layers className="h-3.5 w-3.5" />
              Режим Wireframe
            </>
          )}
        </button>

        {renderPrimaryCta()}
      </div>
    </header>
  );
}
