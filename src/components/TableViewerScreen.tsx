import React, { useMemo, useState, useEffect } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  ColumnDef,
  DatabaseState,
  DbRow,
  TABLE_ORDER,
  TABLE_SCHEMAS,
  TableName,
} from '../data/schema';

interface TableViewerScreenProps {
  db: DatabaseState;
  activeTable: TableName;
  onSelectTable: (table: TableName) => void;
  onSaveRow: (table: TableName, row: DbRow, isEdit: boolean, originalPk?: string | number) => string | null;
  onDeleteRow: (table: TableName, pkValue: string | number) => void;
  openCreateTrigger: number;
}

type SortDirection = 'asc' | 'desc' | null;

export function TableViewerScreen({
  db,
  activeTable,
  onSelectTable,
  onSaveRow,
  onDeleteRow,
  openCreateTrigger,
}: TableViewerScreenProps) {
  const schema = TABLE_SCHEMAS[activeTable];
  const rows = db[activeTable];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string | null>(schema.primaryKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // CRUD modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DbRow | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalFormError, setGeneralFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DbRow | null>(null);

  // Reset filters & sorting when switching tables
  useEffect(() => {
    setSearchQuery('');
    const defaultFilterCol =
      schema.columns.find((c) => c.foreignKey)?.name ||
      schema.columns.find((c) => !c.isPrimaryKey && c.type === 'text')?.name ||
      '';
    setFilterColumn(defaultFilterCol);
    setFilterValue('');
    setSortColumn(schema.primaryKey);
    setSortDirection('asc');
    setPage(1);
  }, [activeTable, schema]);

  // Open create modal when TopBar primary button is clicked
  useEffect(() => {
    if (openCreateTrigger > 0) {
      openCreateModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreateTrigger]);

  const getForeignDisplay = (col: ColumnDef, val: string | number | null): string | null => {
    if (!col.foreignKey || val === null || val === undefined) return null;
    const refTable = db[col.foreignKey.table];
    const matched = refTable.find(
      (r) => String(r[col.foreignKey!.column]) === String(val)
    );
    if (!matched) return null;
    if (col.foreignKey.table === 'pilot') {
      return `${matched.first_name ?? ''} ${matched.last_name ?? ''}`.trim();
    }
    return String(matched[col.foreignKey.displayColumn] ?? '');
  };

  // Distinct values for active filter column
  const filterOptions = useMemo(() => {
    if (!filterColumn) return [];
    const colDef = schema.columns.find((c) => c.name === filterColumn);
    const seen = new Map<string, string>();
    rows.forEach((r) => {
      const raw = r[filterColumn];
      if (raw !== null && raw !== undefined && String(raw) !== '') {
        const key = String(raw);
        if (!seen.has(key)) {
          const fkLabel = colDef ? getForeignDisplay(colDef, raw) : null;
          seen.set(key, fkLabel ? `${key} — ${fkLabel}` : key);
        }
      }
    });
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1], 'ru'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterColumn, rows, db, schema]);

  // Filtered and sorted rows
  const processedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (filterColumn && filterValue) {
        if (String(row[filterColumn] ?? '') !== filterValue) return false;
      }
      if (!q) return true;
      return schema.columns.some((col) => {
        const raw = String(row[col.name] ?? '').toLowerCase();
        if (raw.includes(q)) return true;
        const fkText = getForeignDisplay(col, row[col.name]);
        return fkText ? fkText.toLowerCase().includes(q) : false;
      });
    });

    if (!sortColumn || !sortDirection) return filtered;

    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortColumn];
      const bv = b[sortColumn];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1 * dir;
      if (bv === null || bv === undefined) return -1 * dir;
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av > bv ? 1 : -1) * dir;
      }
      return String(av).localeCompare(String(bv), 'ru') * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, searchQuery, filterColumn, filterValue, sortColumn, sortDirection, schema, db]);

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = processedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSortToggle = (colName: string) => {
    if (sortColumn !== colName) {
      setSortColumn(colName);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumn(null);
      setSortDirection(null);
    }
  };

  const openCreateModal = () => {
    const defaults: Record<string, string> = {};
    const existingPks = rows
      .map((r) => Number(r[schema.primaryKey]))
      .filter((n) => !Number.isNaN(n));
    const nextPk = existingPks.length > 0 ? Math.max(...existingPks) + 1 : 1;

    schema.columns.forEach((col) => {
      if (col.isPrimaryKey && col.type === 'integer') {
        defaults[col.name] = String(nextPk);
      } else if (col.foreignKey) {
        const firstRef = db[col.foreignKey.table][0];
        defaults[col.name] = firstRef ? String(firstRef[col.foreignKey.column]) : '';
      } else if (col.type === 'color') {
        defaults[col.name] = '#1D4ED8';
      } else {
        defaults[col.name] = '';
      }
    });

    setEditingRow(null);
    setFormValues(defaults);
    setFormErrors({});
    setGeneralFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (row: DbRow) => {
    const vals: Record<string, string> = {};
    schema.columns.forEach((col) => {
      vals[col.name] = row[col.name] !== null && row[col.name] !== undefined ? String(row[col.name]) : '';
    });
    setEditingRow(row);
    setFormValues(vals);
    setFormErrors({});
    setGeneralFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const parsedRow: DbRow = {};

    for (const col of schema.columns) {
      const raw = (formValues[col.name] ?? '').trim();
      if (col.isRequired && !raw) {
        errs[col.name] = 'Обязательное поле';
        continue;
      }
      if (!raw) {
        parsedRow[col.name] = null;
        continue;
      }
      if (col.type === 'integer') {
        const num = Number(raw);
        if (Number.isNaN(num) || !Number.isInteger(num)) {
          errs[col.name] = 'Введите целое число';
          continue;
        }
        parsedRow[col.name] = num;
      } else {
        parsedRow[col.name] = raw;
      }
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    const originalPk = editingRow ? (editingRow[schema.primaryKey] as string | number) : undefined;
    const saveErr = onSaveRow(activeTable, parsedRow, Boolean(editingRow), originalPk);
    if (saveErr) {
      setGeneralFormError(saveErr);
      return;
    }
    setModalOpen(false);
  };

  const hasActiveFilters = Boolean(searchQuery.trim() || filterValue);

  return (
    <div className="space-y-6">
      {/* Screen heading + table switcher */}
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              {schema.title}{' '}
              <span className="font-mono text-lg font-medium text-slate-500">
                ({schema.name})
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-600">{schema.description}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Ключ: <strong className="font-mono font-medium text-slate-800">{schema.primaryKey}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Показано {processedRows.length} из {rows.length}
            </span>
          </div>
        </div>

        {/* Table navigation tabs (interactive segmented bar) */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-px">
          {TABLE_ORDER.map((tName) => {
            const isActive = tName === activeTable;
            return (
              <button
                key={tName}
                type="button"
                onClick={() => onSelectTable(tName)}
                className={`border-b-2 px-3 py-2 font-mono text-xs transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-blue-700 font-semibold text-blue-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {tName}{' '}
                <span className="tabular-nums text-slate-400">({db[tName].length})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main data card (single elevation, flat hairline border) */}
      <div
        data-surface="panel"
        className="rounded-lg border border-slate-200 bg-white overflow-hidden"
      >
        {/* Filter & search toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Search input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={`Поиск по таблице ${schema.name}...`}
                className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Очистить поиск"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dynamic column filter */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Столбец фильтрации"
                value={filterColumn}
                onChange={(e) => {
                  setFilterColumn(e.target.value);
                  setFilterValue('');
                  setPage(1);
                }}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                {schema.columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    Фильтр: {c.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Значение фильтра"
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setPage(1);
                }}
                className="max-w-[200px] rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              >
                <option value="">Все значения</option>
                {filterOptions.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterValue('');
                    setPage(1);
                  }}
                  className="rounded-md px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Новая запись
          </button>
        </div>

        {/* High-density tabular grid */}
        {paginatedRows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {rows.length === 0
                ? `В таблице «${schema.name}» пока нет записей`
                : 'По заданным параметрам фильтрации записей не найдено'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {rows.length === 0
                ? 'Добавьте первую запись вручную или загрузите данные через раздел Импорт / Экспорт.'
                : 'Измените поисковый запрос или сбросьте активный фильтр столбца.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterValue('');
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
                >
                  Сбросить фильтры
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="rounded-md bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800"
                >
                  Добавить первую запись
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {schema.columns.map((col) => {
                    const isSorted = sortColumn === col.name && sortDirection !== null;
                    const isNumeric = col.type === 'integer';
                    return (
                      <th
                        key={col.name}
                        className={`px-4 py-2.5 text-xs font-semibold text-slate-600 whitespace-nowrap ${
                          isNumeric ? 'text-right' : 'text-left'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSortToggle(col.name)}
                          className={`inline-flex items-center gap-1 hover:text-slate-900 focus:outline-none ${
                            isNumeric ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <span>{col.label}</span>
                          <span className="font-mono text-[11px] font-normal text-slate-400">
                            {col.name}
                          </span>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-blue-700" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-blue-700" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-300" />
                          )}
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedRows.map((row) => {
                  const pkVal = row[schema.primaryKey];
                  return (
                    <tr
                      key={String(pkVal)}
                      className="hover:bg-slate-50/90 transition-colors"
                    >
                      {schema.columns.map((col) => {
                        const val = row[col.name];
                        const fkDisplay = getForeignDisplay(col, val);

                        if (col.type === 'color' && typeof val === 'string') {
                          return (
                            <td key={col.name} className="px-4 py-2.5 whitespace-nowrap">
                              <div className="inline-flex items-center gap-2 font-mono text-xs text-slate-800">
                                <span
                                  className="h-3.5 w-3.5 rounded-xs border border-slate-300 shrink-0"
                                  style={{ backgroundColor: val }}
                                  aria-hidden="true"
                                />
                                <span>{val}</span>
                              </div>
                            </td>
                          );
                        }

                        if (col.foreignKey && val !== null) {
                          return (
                            <td key={col.name} className="px-4 py-2.5 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onSelectTable(col.foreignKey!.table)}
                                title={`Перейти в таблицу ${col.foreignKey.table}`}
                                className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 hover:underline"
                              >
                                <span className="font-mono tabular-nums font-medium">{val}</span>
                                {fkDisplay && (
                                  <span className="text-slate-500 font-sans max-w-[140px] truncate">
                                    ({fkDisplay})
                                  </span>
                                )}
                                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                              </button>
                            </td>
                          );
                        }

                        if (col.type === 'integer') {
                          return (
                            <td
                              key={col.name}
                              className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums whitespace-nowrap ${
                                col.isPrimaryKey
                                  ? 'font-semibold text-slate-900'
                                  : 'text-slate-700'
                              }`}
                            >
                              {val ?? '—'}
                            </td>
                          );
                        }

                        if (col.name === 'lap_time' || col.type === 'date') {
                          return (
                            <td
                              key={col.name}
                              className="px-4 py-2.5 font-mono text-xs tabular-nums text-slate-800 whitespace-nowrap"
                            >
                              {val ?? '—'}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col.name}
                            className="px-4 py-2.5 text-xs text-slate-800 whitespace-nowrap"
                          >
                            {val ?? '—'}
                          </td>
                        );
                      })}

                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            aria-label="Редактировать запись"
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            aria-label="Удалить запись"
                            className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {processedRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-600">
            <span className="font-mono tabular-nums">
              Строки {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, processedRows.length)} из {processedRows.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              <span className="px-2 font-mono tabular-nums text-slate-700">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Вперёд
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Record Modal (Data Input Form) */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-modal-title"
        >
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2
                  id="record-modal-title"
                  className="font-display text-base font-semibold text-slate-900"
                >
                  {editingRow
                    ? `Редактирование записи (${schema.name})`
                    : `Новая запись в таблицу ${schema.name}`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Заполните поля формы с учётом типов данных и внешних ключей
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Закрыть окно"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {generalFormError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                  <strong className="font-semibold">Ошибка сохранения: </strong>
                  {generalFormError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {schema.columns.map((col) => {
                  const err = formErrors[col.name];
                  const val = formValues[col.name] ?? '';

                  return (
                    <div
                      key={col.name}
                      className={col.name === 'name' || col.name === 'sponsor' ? 'sm:col-span-2' : ''}
                    >
                      <label
                        htmlFor={`field-${col.name}`}
                        className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1"
                      >
                        <span>
                          {col.label}
                          {col.isRequired && <span className="text-red-600 ml-0.5">*</span>}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {col.isPrimaryKey ? 'PK' : col.foreignKey ? 'FK' : col.type}
                        </span>
                      </label>

                      {col.foreignKey ? (
                        <select
                          id={`field-${col.name}`}
                          value={val}
                          onChange={(e) => {
                            setFormValues((prev) => ({ ...prev, [col.name]: e.target.value }));
                            setFormErrors((prev) => ({ ...prev, [col.name]: '' }));
                          }}
                          className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                            err
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20'
                          }`}
                        >
                          <option value="">Выберите значение...</option>
                          {db[col.foreignKey.table].map((refRow) => {
                            const refId = String(refRow[col.foreignKey!.column]);
                            const refLabel =
                              col.foreignKey!.table === 'pilot'
                                ? `${refRow.first_name} ${refRow.last_name}`
                                : String(refRow[col.foreignKey!.displayColumn] ?? refId);
                            return (
                              <option key={refId} value={refId}>
                                {refId} — {refLabel}
                              </option>
                            );
                          })}
                        </select>
                      ) : col.type === 'color' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={/^#[0-9A-Fa-f]{6}$/.test(val) ? val : '#1D4ED8'}
                            onChange={(e) =>
                              setFormValues((prev) => ({ ...prev, [col.name]: e.target.value.toUpperCase() }))
                            }
                            className="h-9 w-11 cursor-pointer rounded border border-slate-300 p-0.5"
                          />
                          <input
                            id={`field-${col.name}`}
                            type="text"
                            value={val}
                            onChange={(e) =>
                              setFormValues((prev) => ({ ...prev, [col.name]: e.target.value }))
                            }
                            placeholder="#DC2626"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                          />
                        </div>
                      ) : (
                        <input
                          id={`field-${col.name}`}
                          type={col.type === 'date' ? 'date' : col.type === 'integer' ? 'number' : 'text'}
                          value={val}
                          onChange={(e) => {
                            setFormValues((prev) => ({ ...prev, [col.name]: e.target.value }));
                            setFormErrors((prev) => ({ ...prev, [col.name]: '' }));
                          }}
                          placeholder={col.placeholder}
                          className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                            col.type === 'integer' ? 'font-mono tabular-nums' : ''
                          } ${
                            err
                              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/20'
                          }`}
                        />
                      )}

                      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
                >
                  {editingRow ? 'Сохранить изменения' : 'Добавить запись'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Удалить запись?
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Запись с ключом{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {schema.primaryKey} = {String(deleteTarget[schema.primaryKey])}
                </span>{' '}
                будет удалена из таблицы <span className="font-mono">{schema.name}</span>.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRow(activeTable, deleteTarget[schema.primaryKey] as string | number);
                  setDeleteTarget(null);
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
