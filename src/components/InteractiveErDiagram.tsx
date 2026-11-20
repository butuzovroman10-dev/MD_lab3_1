import React, { useState } from 'react';
import { DatabaseState, ER_RELATIONS, TABLE_ORDER, TABLE_SCHEMAS, TableName } from '../data/schema';

interface InteractiveErDiagramProps {
  db: DatabaseState;
  onSelectTable: (table: TableName) => void;
}

const NODE_WIDTH = 196;
const HEADER_HEIGHT = 28;
const ROW_HEIGHT = 20;

function getNodeHeight(table: TableName): number {
  return HEADER_HEIGHT + TABLE_SCHEMAS[table].columns.length * ROW_HEIGHT + 8;
}

function getColumnAnchor(
  table: TableName,
  columnName: string,
  side: 'left' | 'right'
): { x: number; y: number } {
  const schema = TABLE_SCHEMAS[table];
  const colIdx = Math.max(
    0,
    schema.columns.findIndex((c) => c.name === columnName)
  );
  const x = side === 'left' ? schema.erPos.x : schema.erPos.x + NODE_WIDTH;
  const y = schema.erPos.y + HEADER_HEIGHT + colIdx * ROW_HEIGHT + ROW_HEIGHT / 2 + 2;
  return { x, y };
}

