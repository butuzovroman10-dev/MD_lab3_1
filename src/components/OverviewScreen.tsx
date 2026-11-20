import React from 'react';
import { ArrowRight } from 'lucide-react';
import {
  DatabaseState,
  ER_RELATIONS,
  PROTOTYPE_SCENARIO_STEPS,
  ScreenId,
  TABLE_ORDER,
  TABLE_SCHEMAS,
  TableName,
} from '../data/schema';
import { InteractiveErDiagram } from './InteractiveErDiagram';

interface OverviewScreenProps {
  db: DatabaseState;
  onNavigate: (screen: ScreenId, table?: TableName) => void;
  onStartScenario: (stepIndex?: number) => void;
}

export function OverviewScreen({
  db,
  onNavigate,
  onStartScenario,
}: OverviewScreenProps) {
  const totalRows = Object.values(db).reduce((sum, list) => sum + list.length, 0);
  const totalColumns = TABLE_ORDER.reduce(
    (sum, t) => sum + TABLE_SCHEMAS[t].columns.length,
    0
  );

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Обзор реляционной базы данных
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Интерактивный прототип клиентского приложения для управления данными чемпионатов
            автоспорта: структура таблиц, формы просмотра и ввода, SQL-консоль, импорт/экспорт и
            дизайн-система.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Таблиц: {TABLE_ORDER.length}</span>
          <span aria-hidden="true">·</span>
          <span>Связей: {ER_RELATIONS.length}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">Записей: {totalRows}</span>
        </div>
      </div>

      {/* 4-column flat summary strip with hairline dividers (no nested cards) */}
      <div
        data-surface="panel"
        className="grid grid-cols-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white md:grid-cols-4 md:divide-x md:divide-y-0"
      >
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Всего таблиц</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {TABLE_ORDER.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">{totalColumns} атрибутов по ER-схеме</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Записей в базе</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {totalRows}
          </p>
          <p className="mt-1 text-xs text-slate-500">Ссылочная целостность сохранена</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Внешние ключи</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {ER_RELATIONS.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Связи N:1 между сущностями</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Экранные формы</p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            6
          </p>
          <p className="mt-1 text-xs text-slate-500">Связанный интерактивный прототип</p>
        </div>
      </div>

      {/* Dominant visual anchor: Interactive ER Diagram */}
      <InteractiveErDiagram
        db={db}
        onSelectTable={(table) => onNavigate('tables', table)}
      />

      {/* Two-column lower section: Tables directory + Interactive Prototype Scenarios */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        {/* Table quick directory */}
        <div
          data-surface="panel"
          className="xl:col-span-7 rounded-lg border border-slate-200 bg-white overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Справочник таблиц
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Быстрый переход к форме просмотра и редактирования данных
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('tables', 'pilot')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              Открыть таблицы
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="px-5 py-2.5">Таблица</th>
                  <th className="px-4 py-2.5">Назначение</th>
                  <th className="px-4 py-2.5">Ключ (PK)</th>
                  <th className="px-5 py-2.5 text-right">Строк</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TABLE_ORDER.map((tableName) => {
                  const schema = TABLE_SCHEMAS[tableName];
                  return (
                    <tr
                      key={tableName}
                      onClick={() => onNavigate('tables', tableName)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-2.5 font-mono text-xs font-semibold text-blue-700 whitespace-nowrap">
                        {schema.name}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-700">
                        <span className="font-medium text-slate-900">{schema.title}</span>
                        <span className="text-slate-400 mx-1.5">/</span>
                        <span className="text-slate-500">{schema.columns.length} полей</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {schema.primaryKey}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-xs tabular-nums text-slate-900">
                        {db[tableName].length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive Prototype User Scenarios (Section 7.3) */}
        <div
          data-surface="panel"
          className="xl:col-span-5 rounded-lg border border-slate-200 bg-white overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Сценарии прототипа
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Демонстрация переходов и основных пользовательских потоков
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartScenario(0)}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 whitespace-nowrap"
            >
              Пройти всё
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {PROTOTYPE_SCENARIO_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => onStartScenario(idx)}
                className="flex w-full items-start justify-between gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
