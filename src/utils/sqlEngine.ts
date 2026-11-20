import { DatabaseState, DbRow, TABLE_SCHEMAS, TableName } from '../data/schema';

export interface SqlExecutionResult {
  success: boolean;
  columns: string[];
  rows: Record<string, string | number | null>[];
  affectedRows: number;
  executionMs: number;
  message: string;
  error?: string;
  updatedDb?: DatabaseState;
}

export interface SqlPreset {
  id: string;
  title: string;
  category: string;
  sql: string;
}

export const SQL_PRESETS: SqlPreset[] = [
  {
    id: 'podiums',
    title: 'Результаты сессий с пилотами и командами (JOIN)',
    category: 'JOIN',
    sql: `SELECT sr.position, p.first_name, p.last_name, t.name AS team_name, sr.lap_time, s.type AS session_type, s.date
FROM session_result sr
INNER JOIN pilot p ON sr.id_pilot = p.id_pilot
INNER JOIN team t ON sr.id_team = t.id_team
INNER JOIN session s ON sr.id_session = s.id_session
WHERE sr.position <= 3
ORDER BY s.date ASC, sr.position ASC;`,
  },
  {
    id: 'stages-tracks',
    title: 'Календарь этапов с трассами и длиной круга',
    category: 'JOIN',
    sql: `SELECT st.number AS stage_no, st.name AS stage_name, tr.name AS track_name, tr.country, tr.length, c.name AS championship
FROM stage st
INNER JOIN track tr ON st.id_track = tr.id_track
INNER JOIN championship c ON st.id_championship = c.id_championship
ORDER BY st.number ASC;`,
  },
  {
    id: 'team-counts',
    title: 'Количество подиумов по командам (GROUP BY)',
    category: 'Агрегация',
    sql: `SELECT t.name AS team_name, t.country, COUNT(sr.id_result) AS podium_count
FROM session_result sr
INNER JOIN team t ON sr.id_team = t.id_team
WHERE sr.position <= 3
GROUP BY t.name, t.country
ORDER BY podium_count DESC;`,
  },
  {
    id: 'tracks-long',
    title: 'Трассы длиннее 5500 метров',
    category: 'Фильтрация',
    sql: `SELECT id_track, name, country, length
FROM track
WHERE length > 5500
ORDER BY length DESC;`,
  },
  {
    id: 'insert-track',
    title: 'Добавление новой трассы (INSERT)',
    category: 'DML',
    sql: `INSERT INTO track (id_track, name, country, length)
VALUES (7, 'Autódromo José Carlos Pace', 'Бразилия', 4309);`,
  },
];

function stripCommentsAndSemicolon(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
    .replace(/;+$/, '')
    .trim();
}