export function InteractiveErDiagram({ db, onSelectTable }: InteractiveErDiagramProps) {
  const [hoveredTable, setHoveredTable] = useState<TableName | null>(null);
  const [viewMode, setViewMode] = useState<'interactive' | 'source'>('interactive');
  const [sourceImgFailed, setSourceImgFailed] = useState(false);

  return (
    <div data-surface="panel" className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            ER-диаграмма базы данных
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Нажмите на любую из 8 таблиц, чтобы перейти к просмотру и редактированию её записей
          </p>
        </div>

        {/* Interactive segmented control */}
        <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setViewMode('interactive')}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              viewMode === 'interactive'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Интерактивная схема
          </button>
          <button
            type="button"
            onClick={() => setViewMode('source')}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
              viewMode === 'source'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Исходный макет ER
          </button>
        </div>
      </div>

      {viewMode === 'source' ? (
        <div className="p-5 bg-slate-900 flex flex-col items-center justify-center rounded-b-lg">
          {!sourceImgFailed ? (
            <img
              src="/assets/aistudio/image_4a3384f0.png"
              alt="Исходная ER-диаграмма реляционной базы данных чемпионатов автоспорта"
              referrerPolicy="no-referrer"
              onError={() => setSourceImgFailed(true)}
              className="max-h-[460px] w-auto rounded border border-slate-700 object-contain"
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center rounded border border-slate-700 text-sm text-slate-300">
              Исходное изображение ER-диаграммы недоступно — переключитесь на интерактивную схему.
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto p-4 bg-slate-50/70 rounded-b-lg">
          <svg
            viewBox="0 0 1050 535"
            className="w-full min-w-[820px] h-auto select-none"
            role="img"
            aria-label="Интерактивная ER-диаграмма из 8 таблиц"
          >
            {/* Subtle structural grid */}
            <defs>
              <pattern id="er-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="0.6"
                />
              </pattern>
            </defs>
            <rect width="1050" height="535" fill="url(#er-grid)" rx="6" />

            {/* Relationship connectors */}
            {ER_RELATIONS.map((rel) => {
              const fromPos = TABLE_SCHEMAS[rel.fromTable].erPos;
              const toPos = TABLE_SCHEMAS[rel.toTable].erPos;
              const isToRight = toPos.x > fromPos.x;
              const isSameCol = Math.abs(toPos.x - fromPos.x) < 40;

              let pathD = '';
              let startPt: { x: number; y: number };
              let endPt: { x: number; y: number };

              if (isSameCol) {
                // Vertical connector (e.g. session_result -> session)
                startPt = {
                  x: fromPos.x + NODE_WIDTH / 2,
                  y: fromPos.y,
                };
                endPt = {
                  x: toPos.x + NODE_WIDTH / 2,
                  y: toPos.y + getNodeHeight(rel.toTable),
                };
                const midY = (startPt.y + endPt.y) / 2;
                pathD = `M ${startPt.x} ${startPt.y} L ${startPt.x} ${midY} L ${endPt.x} ${midY} L ${endPt.x} ${endPt.y}`;
              } else if (rel.fromTable === 'session_result' && rel.toTable === 'team') {
                // Route cleanly below pilot to team
                startPt = getColumnAnchor(rel.fromTable, rel.fromColumn, 'right');
                endPt = getColumnAnchor(rel.toTable, rel.toColumn, 'left');
                const routeY = 514;
                pathD = `M ${startPt.x} ${startPt.y} L ${startPt.x + 18} ${startPt.y} L ${startPt.x + 18} ${routeY} L ${endPt.x - 24} ${routeY} L ${endPt.x - 24} ${endPt.y} L ${endPt.x} ${endPt.y}`;
              } else {
                startPt = getColumnAnchor(rel.fromTable, rel.fromColumn, isToRight ? 'right' : 'left');
                endPt = getColumnAnchor(rel.toTable, rel.toColumn, isToRight ? 'left' : 'right');
                const midX = (startPt.x + endPt.x) / 2;
                pathD = `M ${startPt.x} ${startPt.y} L ${midX} ${startPt.y} L ${midX} ${endPt.y} L ${endPt.x} ${endPt.y}`;
              }

              const isHighlighted =
                hoveredTable === rel.fromTable || hoveredTable === rel.toTable;

              return (
                <g key={`${rel.fromTable}.${rel.fromColumn}-${rel.toTable}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isHighlighted ? '#1d4ed8' : '#94a3b8'}
                    strokeWidth={isHighlighted ? 2 : 1.25}
                    strokeDasharray={isHighlighted ? undefined : '4 3'}
                  />
                  <circle
                    cx={startPt.x}
                    cy={startPt.y}
                    r={3.5}
                    fill={isHighlighted ? '#1d4ed8' : '#64748b'}
                  />
                  <circle
                    cx={endPt.x}
                    cy={endPt.y}
                    r={3.5}
                    fill="#ffffff"
                    stroke={isHighlighted ? '#1d4ed8' : '#64748b'}
                    strokeWidth={1.5}
                  />
                </g>
              );
            })}

            {/* Table entities */}
            {TABLE_ORDER.map((tableName) => {
              const schema = TABLE_SCHEMAS[tableName];
              const h = getNodeHeight(tableName);
              const isHovered = hoveredTable === tableName;
              const rowCount = db[tableName].length;

              return (
                <g
                  key={tableName}
                  transform={`translate(${schema.erPos.x}, ${schema.erPos.y})`}
                  onClick={() => onSelectTable(tableName)}
                  onMouseEnter={() => setHoveredTable(tableName)}
                  onMouseLeave={() => setHoveredTable(null)}
                  className="cursor-pointer"
                >
                  {/* Container */}
                  <rect
                    width={NODE_WIDTH}
                    height={h}
                    rx="6"
                    fill="#ffffff"
                    stroke={isHovered ? '#1d4ed8' : '#cbd5e1'}
                    strokeWidth={isHovered ? 2 : 1.2}
                  />

                  {/* Table header */}
                  <path
                    d={`M 0 6 Q 0 0 6 0 L ${NODE_WIDTH - 6} 0 Q ${NODE_WIDTH} 0 ${NODE_WIDTH} 6 L ${NODE_WIDTH} ${HEADER_HEIGHT} L 0 ${HEADER_HEIGHT} Z`}
                    fill={isHovered ? '#1d4ed8' : '#0f172a'}
                  />
                  <text
                    x="10"
                    y="18"
                    fill="#ffffff"
                    fontSize="11.5"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {schema.name}
                  </text>
                  <text
                    x={NODE_WIDTH - 10}
                    y="18"
                    textAnchor="end"
                    fill="#cbd5e1"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {rowCount}
                  </text>

                  {/* Columns */}
                  {schema.columns.map((col, idx) => {
                    const cy = HEADER_HEIGHT + idx * ROW_HEIGHT + 15;
                    const typeTag = col.type === 'integer' ? '123' : 'A-Z';
                    return (
                      <g key={col.name}>
                        {idx > 0 && col.isPrimaryKey === undefined && idx === 1 && (
                          <line
                            x1="0"
                            y1={HEADER_HEIGHT + ROW_HEIGHT + 3}
                            x2={NODE_WIDTH}
                            y2={HEADER_HEIGHT + ROW_HEIGHT + 3}
                            stroke="#e2e8f0"
                            strokeWidth="1"
                          />
                        )}
                        <text
                          x="10"
                          y={cy}
                          fill={col.isPrimaryKey ? '#1d4ed8' : col.foreignKey ? '#0369a1' : '#64748b'}
                          fontSize="9.5"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight={col.isPrimaryKey ? '600' : '400'}
                        >
                          {typeTag}
                        </text>
                        <text
                          x="36"
                          y={cy}
                          fill="#0f172a"
                          fontSize="11"
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight={col.isPrimaryKey ? '600' : '400'}
                        >
                          {col.name}
                        </text>
                        {(col.isPrimaryKey || col.foreignKey) && (
                          <text
                            x={NODE_WIDTH - 10}
                            y={cy}
                            textAnchor="end"
                            fill={col.isPrimaryKey ? '#1d4ed8' : '#64748b'}
                            fontSize="9.5"
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="600"
                          >
                            {col.isPrimaryKey ? 'PK' : 'FK'}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
