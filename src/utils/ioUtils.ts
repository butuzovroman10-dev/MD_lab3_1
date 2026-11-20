import { DatabaseState, DbRow, TABLE_SCHEMAS, TableName } from '../data/schema';

export type ExportFormat = 'csv' | 'json';

export interface ParsedImportPreview {
  rows: DbRow[];
  errors: string[];
  warnings: string[];
}

export function rowsToCsv(columns: string[], rows: DbRow[], delimiter: ',' | ';' = ',', includeHeaders = true): string {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines: string[] = [];
  if (includeHeaders) {
    lines.push(columns.map(escapeCell).join(delimiter));
  }
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(row[c])).join(delimiter));
  }
  return lines.join('\n');
}

export function rowsToJson(rows: DbRow[], pretty = true): string {
  return JSON.stringify(rows, null, pretty ? 2 : 0);
}

function parseCsvLine(line: string, delimiter: ',' | ';'): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseAndValidateImport(
  content: string,
  format: ExportFormat,
  table: TableName,
  db: DatabaseState,
  delimiter: ',' | ';' = ','
): ParsedImportPreview {
  const schema = TABLE_SCHEMAS[table];
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedRows: DbRow[] = [];

  if (!content.trim()) {
    return { rows: [], errors: ['Файл или текстовая область не содержит данных.'], warnings: [] };
  }

  let rawObjects: Record<string, unknown>[] = [];

  if (format === 'json') {
    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        return {
          rows: [],
          errors: ['JSON должен содержать массив объектов (например: [{"id_track": 7, ...}]).'],
          warnings: [],
        };
      }
      rawObjects = parsed;
    } catch (e) {
      return {
        rows: [],
        errors: [`Ошибка разбора JSON: ${e instanceof Error ? e.message : 'некорректный синтаксис'}.`],
        warnings: [],
      };
    }
  } else {
    const lines = content
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return {
        rows: [],
        errors: ['CSV-файл должен содержать строку заголовков и минимум одну строку данных.'],
        warnings: [],
      };
    }

    const headers = parseCsvLine(lines[0], delimiter).map((h) => h.toLowerCase());
    const requiredCols = schema.columns.filter((c) => c.isRequired).map((c) => c.name);
    const missingCols = requiredCols.filter((c) => !headers.includes(c));
    if (missingCols.length > 0) {
      return {
        rows: [],
        errors: [
          `Отсутствуют обязательные столбцы для таблицы «${table}»: ${missingCols.join(', ')}. Проверьте разделитель («${delimiter}»).`,
        ],
        warnings: [],
      };
    }

    for (let i = 1; i < lines.length; i++) {
      const vals = parseCsvLine(lines[i], delimiter);
      if (vals.length !== headers.length) {
        errors.push(`Строка ${i + 1}: ожидалось ${headers.length} значений, получено ${vals.length}.`);
        continue;
      }
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        obj[h] = vals[idx];
      });
      rawObjects.push(obj);
    }
  }

  // Validate each object against schema types & FK constraints
  rawObjects.forEach((raw, idx) => {
    const rowNum = idx + 1;
    const cleanRow: DbRow = {};
    let rowValid = true;

    for (const col of schema.columns) {
      const val = raw[col.name];
      if (val === undefined || val === null || String(val).trim() === '') {
        if (col.isRequired) {
          errors.push(`Запись #${rowNum}: не заполнено обязательное поле «${col.name}».`);
          rowValid = false;
        } else {
          cleanRow[col.name] = null;
        }
        continue;
      }

      if (col.type === 'integer') {
        const num = Number(val);
        if (Number.isNaN(num) || !Number.isInteger(num)) {
          errors.push(`Запись #${rowNum}: поле «${col.name}» должно быть целым числом (получено «${String(val)}»).`);
          rowValid = false;
          continue;
        }
        cleanRow[col.name] = num;
      } else {
        cleanRow[col.name] = String(val).trim();
      }

      if (col.foreignKey && cleanRow[col.name] !== null) {
        const refRows = db[col.foreignKey.table];
        const exists = refRows.some(
          (r) => String(r[col.foreignKey!.column]) === String(cleanRow[col.name])
        );
        if (!exists) {
          warnings.push(
            `Запись #${rowNum}: внешний ключ ${col.name} = ${cleanRow[col.name]} отсутствует в таблице «${col.foreignKey.table}».`
          );
        }
      }
    }

    if (rowValid) {
      parsedRows.push(cleanRow);
    }
  });

  return { rows: parsedRows, errors, warnings };
}

export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateSamplePayload(table: TableName, format: ExportFormat, delimiter: ',' | ';' = ','): string {
  const samples: Record<TableName, DbRow[]> = {
    track: [
      { id_track: 7, name: 'Circuit of the Americas', country: 'США', length: 5513 },
      { id_track: 8, name: 'Circuit de Barcelona-Catalunya', country: 'Испания', length: 4657 },
    ],
    team: [
      { id_team: 7, name: 'Williams Racing', country: 'Великобритания', colour: '#2563EB' },
      { id_team: 8, name: 'Alpine Endurance', country: 'Франция', colour: '#0284C7' },
    ],
    pilot: [
      { id_pilot: 13, first_name: 'Карлос', last_name: 'Сайнс', birth_date: '1994-09-01', number: 55, nationality: 'Испания', id_team: 1 },
      { id_pilot: 14, first_name: 'Алекс', last_name: 'Албон', birth_date: '1996-03-23', number: 23, nationality: 'Таиланд', id_team: 4 },
    ],
    season: [
      { year_start: 2027, year_end: 2027, status: 'Запланирован', sponsor: 'Global Chrono' },
    ],
    championship: [
      { id_championship: 4, name: 'Formula 2 Championship', country: 'Международный', year_start: 2026 },
    ],
    stage: [
      { id_stage: 7, name: 'Гран-при Бельгии', number: 6, id_championship: 1, id_track: 2 },
    ],
    session: [
      { id_session: 9, type: 'Практика 2', duration: 60, date: '2026-09-04', id_stage: 5 },
    ],
    session_result: [
      { id_result: 17, position: 4, lap_time: '1:19.780', id_session: 7, id_pilot: 7, id_team: 4 },
    ],
  };

  const rows = samples[table];
  if (format === 'json') {
    return rowsToJson(rows, true);
  }
  const cols = TABLE_SCHEMAS[table].columns.map((c) => c.name);
  return rowsToCsv(cols, rows, delimiter, true);
}