function splitTopLevel(input: string, delimiter = ','): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inQuote: "'" | '"' | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuote) {
      current += ch;
      if (ch === inQuote && input[i - 1] !== '\\') {
        inQuote = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      inQuote = ch;
      current += ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);

    if (depth === 0 && ch === delimiter) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseLiteral(raw: string): string | number | null {
  const trimmed = raw.trim();
  if (/^null$/i.test(trimmed)) return null;
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function getColumnValue(
  combinedRow: Record<string, string | number | null>,
  expr: string
): string | number | null {
  const key = expr.trim();
  if (key in combinedRow) return combinedRow[key];
  // Check unqualified column name match
  const lower = key.toLowerCase();
  for (const k of Object.keys(combinedRow)) {
    const kLower = k.toLowerCase();
    if (kLower === lower || kLower.endsWith(`.${lower}`)) {
      return combinedRow[k];
    }
  }
  return null;
}

function evaluateSingleCondition(
  row: Record<string, string | number | null>,
  cond: string
): boolean {
  const trimmed = cond.trim().replace(/^\((.*)\)$/, '$1').trim();
  // IS NULL / IS NOT NULL
  const isNullMatch = trimmed.match(/^([a-zA-Z0-9_.]+)\s+IS\s+(NOT\s+)?NULL$/i);
  if (isNullMatch) {
    const val = getColumnValue(row, isNullMatch[1]);
    return isNullMatch[2] ? val !== null && val !== undefined : val === null || val === undefined;
  }

  // LIKE
  const likeMatch = trimmed.match(/^([a-zA-Z0-9_.]+)\s+(NOT\s+)?LIKE\s+('[^']*'|"[^"]*")$/i);
  if (likeMatch) {
    const leftVal = String(getColumnValue(row, likeMatch[1]) ?? '').toLowerCase();
    const pattern = String(parseLiteral(likeMatch[3])).toLowerCase();
    const regexStr = '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$';
    const matched = new RegExp(regexStr).test(leftVal);
    return likeMatch[2] ? !matched : matched;
  }

  // Comparison operators: >=, <=, !=, <>, =, >, <
  const cmpMatch = trimmed.match(/^([a-zA-Z0-9_.]+)\s*(>=|<=|!=|<>|=|>|<)\s*(.+)$/);
  if (!cmpMatch) {
    throw new Error(`Некорректное условие в WHERE: «${trimmed}»`);
  }

  const leftVal = getColumnValue(row, cmpMatch[1]);
  const op = cmpMatch[2];
  const rightRaw = cmpMatch[3].trim();
  const isQuotedOrNum =
    /^['"]/.test(rightRaw) || /^-?\d+(\.\d+)?$/.test(rightRaw) || /^null$/i.test(rightRaw);
  const rightVal = isQuotedOrNum ? parseLiteral(rightRaw) : getColumnValue(row, rightRaw);

  if (leftVal === null || rightVal === null) {
    if (op === '=') return leftVal === rightVal;
    if (op === '!=' || op === '<>') return leftVal !== rightVal;
    return false;
  }

  const leftNum = Number(leftVal);
  const rightNum = Number(rightVal);
  const bothNumeric = !Number.isNaN(leftNum) && !Number.isNaN(rightNum) && leftVal !== '' && rightVal !== '';

  const a = bothNumeric ? leftNum : String(leftVal).toLowerCase();
  const b = bothNumeric ? rightNum : String(rightVal).toLowerCase();

  switch (op) {
    case '=':
      return a === b;
    case '!=':
    case '<>':
      return a !== b;
    case '>':
      return a > b;
    case '<':
      return a < b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    default:
      return false;
  }
}

function evaluateWhere(row: Record<string, string | number | null>, whereClause: string): boolean {
  // Split by OR at top level, then AND
  const orBranches = whereClause.split(/\s+OR\s+/i);
  return orBranches.some((branch) => {
    const andConditions = branch.split(/\s+AND\s+/i);
    return andConditions.every((cond) => evaluateSingleCondition(row, cond));
  });
}

function resolveTable(name: string, db: DatabaseState): { table: TableName; rows: DbRow[] } {
  const clean = name.trim().replace(/^["`]|["`]$/g, '').toLowerCase() as TableName;
  if (!(clean in db)) {
    throw new Error(
      `Таблица «${name}» не найдена. Доступные таблицы: ${Object.keys(TABLE_SCHEMAS).join(', ')}.`
    );
  }
  return { table: clean, rows: db[clean] };
}

function prefixRow(row: DbRow, alias: string, table: TableName): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const [k, v] of Object.entries(row)) {
    out[`${alias}.${k}`] = v;
    if (alias !== table) {
      out[`${table}.${k}`] = v;
    }
  }
  return out;
}

export function executeSql(rawSql: string, db: DatabaseState): SqlExecutionResult {
  const started = performance.now();
  const sql = stripCommentsAndSemicolon(rawSql);

  if (!sql) {
    return {
      success: false,
      columns: [],
      rows: [],
      affectedRows: 0,
      executionMs: 0,
      message: '',
      error: 'Введите SQL-запрос перед выполнением.',
    };
  }

  try {
    const upper = sql.toUpperCase();

    // 1. INSERT INTO
    if (upper.startsWith('INSERT')) {
      const m = sql.match(/^INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i);
      if (!m) {
        throw new Error(
          'Синтаксическая ошибка в INSERT. Пример: INSERT INTO track (id_track, name, country, length) VALUES (7, \'Interlagos\', \'Бразилия\', 4309);'
        );
      }
      const { table, rows } = resolveTable(m[1], db);
      const schema = TABLE_SCHEMAS[table];
      const cols = splitTopLevel(m[2]).map((c) => c.trim().toLowerCase());
      const vals = splitTopLevel(m[3]).map(parseLiteral);

      if (cols.length !== vals.length) {
        throw new Error(`Количество столбцов (${cols.length}) не совпадает с количеством значений (${vals.length}).`);
      }

      const newRow: DbRow = {};
      for (const colDef of schema.columns) {
        newRow[colDef.name] = null;
      }
      cols.forEach((col, idx) => {
        const colDef = schema.columns.find((c) => c.name === col);
        if (!colDef) {
          throw new Error(`Столбец «${col}» не существует в таблице ${table}.`);
        }
        newRow[col] = vals[idx];
      });

      const pkVal = newRow[schema.primaryKey];
      if (pkVal === null || pkVal === undefined || pkVal === '') {
        throw new Error(`Не указан первичный ключ «${schema.primaryKey}».`);
      }
      if (rows.some((r) => String(r[schema.primaryKey]) === String(pkVal))) {
        throw new Error(`Нарушение уникальности первичного ключа: ${schema.primaryKey} = ${pkVal} уже существует.`);
      }

      const updatedDb: DatabaseState = {
        ...db,
        [table]: [...rows, newRow],
      };

      const ms = Number((performance.now() - started).toFixed(2));
      return {
        success: true,
        columns: schema.columns.map((c) => c.name),
        rows: [newRow],
        affectedRows: 1,
        executionMs: ms,
        message: `Запись успешно добавлена в таблицу «${table}» (${schema.primaryKey} = ${pkVal}).`,
        updatedDb,
      };
    }

    // 2. UPDATE
    if (upper.startsWith('UPDATE')) {
      const m = sql.match(/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i);
      if (!m) {
        throw new Error('Синтаксическая ошибка в UPDATE. Пример: UPDATE season SET status = \'Завершён\' WHERE year_start = 2026;');
      }
      const { table, rows } = resolveTable(m[1], db);
      const schema = TABLE_SCHEMAS[table];
      const assignments = splitTopLevel(m[2]).map((part) => {
        const eqIdx = part.indexOf('=');
        if (eqIdx === -1) throw new Error(`Некорректное присваивание в SET: «${part}»`);
        const col = part.slice(0, eqIdx).trim().toLowerCase();
        if (!schema.columns.some((c) => c.name === col)) {
          throw new Error(`Столбец «${col}» не существует в таблице ${table}.`);
        }
        return { col, val: parseLiteral(part.slice(eqIdx + 1)) };
      });
      const whereClause = m[3]?.trim();

      let affected = 0;
      const updatedRows = rows.map((row) => {
        const combined = prefixRow(row, table, table);
        if (!whereClause || evaluateWhere(combined, whereClause)) {
          affected++;
          const copy = { ...row };
          for (const { col, val } of assignments) {
            copy[col] = val;
          }
          return copy;
        }
        return row;
      });

      const updatedDb: DatabaseState = { ...db, [table]: updatedRows };
      const ms = Number((performance.now() - started).toFixed(2));
      return {
        success: true,
        columns: schema.columns.map((c) => c.name),
        rows: updatedRows,
        affectedRows: affected,
        executionMs: ms,
        message: `Обновлено записей в таблице «${table}»: ${affected}.`,
        updatedDb,
      };
    }

    // 3. DELETE FROM
    if (upper.startsWith('DELETE')) {
      const m = sql.match(/^DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([\s\S]+))?$/i);
      if (!m) {
        throw new Error('Синтаксическая ошибка в DELETE. Пример: DELETE FROM track WHERE id_track = 7;');
      }
      const { table, rows } = resolveTable(m[1], db);
      const whereClause = m[2]?.trim();

      const remaining: DbRow[] = [];
      let deleted = 0;
      for (const row of rows) {
        const combined = prefixRow(row, table, table);
        if (!whereClause || evaluateWhere(combined, whereClause)) {
          deleted++;
        } else {
          remaining.push(row);
        }
      }

      const updatedDb: DatabaseState = { ...db, [table]: remaining };
      const ms = Number((performance.now() - started).toFixed(2));
      return {
        success: true,
        columns: TABLE_SCHEMAS[table].columns.map((c) => c.name),
        rows: remaining,
        affectedRows: deleted,
        executionMs: ms,
        message: `Удалено записей из таблицы «${table}»: ${deleted}.`,
        updatedDb,
      };
    }

    // 4. SELECT
    if (!upper.startsWith('SELECT')) {
      throw new Error('Поддерживаются команды SELECT, INSERT INTO, UPDATE и DELETE FROM.');
    }

    // Extract major clauses via clean regex scanning
    const selectMatch = sql.match(/^SELECT\s+(DISTINCT\s+)?([\s\S]+?)\s+FROM\s+([\s\S]+)$/i);
    if (!selectMatch) {
      throw new Error('Синтаксическая ошибка в SELECT. Убедитесь, что указан блок FROM <таблица>.');
    }

    const isDistinct = Boolean(selectMatch[1]);
    const selectListRaw = selectMatch[2].trim();
    let rest = selectMatch[3].trim();

    let limitCount: number | null = null;
    const limitMatch = rest.match(/\s+LIMIT\s+(\d+)\s*$/i);
    if (limitMatch) {
      limitCount = Number(limitMatch[1]);
      rest = rest.slice(0, limitMatch.index).trim();
    }

    let orderByRaw = '';
    const orderMatch = rest.match(/\s+ORDER\s+BY\s+([\s\S]+)$/i);
    if (orderMatch) {
      orderByRaw = orderMatch[1].trim();
      rest = rest.slice(0, orderMatch.index).trim();
    }

    let groupByRaw = '';
    const groupMatch = rest.match(/\s+GROUP\s+BY\s+([\s\S]+)$/i);
    if (groupMatch) {
      groupByRaw = groupMatch[1].trim();
      rest = rest.slice(0, groupMatch.index).trim();
    }

    let whereClause = '';
    const whereMatch = rest.match(/\s+WHERE\s+([\s\S]+)$/i);
    if (whereMatch) {
      whereClause = whereMatch[1].trim();
      rest = rest.slice(0, whereMatch.index).trim();
    }

    // Parse FROM and JOINs
    const joinRegex = /\b(INNER\s+JOIN|LEFT\s+JOIN|LEFT\s+OUTER\s+JOIN|JOIN)\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?\s+ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)/gi;
    const firstJoinIdx = rest.search(/\b(INNER\s+JOIN|LEFT\s+JOIN|LEFT\s+OUTER\s+JOIN|JOIN)\b/i);
    const baseFromRaw = firstJoinIdx === -1 ? rest : rest.slice(0, firstJoinIdx).trim();
    const joinsRaw = firstJoinIdx === -1 ? '' : rest.slice(firstJoinIdx).trim();

    const baseMatch = baseFromRaw.match(/^([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?$/i);
    if (!baseMatch) {
      throw new Error(`Некорректное указание таблицы в FROM: «${baseFromRaw}»`);
    }

    const baseTableInfo = resolveTable(baseMatch[1], db);
    const baseAlias = (baseMatch[2] || baseTableInfo.table).toLowerCase();
    const participatingTables: { table: TableName; alias: string }[] = [
      { table: baseTableInfo.table, alias: baseAlias },
    ];

    let workingRows: Record<string, string | number | null>[] = baseTableInfo.rows.map((r) =>
      prefixRow(r, baseAlias, baseTableInfo.table)
    );

    if (joinsRaw) {
      let match: RegExpExecArray | null;
      while ((match = joinRegex.exec(joinsRaw)) !== null) {
        const joinType = match[1].toUpperCase();
        const joinTableInfo = resolveTable(match[2], db);
        const joinAlias = (match[3] || joinTableInfo.table).toLowerCase();
        const leftKey = match[4];
        const rightKey = match[5];

        participatingTables.push({ table: joinTableInfo.table, alias: joinAlias });
        const nextWorking: Record<string, string | number | null>[] = [];

        for (const wRow of workingRows) {
          let matchedAny = false;
          for (const jRow of joinTableInfo.rows) {
            const merged = { ...wRow, ...prefixRow(jRow, joinAlias, joinTableInfo.table) };
            const lv = getColumnValue(merged, leftKey);
            const rv = getColumnValue(merged, rightKey);
            if (lv !== null && rv !== null && String(lv) === String(rv)) {
              nextWorking.push(merged);
              matchedAny = true;
            }
          }
          if (!matchedAny && joinType.startsWith('LEFT')) {
            const nullFill: Record<string, string | number | null> = { ...wRow };
            for (const c of TABLE_SCHEMAS[joinTableInfo.table].columns) {
              nullFill[`${joinAlias}.${c.name}`] = null;
            }
            nextWorking.push(nullFill);
          }
        }
        workingRows = nextWorking;
      }
    }

    // Apply WHERE
    if (whereClause) {
      workingRows = workingRows.filter((row) => evaluateWhere(row, whereClause));
    }

    // Parse SELECT projections
    const rawExprs = splitTopLevel(selectListRaw);
    interface Projection {
      raw: string;
      expr: string;
      alias: string;
      agg?: { fn: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'; arg: string };
    }

    const projections: Projection[] = [];
    let hasAggregate = false;

    for (const item of rawExprs) {
      if (item === '*') {
        for (const pt of participatingTables) {
          for (const col of TABLE_SCHEMAS[pt.table].columns) {
            const colName = participatingTables.length > 1 ? `${pt.alias}.${col.name}` : col.name;
            projections.push({ raw: item, expr: `${pt.alias}.${col.name}`, alias: colName });
          }
        }
        continue;
      }

      const aliasMatch = item.match(/^([\s\S]+?)\s+AS\s+([a-zA-Z0-9_]+)$/i);
      const expr = aliasMatch ? aliasMatch[1].trim() : item.trim();
      const aggMatch = expr.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)$/i);

      if (aggMatch) {
        hasAggregate = true;
        const fn = aggMatch[1].toUpperCase() as 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
        const arg = aggMatch[2].trim();
        const alias = aliasMatch ? aliasMatch[2] : `${fn.toLowerCase()}_${arg === '*' ? 'all' : arg.replace(/\./g, '_')}`;
        projections.push({ raw: item, expr, alias, agg: { fn, arg } });
      } else {
        const defaultAlias = expr.includes('.') ? expr.split('.').pop()! : expr;
        projections.push({ raw: item, expr, alias: aliasMatch ? aliasMatch[2] : defaultAlias });
      }
    }

    // Grouping / Aggregation or simple projection
    let projectedRows: Record<string, string | number | null>[] = [];

    if (groupByRaw || hasAggregate) {
      const groupCols = groupByRaw ? splitTopLevel(groupByRaw) : [];
      const groups = new Map<string, Record<string, string | number | null>[]>();

      for (const row of workingRows) {
        const key = groupCols.length
          ? groupCols.map((gc) => String(getColumnValue(row, gc) ?? '')).join('||')
          : '__ALL__';
        const list = groups.get(key) || [];
        list.push(row);
        groups.set(key, list);
      }

      if (groups.size === 0 && groupCols.length === 0) {
        groups.set('__ALL__', []);
      }

      for (const groupRows of groups.values()) {
        const outRow: Record<string, string | number | null> = {};
        for (const p of projections) {
          if (p.agg) {
            const { fn, arg } = p.agg;
            if (fn === 'COUNT') {
              outRow[p.alias] =
                arg === '*'
                  ? groupRows.length
                  : groupRows.filter((r) => getColumnValue(r, arg) !== null).length;
            } else {
              const nums = groupRows
                .map((r) => Number(getColumnValue(r, arg)))
                .filter((n) => !Number.isNaN(n));
              if (nums.length === 0) {
                outRow[p.alias] = null;
              } else if (fn === 'SUM') {
                outRow[p.alias] = Number(nums.reduce((a, b) => a + b, 0).toFixed(2));
              } else if (fn === 'AVG') {
                outRow[p.alias] = Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
              } else if (fn === 'MIN') {
                outRow[p.alias] = Math.min(...nums);
              } else if (fn === 'MAX') {
                outRow[p.alias] = Math.max(...nums);
              }
            }
          } else {
            outRow[p.alias] = groupRows.length > 0 ? getColumnValue(groupRows[0], p.expr) : null;
          }
        }
        projectedRows.push(outRow);
      }
    } else {
      projectedRows = workingRows.map((row) => {
        const outRow: Record<string, string | number | null> = {};
        for (const p of projections) {
          outRow[p.alias] = getColumnValue(row, p.expr);
        }
        return outRow;
      });
    }

    // Apply DISTINCT
    if (isDistinct) {
      const seen = new Set<string>();
      projectedRows = projectedRows.filter((row) => {
        const sig = JSON.stringify(row);
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
    }

    // Apply ORDER BY
    if (orderByRaw) {
      const orderSpecs = splitTopLevel(orderByRaw).map((spec) => {
        const parts = spec.trim().split(/\s+/);
        const col = parts[0];
        const dir = parts[1]?.toUpperCase() === 'DESC' ? -1 : 1;
        return { col, dir };
      });

      // Keep original combined rows aligned if ordering by non-aliased column
      const indexed = projectedRows.map((row, idx) => ({
        row,
        raw: workingRows[idx] || row,
      }));

      indexed.sort((a, b) => {
        for (const { col, dir } of orderSpecs) {
          const av = col in a.row ? a.row[col] : getColumnValue(a.raw, col);
          const bv = col in b.row ? b.row[col] : getColumnValue(b.raw, col);
          if (av === bv) continue;
          if (av === null || av === undefined) return 1 * dir;
          if (bv === null || bv === undefined) return -1 * dir;
          const an = Number(av);
          const bn = Number(bv);
          if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') {
            if (an !== bn) return (an > bn ? 1 : -1) * dir;
          } else {
            const cmp = String(av).localeCompare(String(bv), 'ru');
            if (cmp !== 0) return cmp * dir;
          }
        }
        return 0;
      });
      projectedRows = indexed.map((i) => i.row);
    }

    // Apply LIMIT
    if (limitCount !== null) {
      projectedRows = projectedRows.slice(0, limitCount);
    }

    const columns = projections.map((p) => p.alias);
    const ms = Number((performance.now() - started).toFixed(2));
    return {
      success: true,
      columns,
      rows: projectedRows,
      affectedRows: projectedRows.length,
      executionMs: ms,
      message: `Запрос выполнен успешно. Найдено строк: ${projectedRows.length}.`,
    };
  } catch (err) {
    const ms = Number((performance.now() - started).toFixed(2));
    return {
      success: false,
      columns: [],
      rows: [],
      affectedRows: 0,
      executionMs: ms,
      message: '',
      error: err instanceof Error ? err.message : 'Неизвестная ошибка выполнения SQL-запроса.',
    };
  }
}

export function formatSql(rawSql: string): string {
  const cleaned = rawSql.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .replace(/\s+(FROM|INNER JOIN|LEFT JOIN|JOIN|WHERE|GROUP BY|ORDER BY|LIMIT|SET|VALUES)\b/gi, '\n$1')
    .replace(/\s+(AND|OR)\b/gi, '\n  $1');
}
