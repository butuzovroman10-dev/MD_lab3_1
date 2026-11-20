import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileJson,
  Upload,
} from 'lucide-react';
import {
  DatabaseState,
  DbRow,
  TABLE_ORDER,
  TABLE_SCHEMAS,
  TableName,
} from '../data/schema';
import {
  ExportFormat,
  generateSamplePayload,
  parseAndValidateImport,
  rowsToCsv,
  rowsToJson,
  triggerFileDownload,
} from '../utils/ioUtils';

interface ImportExportScreenProps {
  db: DatabaseState;
  onImportRows: (table: TableName, rows: DbRow[], mode: 'append' | 'replace') => void;
  exportTrigger: number;
}

interface OperationLog {
  id: string;
  time: string;
  operation: 'Экспорт' | 'Импорт';
  table: TableName;
  format: ExportFormat;
  status: 'success' | 'warning' | 'error';
  message: string;
}

export function ImportExportScreen({
  db,
  onImportRows,
  exportTrigger,
}: ImportExportScreenProps) {
  // Shared / Export settings
  const [exportTable, setExportTable] = useState<TableName>('pilot');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [csvDelimiter, setCsvDelimiter] = useState<',' | ';'>(',');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [prettyJson, setPrettyJson] = useState(true);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Import settings
  const [importTable, setImportTable] = useState<TableName>('track');
  const [importFormat, setImportFormat] = useState<ExportFormat>('csv');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importDelimiter, setImportDelimiter] = useState<',' | ';'>(',');
  const [rawImportText, setRawImportText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Operation logs
  const [logs, setLogs] = useState<OperationLog[]>([
    {
      id: 'log-0',
      time: 'Старт сессии',
      operation: 'Экспорт',
      table: 'pilot',
      format: 'csv',
      status: 'success',
      message: 'Готово к выполнению операций импорта и экспорта CSV / JSON.',
    },
  ]);

  const appendLog = (
    operation: 'Экспорт' | 'Импорт',
    table: TableName,
    format: ExportFormat,
    status: 'success' | 'warning' | 'error',
    message: string
  ) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLogs((prev) => [
      { id: `${Date.now()}`, time, operation, table, format, status, message },
      ...prev.slice(0, 11),
    ]);
  };

  // Export preview string
  const exportPreview = useMemo(() => {
    const schema = TABLE_SCHEMAS[exportTable];
    const rows = db[exportTable];
    if (exportFormat === 'json') {
      return rowsToJson(rows, prettyJson);
    }
    return rowsToCsv(
      schema.columns.map((c) => c.name),
      rows,
      csvDelimiter,
      includeHeaders
    );
  }, [db, exportTable, exportFormat, csvDelimiter, includeHeaders, prettyJson]);

  const handleDownloadExport = () => {
    const ext = exportFormat === 'json' ? 'json' : 'csv';
    const mime = exportFormat === 'json' ? 'application/json' : 'text/csv';
    const filename = `${exportTable}_export.${ext}`;
    triggerFileDownload(exportPreview, filename, mime);
    appendLog(
      'Экспорт',
      exportTable,
      exportFormat,
      'success',
      `Файл ${filename} сформирован (${db[exportTable].length} записей).`
    );
  };

  useEffect(() => {
    if (exportTrigger > 0) {
      handleDownloadExport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportTrigger]);

  const handleCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportPreview);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 1800);
    } catch {
      appendLog('Экспорт', exportTable, exportFormat, 'error', 'Не удалось скопировать в буфер обмена.');
    }
  };

  // Live import parsing & validation
  const importValidation = useMemo(() => {
    if (!rawImportText.trim()) return null;
    return parseAndValidateImport(rawImportText, importFormat, importTable, db, importDelimiter);
  }, [rawImportText, importFormat, importTable, db, importDelimiter]);

  const handleFileRead = (file: File) => {
    const ext = file.name.toLowerCase();
    if (ext.endsWith('.json')) {
      setImportFormat('json');
    } else if (ext.endsWith('.csv') || ext.endsWith('.txt')) {
      setImportFormat('csv');
    }
    setSelectedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setRawImportText(content);
    };
    reader.onerror = () => {
      appendLog('Импорт', importTable, importFormat, 'error', `Не удалось прочитать файл ${file.name}.`);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleLoadSample = () => {
    const sample = generateSamplePayload(importTable, importFormat, importDelimiter);
    setRawImportText(sample);
    setSelectedFileName(`sample_${importTable}.${importFormat}`);
  };

  const handleLoadInvalidSample = () => {
    if (importFormat === 'json') {
      setRawImportText('[{"id_track": "abc", "name": ""}]');
    } else {
      setRawImportText('wrong_col_1,wrong_col_2\n100,test');
    }
    setSelectedFileName(`broken_sample.${importFormat}`);
  };

  const handleRunImport = () => {
    if (!rawImportText.trim()) {
      appendLog('Импорт', importTable, importFormat, 'error', 'Не выбран файл и не введены данные для импорта.');
      return;
    }

    const parsed = parseAndValidateImport(
      rawImportText,
      importFormat,
      importTable,
      db,
      importDelimiter
    );

    if (parsed.errors.length > 0 || parsed.rows.length === 0) {
      appendLog(
        'Импорт',
        importTable,
        importFormat,
        'error',
        parsed.errors[0] || 'Нет валидных записей для загрузки.'
      );
      return;
    }

    onImportRows(importTable, parsed.rows, importMode);
    if (parsed.warnings.length > 0) {
      appendLog(
        'Импорт',
        importTable,
        importFormat,
        'warning',
        `Загружено записей: ${parsed.rows.length} (предупреждений по внешним ключам: ${parsed.warnings.length}).`
      );
    } else {
      appendLog(
        'Импорт',
        importTable,
        importFormat,
        'success',
        `Успешно импортировано записей в таблицу «${importTable}»: ${parsed.rows.length} (${
          importMode === 'append' ? 'добавление' : 'замена'
        }).`
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Импорт и экспорт данных
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Выгрузка таблиц в форматах CSV и JSON, загрузка внешних файлов с проверкой схемы и
          журналом статусов выполнения операций.
        </p>
      </div>

      {/* Two-column workspace: Import + Export */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-start">
        {/* IMPORT PANEL */}
        <section
          data-surface="panel"
          className="rounded-lg border border-slate-200 bg-white overflow-hidden"
        >
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Импорт данных в таблицу
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Выберите целевую таблицу, формат файла (CSV / JSON) и проверьте предпросмотр
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Format selector buttons */}
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Формат импорта
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setImportFormat('csv')}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors ${
                    importFormat === 'csv'
                      ? 'border-blue-700 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV (табличный текст)
                </button>
                <button
                  type="button"
                  onClick={() => setImportFormat('json')}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors ${
                    importFormat === 'json'
                      ? 'border-blue-700 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileJson className="h-4 w-4" />
                  JSON (массив объектов)
                </button>
              </div>
            </div>

            {/* Target table + mode + delimiter */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="import-table"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Целевая таблица
                </label>
                <select
                  id="import-table"
                  value={importTable}
                  onChange={(e) => setImportTable(e.target.value as TableName)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  {TABLE_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {t} — {TABLE_SCHEMAS[t].title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="import-mode"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Режим записи
                </label>
                <select
                  id="import-mode"
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'append' | 'replace')}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  <option value="append">Добавить к существующим</option>
                  <option value="replace">Заменить данные таблицы</option>
                </select>
              </div>
            </div>

            {importFormat === 'csv' && (
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Разделитель столбцов CSV:</span>
                <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setImportDelimiter(',')}
                    className={`rounded px-2.5 py-1 font-mono text-xs ${
                      importDelimiter === ','
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Запятая (,)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportDelimiter(';')}
                    className={`rounded px-2.5 py-1 font-mono text-xs ${
                      importDelimiter === ';'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Точка с запятой (;)
                  </button>
                </div>
              </div>
            )}

            {/* Drag and drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileRead(file);
              }}
              className={`rounded-md border border-dashed p-5 text-center transition-colors ${
                isDragging
                  ? 'border-blue-600 bg-blue-50/70'
                  : 'border-slate-300 bg-slate-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileRead(f);
                }}
              />
              <Upload className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-2 text-xs font-medium text-slate-800">
                {selectedFileName
                  ? `Выбран файл: ${selectedFileName}`
                  : 'Перетащите файл CSV или JSON сюда'}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  Выбрать файл
                </button>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  Подставить корректный пример
                </button>
                <button
                  type="button"
                  onClick={handleLoadInvalidSample}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Тест ошибки
                </button>
              </div>
            </div>

            {/* Raw editable payload */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="raw-import" className="text-xs font-medium text-slate-700">
                  Содержимое для импорта
                </label>
                <span className="font-mono text-[11px] text-slate-400">
                  Поля: {TABLE_SCHEMAS[importTable].columns.map((c) => c.name).join(', ')}
                </span>
              </div>
              <textarea
                id="raw-import"
                rows={5}
                value={rawImportText}
                onChange={(e) => setRawImportText(e.target.value)}
                placeholder={
                  importFormat === 'csv'
                    ? TABLE_SCHEMAS[importTable].columns.map((c) => c.name).join(importDelimiter)
                    : '[{"id_track": 7, "name": "...", "country": "...", "length": 5000}]'
                }
                className="w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>

            {/* Validation diagnostics */}
            {importValidation && (
              <div className="space-y-2">
                {importValidation.errors.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-red-800">
                      <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                      Обнаружены ошибки проверки ({importValidation.errors.length})
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-red-800">
                      {importValidation.errors.slice(0, 4).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importValidation.warnings.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      Предупреждения ссылочной целостности ({importValidation.warnings.length})
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-amber-800">
                      {importValidation.warnings.slice(0, 3).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importValidation.errors.length === 0 && importValidation.rows.length > 0 && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Проверка пройдена. Готово к импорту строк:{' '}
                      <strong className="font-mono">{importValidation.rows.length}</strong>.
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setRawImportText('');
                  setSelectedFileName(null);
                }}
                className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={handleRunImport}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
              >
                <Upload className="h-3.5 w-3.5" />
                Выполнить импорт
              </button>
            </div>
          </div>
        </section>

        {/* EXPORT PANEL */}
        <section
          data-surface="panel"
          className="rounded-lg border border-slate-200 bg-white overflow-hidden"
        >
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Экспорт таблицы
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Настройка формата выгрузки и мгновенное скачивание файла
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Format choice */}
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">
                Формат файла
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors ${
                    exportFormat === 'csv'
                      ? 'border-blue-700 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV (.csv)
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('json')}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors ${
                    exportFormat === 'json'
                      ? 'border-blue-700 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileJson className="h-4 w-4" />
                  JSON (.json)
                </button>
              </div>
            </div>

            {/* Table selector */}
            <div>
              <label
                htmlFor="export-table"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Таблица для выгрузки
              </label>
              <select
                id="export-table"
                value={exportTable}
                onChange={(e) => setExportTable(e.target.value as TableName)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                {TABLE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {t} — {TABLE_SCHEMAS[t].title} ({db[t].length} зап.)
                  </option>
                ))}
              </select>
            </div>

            {/* Format options */}
            {exportFormat === 'csv' ? (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHeaders}
                    onChange={(e) => setIncludeHeaders(e.target.checked)}
                    className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  Включить строку заголовков
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Разделитель:</span>
                  <select
                    aria-label="Разделитель CSV экспорта"
                    value={csvDelimiter}
                    onChange={(e) => setCsvDelimiter(e.target.value as ',' | ';')}
                    className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs"
                  >
                    <option value=",">, (запятая)</option>
                    <option value=";">; (точка с запятой)</option>
                  </select>
                </div>
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prettyJson}
                  onChange={(e) => setPrettyJson(e.target.checked)}
                  className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                Форматированный JSON с отступами (2 пробела)
              </label>
            )}

            {/* Live export preview */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700">
                  Предпросмотр выгрузки
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-400">
                  {new Blob([exportPreview]).size} байт
                </span>
              </div>
              <pre className="max-h-56 overflow-auto rounded-md border border-slate-200 bg-slate-950 p-3.5 font-mono text-[11.5px] leading-relaxed text-slate-100">
                {exportPreview}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopyExport}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Copy className="h-3.5 w-3.5" />
                {copiedFeedback ? 'Скопировано' : 'Копировать'}
              </button>
              <button
                type="button"
                onClick={handleDownloadExport}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                Скачать {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Operation Status Log (Section 5.3) */}
      <section
        data-surface="panel"
        className="rounded-lg border border-slate-200 bg-white overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Журнал операций и статусов
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Протокол выполненных операций импорта, экспорта и сообщений об ошибках
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-400">
            Записей: {logs.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-5 py-2.5">Время</th>
                <th className="px-4 py-2.5">Операция</th>
                <th className="px-4 py-2.5">Таблица</th>
                <th className="px-4 py-2.5">Формат</th>
                <th className="px-4 py-2.5">Статус</th>
                <th className="px-5 py-2.5">Сообщение</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {log.time}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                    {log.operation}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">
                    {log.table}
                  </td>
                  <td className="px-4 py-2.5 font-mono uppercase text-slate-600 whitespace-nowrap">
                    {log.format}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {log.status === 'success' && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Успешно
                      </span>
                    )}
                    {log.status === 'warning' && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Предупреждение
                      </span>
                    )}
                    {log.status === 'error' && (
                      <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Ошибка
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-slate-700">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
