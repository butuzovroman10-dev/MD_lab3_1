import React, { useState } from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { ScreenId, TableName } from '../data/schema';

interface WireframesScreenProps {
  onNavigate: (screen: ScreenId, table?: TableName) => void;
  wireframeMode: boolean;
  onToggleWireframeMode: () => void;
}

type WireframeId = 'overview' | 'table-view' | 'record-form' | 'sql-console' | 'import-export';

interface WireframeSpec {
  id: WireframeId;
  index: string;
  title: string;
  category: string;
  targetScreen: ScreenId;
  targetTable?: TableName;
  elements: string[];
  transitions: string[];
}

const WIREFRAMES: WireframeSpec[] = [
  {
    id: 'overview',
    index: '01',
    title: 'Главный экран (Обзор БД и ER-схема)',
    category: 'Главный экран',
    targetScreen: 'overview',
    elements: [
      'Левое меню навигации (разделы + список 8 таблиц)',
      'Верхняя панель: хлебные крошки + кнопка запуска сценария',
      'Полоса ключевых счётчиков (таблицы, записи, связи, экраны)',
      'Центральный блок: интерактивная ER-диаграмма сущностей',
      'Нижняя сетка: справочник таблиц и список сценариев прототипа',
    ],
    transitions: [
      'Клик по узлу ER-схемы → Экран просмотра выбранной таблицы',
      'Выбор пункта в боковом меню → Переход к любому экрану',
    ],
  },
  {
    id: 'table-view',
    index: '02',
    title: 'Форма просмотра данных таблицы',
    category: 'Просмотр данных',
    targetScreen: 'tables',
    targetTable: 'pilot',
    elements: [
      'Вкладки быстрого переключения между 8 таблицами',
      'Панель инструментов: поле поиска, фильтр по столбцу, кнопка «Новая запись»',
      'Табличная сетка с сортировкой по заголовкам и ссылками FK',
      'Кнопки редактирования и удаления в каждой строке',
      'Панель пагинации с подсчётом отображаемых записей',
    ],
    transitions: [
      'Кнопка «Новая запись» / иконка правки → Модальная форма ввода данных',
      'Клик по внешнему ключу (FK) → Переход в связанную таблицу',
    ],
  },
  {
    id: 'record-form',
    index: '03',
    title: 'Форма ввода и редактирования записи',
    category: 'Ввод данных',
    targetScreen: 'tables',
    targetTable: 'pilot',
    elements: [
      'Модальное окно поверх таблицы с заголовком операции и закрытием',
      'Двухколоночная сетка полей с пометкой PK / FK / тип данных',
      'Выпадающие списки для внешних ключей с подстановкой названий',
      'Строчная валидация обязательных и числовых полей',
      'Панель действий: «Отмена» и основная кнопка «Сохранить»',
    ],
    transitions: [
      'Успешное сохранение → Обновление таблицы и закрытие модального окна',
      'Нажатие «Отмена» / Esc → Возврат к форме просмотра данных',
    ],
  },
  {
    id: 'sql-console',
    index: '04',
    title: 'Форма выполнения SQL-запросов',
    category: 'Служебный экран',
    targetScreen: 'sql',
    elements: [
      'Текстовый редактор SQL с кнопками «Выполнить», «Форматировать», «Очистить»',
      'Лента шаблонов готовых запросов (JOIN, GROUP BY, фильтры, DML)',
      'Область вывода результатов: время выполнения, таблица, ошибки',
      'Правая панель: схема таблиц (клик для вставки) и история запросов',
      'Кнопки экспорта результата выборки в CSV / JSON',
    ],
    transitions: [
      'Выполнение INSERT/UPDATE/DELETE → Обновление состояния всех таблиц БД',
      'Экспорт результата → Скачивание файла CSV / JSON',
    ],
  },
  {
    id: 'import-export',
    index: '05',
    title: 'Интерфейс импорта и экспорта (CSV / JSON)',
    category: 'Служебный экран',
    targetScreen: 'import-export',
    elements: [
      'Блок импорта: выбор формата (CSV/JSON), целевой таблицы и режима записи',
      'Зона перетаскивания файла, выбор файла и кнопка тестового примера',
      'Блок диагностики: ошибки валидации и предупреждения по FK',
      'Блок экспорта: настройки разделителя/отступов, предпросмотр и скачивание',
      'Нижняя таблица: журнал статусов операций (Успешно / Предупреждение / Ошибка)',
    ],
    transitions: [
      'Успешный импорт → Пополнение таблицы БД и запись в журнал статусов',
      'Переход в боковом меню к таблице → Проверка импортированных строк',
    ],
  },
];

