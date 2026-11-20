import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  DatabaseState,
  DbRow,
  PROTOTYPE_SCENARIO_STEPS,
  ScreenId,
  TABLE_SCHEMAS,
  TableName,
} from './data/schema';
import { INITIAL_DATABASE } from './data/seedData';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewScreen } from './components/OverviewScreen';
import { TableViewerScreen } from './components/TableViewerScreen';
import { SqlConsoleScreen } from './components/SqlConsoleScreen';
import { ImportExportScreen } from './components/ImportExportScreen';
import { WireframesScreen } from './components/WireframesScreen';
import { DesignSystemScreen } from './components/DesignSystemScreen';

export default function App() {
  const [db, setDb] = useState<DatabaseState>(() => INITIAL_DATABASE);
  const [activeScreen, setActiveScreen] = useState<ScreenId>('overview');
  const [activeTable, setActiveTable] = useState<TableName>('pilot');
  const [wireframeMode, setWireframeMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Action triggers propagated from TopBar CTA to active screen
  const [createRecordTrigger, setCreateRecordTrigger] = useState(0);
  const [runSqlTrigger, setRunSqlTrigger] = useState(0);
  const [exportTrigger, setExportTrigger] = useState(0);

  // Interactive prototype guided scenario state
  const [scenarioStepIndex, setScenarioStepIndex] = useState<number | null>(null);

  const handleNavigate = (screen: ScreenId, table?: TableName) => {
    setActiveScreen(screen);
    if (table) {
      setActiveTable(table);
    }
  };

  const handleStartScenario = (startIndex = 0) => {
    const step = PROTOTYPE_SCENARIO_STEPS[startIndex];
    if (!step) return;
    setScenarioStepIndex(startIndex);
    handleNavigate(step.targetScreen, step.targetTable);
  };

  const handleScenarioStep = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= PROTOTYPE_SCENARIO_STEPS.length) {
      setScenarioStepIndex(null);
      return;
    }
    const step = PROTOTYPE_SCENARIO_STEPS[nextIdx];
    setScenarioStepIndex(nextIdx);
    handleNavigate(step.targetScreen, step.targetTable);
  };

  const handlePrimaryAction = () => {
    if (activeScreen === 'tables') {
      setCreateRecordTrigger((n) => n + 1);
    } else if (activeScreen === 'sql') {
      setRunSqlTrigger((n) => n + 1);
    } else if (activeScreen === 'import-export') {
      setExportTrigger((n) => n + 1);
    } else {
      handleStartScenario(0);
    }
  };

  const handleSaveRow = (
    table: TableName,
    row: DbRow,
    isEdit: boolean,
    originalPk?: string | number
  ): string | null => {
    const schema = TABLE_SCHEMAS[table];
    const pkCol = schema.primaryKey;
    const newPk = row[pkCol];

    const existing = db[table];
    const duplicate = existing.some((r) => {
      if (isEdit && String(r[pkCol]) === String(originalPk)) return false;
      return String(r[pkCol]) === String(newPk);
    });

    if (duplicate) {
      return `Запись с ключом ${pkCol} = ${String(newPk)} уже существует в таблице ${table}.`;
    }

    setDb((prev) => {
      const currentRows = prev[table];
      const nextRows = isEdit
        ? currentRows.map((r) => (String(r[pkCol]) === String(originalPk) ? row : r))
        : [...currentRows, row];
      return { ...prev, [table]: nextRows };
    });

    return null;
  };

  const handleDeleteRow = (table: TableName, pkValue: string | number) => {
    const pkCol = TABLE_SCHEMAS[table].primaryKey;
    setDb((prev) => ({
      ...prev,
      [table]: prev[table].filter((r) => String(r[pkCol]) !== String(pkValue)),
    }));
  };

  const handleImportRows = (
    table: TableName,
    incomingRows: DbRow[],
    mode: 'append' | 'replace'
  ) => {
    const pkCol = TABLE_SCHEMAS[table].primaryKey;
    setDb((prev) => {
      if (mode === 'replace') {
        return { ...prev, [table]: incomingRows };
      }
      // Upsert by primary key when appending so duplicate IDs cleanly update
      const merged = [...prev[table]];
      for (const row of incomingRows) {
        const idx = merged.findIndex((r) => String(r[pkCol]) === String(row[pkCol]));
        if (idx >= 0) {
          merged[idx] = row;
        } else {
          merged.push(row);
        }
      }
      return { ...prev, [table]: merged };
    });
  };

  const activeScenarioStep =
    scenarioStepIndex !== null ? PROTOTYPE_SCENARIO_STEPS[scenarioStepIndex] : null;

  return (
    <div
      className={`flex min-h-screen bg-slate-50 text-slate-900 ${
        wireframeMode ? 'wireframe-mode' : ''
      }`}
    >
      <Sidebar
        activeScreen={activeScreen}
        activeTable={activeTable}
        db={db}
        onNavigate={handleNavigate}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeScreen={activeScreen}
          activeTable={activeTable}
          wireframeMode={wireframeMode}
          onToggleWireframeMode={() => setWireframeMode((w) => !w)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onPrimaryAction={handlePrimaryAction}
        />

        {/* Interactive Prototype Guided Scenario Bar (appears only when user launches a scenario) */}
        {activeScenarioStep && scenarioStepIndex !== null && (
          <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 lg:px-6">
            <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-blue-800">
                  <span className="font-semibold">
                    Интерактивный сценарий ({scenarioStepIndex + 1} /{' '}
                    {PROTOTYPE_SCENARIO_STEPS.length})
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium">{activeScenarioStep.title}</span>
                </div>
                <p className="mt-0.5 text-xs text-blue-900/80">
                  {activeScenarioStep.actionHint}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={scenarioStepIndex <= 0}
                  onClick={() => handleScenarioStep(scenarioStepIndex - 1)}
                  className="inline-flex items-center gap-1 rounded border border-blue-300 bg-white px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() =>
                    scenarioStepIndex + 1 < PROTOTYPE_SCENARIO_STEPS.length
                      ? handleScenarioStep(scenarioStepIndex + 1)
                      : setScenarioStepIndex(null)
                  }
                  className="inline-flex items-center gap-1 rounded bg-blue-700 px-3 py-1 text-xs font-medium text-white hover:bg-blue-800"
                >
                  {scenarioStepIndex + 1 < PROTOTYPE_SCENARIO_STEPS.length
                    ? 'Следующий шаг'
                    : 'Завершить'}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setScenarioStepIndex(null)}
                  aria-label="Закрыть панель сценария"
                  className="rounded p-1 text-blue-700 hover:bg-blue-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Canvas */}
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-7">
          <div className="mx-auto max-w-[1360px]">
            {activeScreen === 'overview' && (
              <OverviewScreen
                db={db}
                onNavigate={handleNavigate}
                onStartScenario={handleStartScenario}
              />
            )}

            {activeScreen === 'tables' && (
              <TableViewerScreen
                db={db}
                activeTable={activeTable}
                onSelectTable={(t) => setActiveTable(t)}
                onSaveRow={handleSaveRow}
                onDeleteRow={handleDeleteRow}
                openCreateTrigger={createRecordTrigger}
              />
            )}

            {activeScreen === 'sql' && (
              <SqlConsoleScreen
                db={db}
                onUpdateDb={setDb}
                runTrigger={runSqlTrigger}
              />
            )}

            {activeScreen === 'import-export' && (
              <ImportExportScreen
                db={db}
                onImportRows={handleImportRows}
                exportTrigger={exportTrigger}
              />
            )}

            {activeScreen === 'wireframes' && (
              <WireframesScreen
                onNavigate={handleNavigate}
                wireframeMode={wireframeMode}
                onToggleWireframeMode={() => setWireframeMode((w) => !w)}
              />
            )}

            {activeScreen === 'design-system' && <DesignSystemScreen />}
          </div>
        </main>
      </div>
    </div>
  );
}
