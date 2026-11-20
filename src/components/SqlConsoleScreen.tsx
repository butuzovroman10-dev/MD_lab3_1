import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eraser,
  Play,
  Wand2,
} from 'lucide-react';
import { DatabaseState, TABLE_ORDER, TABLE_SCHEMAS } from '../data/schema';
import { executeSql, formatSql, SQL_PRESETS, SqlExecutionResult } from '../utils/sqlEngine';
import { rowsToCsv, rowsToJson, triggerFileDownload } from '../utils/ioUtils';

interface SqlConsoleScreenProps {
  db: DatabaseState;
  onUpdateDb: (nextDb: DatabaseState) => void;
  runTrigger: number;
}

interface QueryHistoryItem {
  id: string;
  sql: string;
  timestamp: string;
  success: boolean;
  rowsCount: number;
  ms: number;
}

export function SqlConsoleScreen({
  db,
  onUpdateDb,
  runTrigger,
}: SqlConsoleScreenProps) {
  const [sqlText, setSqlText] = useState<string>(SQL_PRESETS[0].sql);
  const [result, setResult] = useState<SqlExecutionResult | null>(() =>
    executeSql(SQL_PRESETS[0].sql, db)
  );
  const [history, setHistory] = useState<QueryHistoryItem[]>([
    {
      id: 'init',
      sql: SQL_PRESETS[0].sql,
      timestamp: 'Сейчас',
      success: true,
      rowsCount: executeSql(SQL_PRESETS[0].sql, db).affectedRows,
      ms: 0.4,
    },
  ]);

  const handleRun = (customSql?: string) => {
    const queryToRun = customSql ?? sqlText;
    const execRes = executeSql(queryToRun, db);
    setResult(execRes);
    if (execRes.success && execRes.updatedDb) {
      onUpdateDb(execRes.updatedDb);
    }

    const now = new Date();
    const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    setHistory((prev) => [
      {
        id: `${Date.now()}`,
        sql: queryToRun.trim(),
        timestamp: timeLabel,
        success: execRes.success,
        rowsCount: execRes.affectedRows,
        ms: execRes.executionMs,
      },
      ...prev.slice(0, 9),
    ]);
  };

  useEffect(() => {
    if (runTrigger > 0) {
      handleRun();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runTrigger]);

  const handleClear = () => {
    setSqlText('');
    setResult(null);
  };

  const handleFormat = () => {
    setSqlText((prev) => formatSql(prev));
  };

  const insertToken = (token: string) => {
    setSqlText((prev) => (prev ? `${prev}${prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' '}${token}` : token));
  };

  const handleExportResults = (format: 'csv' | 'json') => {
    if (!result || !result.success || result.rows.length === 0) return;
    if (format === 'csv') {
      const content = rowsToCsv(result.columns, result.rows, ',', true);
      triggerFileDownload(content, 'sql_query_result.csv', 'text/csv');
    } else {
      const content = rowsToJson(result.rows, true);
      triggerFileDownload(content, 'sql_query_result.json', 'application/json');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Выполнение SQL-запросов
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Редактор SQL с поддержкой SELECT, JOIN, WHERE, GROUP BY, агрегатных функций, INSERT,
            UPDATE и DELETE по таблицам базы данных.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Быстрый запуск: <span className="font-mono text-slate-700">Ctrl + Enter</span>
        </div>
      </div>

      {/* Main 12-col workspace: Editor + Results on left (8 cols), Schema & Presets on right (4 cols) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        <div className="xl:col-span-8 space-y-6">
          {/* SQL Editor panel */}
          <div
            data-surface="panel"
            className="rounded-lg border border-slate-200 bg-white overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <span className="text-xs font-semibold text-slate-700">
                Редактор запроса
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFormat}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Форматировать
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Очистить
                </button>
                <button
                  type="button"
                  onClick={() => handleRun()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                >
                  <Play className="h-3.5 w-3.5" />
                  Выполнить
                </button>
              </div>
            </div>

            <div className="p-0">
              <textarea
                aria-label="Поле ввода SQL-запроса"
                value={sqlText}
                onChange={(e) => setSqlText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleRun();
                  }
                }}
                rows={8}
                spellCheck={false}
                placeholder="SELECT * FROM pilot ORDER BY number ASC;"
                className="block w-full resize-y bg-slate-950 p-4 font-mono text-[13px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* Preset quick buttons strip */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-2.5">
              <span className="text-xs text-slate-500 mr-1">Шаблоны:</span>
              {SQL_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSqlText(preset.sql);
                    handleRun(preset.sql);
                  }}
                  className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors whitespace-nowrap"
                >
                  {preset.category}: {preset.title.split('(')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Query Results Area */}
          <div
            data-surface="panel"
            className="rounded-lg border border-slate-200 bg-white overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Результаты выполнения
                </h2>
                {result && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {result.executionMs} мс
                    </span>
                    {result.success && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Строк: {result.affectedRows}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {result?.success && result.rows.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportResults('csv')}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Download className="h-3 w-3" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportResults('json')}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Download className="h-3 w-3" />
                    JSON
                  </button>
                </div>
              )}
            </div>

            {!result ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">
                Введите SQL-запрос выше и нажмите «Выполнить», чтобы увидеть результат выборки.
              </div>
            ) : !result.success ? (
              <div className="p-5">
                <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Ошибка выполнения SQL-запроса</p>
                    <p className="mt-1 text-xs text-red-800 leading-relaxed">{result.error}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 bg-emerald-50/60 px-4 py-2 text-xs text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{result.message}</span>
                </div>

                {result.rows.length === 0 ? (
                  <div className="px-6 py-10 text-center text-xs text-slate-500">
                    Запрос выполнен корректно, но не вернул ни одной строки.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[420px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                        <tr>
                          {result.columns.map((col) => (
                            <th
                              key={col}
                              className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-600 whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {result.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {result.columns.map((col) => {
                              const val = row[col];
                              const isNum = typeof val === 'number';
                              return (
                                <td
                                  key={col}
                                  className={`px-4 py-2 text-xs whitespace-nowrap ${
                                    isNum
                                      ? 'font-mono tabular-nums text-slate-900'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  {val === null || val === undefined ? (
                                    <span className="font-mono text-slate-400">NULL</span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Schema quick-insert + History */}
        <div className="xl:col-span-4 space-y-6">
          {/* Schema explorer */}
          <div
            data-surface="panel"
            className="rounded-lg border border-slate-200 bg-white overflow-hidden"
          >
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Схема таблиц для вставки
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Нажмите на имя таблицы или столбца для вставки в редактор
              </p>
            </div>
            <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
              {TABLE_ORDER.map((tName) => {
                const schema = TABLE_SCHEMAS[tName];
                return (
                  <div key={tName} className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => insertToken(schema.name)}
                      className="font-mono text-xs font-semibold text-blue-700 hover:underline"
                    >
                      {schema.name}
                    </button>
                    <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
                      {schema.columns.map((col) => (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => insertToken(col.name)}
                          className="font-mono text-[11px] text-slate-600 hover:text-slate-900 hover:underline"
                        >
                          {col.name}
                          {col.isPrimaryKey ? ' (PK)' : col.foreignKey ? ' (FK)' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Query execution history */}
          <div
            data-surface="panel"
            className="rounded-lg border border-slate-200 bg-white overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                История запросов
              </h2>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                {history.length}
              </span>
            </div>
            <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSqlText(item.sql)}
                  className="block w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.timestamp}
                    </span>
                    <span
                      className={`font-medium ${
                        item.success ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {item.success ? `Успешно (${item.rowsCount})` : 'Ошибка'}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-slate-800 line-clamp-2">
                    {item.sql}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