function WireframeSchematic({ id }: { id: WireframeId }) {
  // Clean, pure low-fidelity structural blueprint (grayscale, dashed containers, labeled regions)
  return (
    <div className="rounded-md border border-slate-300 bg-slate-100 p-4 font-mono text-[11px] text-slate-700 select-none">
      {/* Common Shell: Sidebar + Main Canvas */}
      <div className="grid grid-cols-12 gap-3 min-h-[340px]">
        {/* Left Navigation Wireframe */}
        <div className="col-span-3 flex flex-col justify-between rounded border border-dashed border-slate-400 bg-white p-2.5">
          <div className="space-y-2.5">
            <div className="border border-slate-400 bg-slate-200 px-2 py-1.5 font-semibold text-slate-900">
              [ЛОГОТИП]
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-slate-500">НАВИГАЦИЯ</div>
              <div className={`border px-2 py-1 ${id === 'overview' ? 'border-slate-900 bg-slate-200 font-semibold' : 'border-slate-300'}`}>
                Обзор / ER
              </div>
              <div className={`border px-2 py-1 ${id === 'table-view' || id === 'record-form' ? 'border-slate-900 bg-slate-200 font-semibold' : 'border-slate-300'}`}>
                Таблицы БД
              </div>
              <div className={`border px-2 py-1 ${id === 'sql-console' ? 'border-slate-900 bg-slate-200 font-semibold' : 'border-slate-300'}`}>
                SQL-запросы
              </div>
              <div className={`border px-2 py-1 ${id === 'import-export' ? 'border-slate-900 bg-slate-200 font-semibold' : 'border-slate-300'}`}>
                Импорт / Экспорт
              </div>
            </div>
            <div className="space-y-1 pt-1 border-t border-dashed border-slate-300">
              <div className="text-[10px] text-slate-500">ТАБЛИЦЫ (8)</div>
              <div className="text-[10px] text-slate-600 leading-tight">
                season · championship<br />
                stage · track · session<br />
                pilot · team · result
              </div>
            </div>
          </div>
          <div className="border-t border-dashed border-slate-300 pt-1.5 text-[10px] text-slate-500">
            Итого записей
          </div>
        </div>

        {/* Right Main Viewport Wireframe */}
        <div className="col-span-9 flex flex-col gap-2.5">
          {/* Top Bar */}
          <div className="flex items-center justify-between rounded border border-dashed border-slate-400 bg-white px-3 py-2">
            <span className="text-slate-600">БД / Текущий экран</span>
            <div className="flex items-center gap-1.5">
              <span className="border border-slate-400 px-2 py-0.5 text-[10px]">[Каркас/UI]</span>
              <span className="border border-slate-900 bg-slate-800 px-2 py-0.5 text-[10px] text-white">
                [Осн. кнопка]
              </span>
            </div>
          </div>

          {/* Screen-specific interior layout */}
          {id === 'overview' && (
            <div className="flex-1 space-y-2.5">
              <div className="grid grid-cols-4 gap-2">
                {['Таблиц: 8', 'Записей: N', 'Связей: 8', 'Экранов: 6'].map((kpi) => (
                  <div key={kpi} className="rounded border border-slate-300 bg-white p-2 text-center">
                    {kpi}
                  </div>
                ))}
              </div>
              <div className="rounded border border-dashed border-slate-400 bg-white p-4 text-center">
                <div className="font-semibold text-slate-800 mb-2">[ИНТЕРАКТИВНАЯ ER-ДИАГРАММА]</div>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div className="border border-slate-400 p-1.5">session</div>
                  <div className="border border-slate-400 p-1.5">stage</div>
                  <div className="border border-slate-400 p-1.5">championship</div>
                  <div className="border border-slate-400 p-1.5">season</div>
                  <div className="border border-slate-400 p-1.5">session_result</div>
                  <div className="border border-slate-400 p-1.5">pilot</div>
                  <div className="border border-slate-400 p-1.5">team</div>
                  <div className="border border-slate-400 p-1.5">track</div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-7 rounded border border-slate-300 bg-white p-2.5">
                  [Справочник таблиц: имя / PK / строки]
                </div>
                <div className="col-span-5 rounded border border-slate-300 bg-white p-2.5">
                  [Сценарии прототипа 01..05]
                </div>
              </div>
            </div>
          )}

          {id === 'table-view' && (
            <div className="flex-1 space-y-2.5">
              <div className="flex gap-1.5 overflow-hidden text-[10px]">
                {['season', 'championship', 'track', 'stage', 'pilot*', 'team'].map((t) => (
                  <span
                    key={t}
                    className={`border px-2 py-1 ${
                      t.endsWith('*') ? 'border-slate-900 bg-slate-200 font-semibold' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {t.replace('*', '')}
                  </span>
                ))}
              </div>
              <div className="rounded border border-slate-400 bg-white p-2.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 border border-slate-300 px-2 py-1 text-slate-400">
                    [Поле поиска...]
                  </div>
                  <div className="border border-slate-300 px-2 py-1">[Фильтр ▾]</div>
                  <div className="border border-slate-900 bg-slate-200 px-2 py-1">[+ Запись]</div>
                </div>
                <div className="border border-slate-300">
                  <div className="grid grid-cols-5 border-b border-slate-300 bg-slate-100 p-1.5 font-semibold">
                    <span>id_pilot ↕</span>
                    <span>first_name ↕</span>
                    <span>last_name ↕</span>
                    <span>id_team (FK)</span>
                    <span className="text-right">Действия</span>
                  </div>
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="grid grid-cols-5 border-b last:border-b-0 border-slate-200 p-1.5 text-slate-500">
                      <span>0{n}</span>
                      <span>[Текст]</span>
                      <span>[Текст]</span>
                      <span className="underline">FK → team</span>
                      <span className="text-right">[✎] [✕]</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Строки 1–10 из N</span>
                  <span>[Назад] 1 / 2 [Вперёд]</span>
                </div>
              </div>
            </div>
          )}

          {id === 'record-form' && (
            <div className="flex-1 relative rounded border border-dashed border-slate-400 bg-slate-200/70 p-4 flex items-center justify-center">
              <div className="w-full max-w-md rounded border-2 border-slate-800 bg-white p-3.5 space-y-3">
                <div className="flex justify-between border-b border-slate-300 pb-2 font-semibold">
                  <span>[МОДАЛЬНОЕ ОКНО: НОВАЯ ЗАПИСЬ]</span>
                  <span>[✕]</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-[10px]">
                  <div className="space-y-1">
                    <div>id_pilot (PK)*</div>
                    <div className="border border-slate-400 px-2 py-1.5 bg-slate-50">[Числовое поле]</div>
                  </div>
                  <div className="space-y-1">
                    <div>id_team (FK)*</div>
                    <div className="border border-slate-400 px-2 py-1.5 bg-slate-50">[Список команд ▾]</div>
                  </div>
                  <div className="space-y-1">
                    <div>first_name*</div>
                    <div className="border border-slate-400 px-2 py-1.5">[Текстовое поле]</div>
                  </div>
                  <div className="space-y-1">
                    <div>last_name*</div>
                    <div className="border border-slate-400 px-2 py-1.5">[Текстовое поле]</div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-300 pt-2.5">
                  <span className="border border-slate-400 px-3 py-1">[Отмена]</span>
                  <span className="border border-slate-900 bg-slate-800 px-3 py-1 text-white">[Сохранить]</span>
                </div>
              </div>
            </div>
          )}

          {id === 'sql-console' && (
            <div className="flex-1 grid grid-cols-12 gap-2.5">
              <div className="col-span-8 flex flex-col gap-2.5">
                <div className="rounded border border-slate-400 bg-white p-2.5 space-y-2">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span>[Редактор SQL]</span>
                    <div className="flex gap-1">
                      <span className="border border-slate-300 px-1.5">[Очистить]</span>
                      <span className="border border-slate-900 bg-slate-800 px-2 text-white">[Выполнить]</span>
                    </div>
                  </div>
                  <div className="h-20 border border-dashed border-slate-400 bg-slate-100 p-2 text-slate-600">
                    SELECT p.last_name, t.name FROM pilot p<br />
                    INNER JOIN team t ON p.id_team = t.id_team;
                  </div>
                  <div className="text-[10px] text-slate-500">Шаблоны: [JOIN] [GROUP BY] [INSERT]</div>
                </div>
                <div className="flex-1 rounded border border-slate-400 bg-white p-2.5 space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="font-semibold">[ТАБЛИЦА РЕЗУЛЬТАТОВ]</span>
                    <span>[CSV] [JSON]</span>
                  </div>
                  <div className="border border-slate-300 p-2 text-slate-500">
                    Строки выборки / Панель диагностики ошибок
                  </div>
                </div>
              </div>
              <div className="col-span-4 flex flex-col gap-2">
                <div className="flex-1 rounded border border-dashed border-slate-400 bg-white p-2">
                  [Схема таблиц для вставки]
                </div>
                <div className="rounded border border-dashed border-slate-400 bg-white p-2">
                  [История запросов]
                </div>
              </div>
            </div>
          )}

          {id === 'import-export' && (
            <div className="flex-1 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded border border-slate-400 bg-white p-2.5 space-y-2">
                  <div className="font-semibold">[БЛОК ИМПОРТА]</div>
                  <div className="grid grid-cols-2 gap-1.5 text-center text-[10px]">
                    <div className="border border-slate-900 bg-slate-200 py-1">[CSV]</div>
                    <div className="border border-slate-300 py-1">[JSON]</div>
                  </div>
                  <div className="border border-dashed border-slate-400 bg-slate-50 p-3 text-center">
                    [Зона загрузки файла + кнопка выбора]
                  </div>
                  <div className="border border-slate-300 p-1.5 text-[10px]">
                    [Статус валидации / ошибки]
                  </div>
                </div>
                <div className="rounded border border-slate-400 bg-white p-2.5 space-y-2">
                  <div className="font-semibold">[БЛОК ЭКСПОРТА]</div>
                  <div className="border border-slate-300 px-2 py-1 text-[10px]">[Выбор таблицы ▾]</div>
                  <div className="h-20 border border-dashed border-slate-400 bg-slate-100 p-2 text-[10px]">
                    [Предпросмотр CSV / JSON]
                  </div>
                  <div className="text-right">
                    <span className="border border-slate-900 bg-slate-800 px-2 py-1 text-white text-[10px]">
                      [Скачать файл]
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded border border-slate-400 bg-white p-2.5 text-[10px]">
                [ЖУРНАЛ СТАТУСОВ: Время | Операция | Формат | Успешно / Ошибка | Сообщение]
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WireframesScreen({
  onNavigate,
  wireframeMode,
  onToggleWireframeMode,
}: WireframesScreenProps) {
  const [selectedId, setSelectedId] = useState<WireframeId>('overview');
  const activeSpec = WIREFRAMES.find((w) => w.id === selectedId) || WIREFRAMES[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Wireframes и архитектура переходов
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Упрощённые структурные каркасы основных экранов без визуального оформления и карта
            навигации интерактивного прототипа.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleWireframeMode}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          {wireframeMode
            ? 'Вернуть чистовой UI всего приложения'
            : 'Включить глобальный режим Wireframe'}
        </button>
      </div>

      {/* Screen selector tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {WIREFRAMES.map((wf) => {
          const isActive = wf.id === selectedId;
          return (
            <button
              key={wf.id}
              type="button"
              onClick={() => setSelectedId(wf.id)}
              className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {wf.index}. {wf.category}
            </button>
          );
        })}
      </div>

      {/* Main wireframe canvas + specification */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 items-start">
        <div
          data-surface="panel"
          className="xl:col-span-8 rounded-lg border border-slate-200 bg-white overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                {activeSpec.index}. {activeSpec.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Схематичное расположение таблиц, полей ввода, кнопок и навигации
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(activeSpec.targetScreen, activeSpec.targetTable)}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
            >
              Открыть живой экран
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-5">
            <WireframeSchematic id={activeSpec.id} />
          </div>
        </div>

        {/* Spec details */}
        <div
          data-surface="panel"
          className="xl:col-span-4 rounded-lg border border-slate-200 bg-white divide-y divide-slate-200"
        >
          <div className="p-5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Ключевые элементы на каркасе
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-700">
              {activeSpec.elements.map((el, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-mono text-slate-400 shrink-0">
                    {String(i + 1).padStart(2, '0')}.
                  </span>
                  <span className="leading-relaxed">{el}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Интерактивные переходы
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-700">
              {activeSpec.transitions.map((tr, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowRight className="h-3.5 w-3.5 text-blue-700 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{tr}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Interactive Prototype Flow Map (Section 2.2 & 7.1) */}
      <div
        data-surface="panel"
        className="rounded-lg border border-slate-200 bg-white p-5 space-y-4"
      >
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Карта навигации прототипа
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Нажмите на любой узел схемы переходов, чтобы сразу перейти к соответствующему экрану
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {[
            { screen: 'overview' as ScreenId, num: '01', title: 'Обзор и ER-схема', note: 'Точка входа и карта БД' },
            { screen: 'tables' as ScreenId, num: '02', title: 'Просмотр таблиц', note: 'Фильтры, CRUD и FK' },
            { screen: 'sql' as ScreenId, num: '03', title: 'SQL-консоль', note: 'Запросы и аналитика' },
            { screen: 'import-export' as ScreenId, num: '04', title: 'Импорт / Экспорт', note: 'CSV и JSON обмен' },
            { screen: 'design-system' as ScreenId, num: '05', title: 'Дизайн-система', note: 'Токены и компоненты' },
          ].map((node) => (
            <button
              key={node.screen}
              type="button"
              onClick={() => onNavigate(node.screen)}
              className="group flex flex-col justify-between rounded-md border border-slate-200 bg-slate-50/70 p-4 text-left hover:border-blue-600 hover:bg-blue-50/40 transition-colors"
            >
              <div>
                <span className="font-mono text-xs text-slate-400">{node.num}</span>
                <p className="mt-1 font-display text-sm font-semibold text-slate-900 group-hover:text-blue-800">
                  {node.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">{node.note}</p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                Перейти <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
