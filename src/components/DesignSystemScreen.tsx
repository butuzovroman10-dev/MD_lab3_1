import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Search,
  X,
} from 'lucide-react';

interface ColorToken {
  name: string;
  role: string;
  hex: string;
  usage: string;
  contrast: string;
}

const COLOR_TOKENS: ColorToken[] = [
  { name: 'Canvas Neutral', role: '60% Фон', hex: '#F8FAFC', usage: 'Основное рабочее полотно', contrast: '16.5:1 с Ink' },
  { name: 'Surface White', role: '30% Поверхности', hex: '#FFFFFF', usage: 'Таблицы, панели, боковое меню, модальные окна', contrast: '17.4:1 с Ink' },
  { name: 'Hairline Border', role: '30% Разделители', hex: '#E2E8F0', usage: 'Контуры 1px, сетка таблиц, линии секций', contrast: 'Структурный' },
  { name: 'Slate Ink', role: 'Основной текст', hex: '#0F172A', usage: 'Заголовки, первичные ключи, активные данные', contrast: 'AAA 17.4:1' },
  { name: 'Muted Slate', role: 'Вторичный текст', hex: '#475569', usage: 'Подписи полей, метаданные, описания', contrast: 'AA 7.5:1' },
  { name: 'Racing Cobalt', role: '10% Акцент', hex: '#1D4ED8', usage: 'Основные CTA, активные вкладки, фокус и FK', contrast: 'AA 6.7:1 на белом' },
  { name: 'Semantic Success', role: 'Статус: Успешно', hex: '#16A34A', usage: 'Подтверждение SQL и импорта (+ иконка и текст)', contrast: 'AA с текстом' },
  { name: 'Semantic Warning', role: 'Статус: Внимание', hex: '#D97706', usage: 'Предупреждения ссылочной целостности FK', contrast: 'AA с текстом' },
  { name: 'Semantic Danger', role: 'Статус: Ошибка', hex: '#DC2626', usage: 'Ошибки синтаксиса, валидации и удаление', contrast: 'AA 4.8:1' },
];

export function DesignSystemScreen() {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [sampleInput, setSampleInput] = useState('Autodromo Nazionale Monza');

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1400);
    } catch {
      // Clipboard unavailable in restricted context
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Дизайн-система приложения
        </h1>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">
          Единая система цветовых токенов (пропорция 60–30–10), типографическая иерархия и
          библиотека интерактивных компонентов, применённая на всех экранах RaceDB Studio.
        </p>
      </div>

      {/* 6.1 Color Palette */}
      <section
        data-surface="panel"
        className="rounded-lg border border-slate-200 bg-white overflow-hidden"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            01. Цветовая палитра и контрастность
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Нейтральная техническая основа с акцентным синим и семантическими статусами (WCAG AA)
          </p>
        </div>

        <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 lg:grid-cols-3 sm:divide-y-0 sm:gap-px sm:bg-slate-200">
          {COLOR_TOKENS.map((token) => (
            <div key={token.hex} className="bg-white p-4 flex flex-col justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className="h-11 w-11 rounded-md border border-slate-300 shrink-0"
                  style={{ backgroundColor: token.hex }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{token.name}</p>
                    <button
                      type="button"
                      onClick={() => handleCopyHex(token.hex)}
                      className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 hover:text-blue-700 shrink-0"
                    >
                      <span>{copiedHex === token.hex ? 'Скопировано' : token.hex}</span>
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {token.role} · {token.contrast}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600">{token.usage}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6.2 Typography Scale */}
      <section
        data-surface="panel"
        className="rounded-lg border border-slate-200 bg-white overflow-hidden"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            02. Типографика и шрифтовая шкала (2 + 1)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manrope для заголовков и навигации · Public Sans для интерфейсного текста · JetBrains
            Mono с tabular-nums для SQL и чисел
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-12 md:items-baseline">
            <div className="md:col-span-3 font-mono text-xs text-slate-500">
              Display H1 · Manrope 700 · 24px
            </div>
            <div className="md:col-span-9 font-display text-2xl font-bold tracking-tight text-slate-900">
              Обзор реляционной базы данных автоспорта
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-12 md:items-baseline">
            <div className="md:col-span-3 font-mono text-xs text-slate-500">
              Section H2 · Manrope 600 · 16px
            </div>
            <div className="md:col-span-9 font-display text-base font-semibold text-slate-900">
              Результаты выполнения SQL-запроса и экспорт таблиц
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-12 md:items-baseline">
            <div className="md:col-span-3 font-mono text-xs text-slate-500">
              Body UI · Public Sans 400 · 14px
            </div>
            <div className="md:col-span-9 text-sm text-slate-700 leading-relaxed max-w-2xl">
              Табличные формы обеспечивают фильтрацию по внешним ключам, сортировку столбцов и
              контроль ссылочной целостности при добавлении новых записей.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-12 md:items-baseline">
            <div className="md:col-span-3 font-mono text-xs text-slate-500">
              Data & SQL · JetBrains Mono · 12–13px
            </div>
            <div className="md:col-span-9 font-mono text-xs tabular-nums text-slate-900">
              SELECT id_pilot, lap_time FROM session_result ORDER BY position ASC; — 1:19.442 / 5793 м
            </div>
          </div>
        </div>
      </section>

      {/* 6.3 Interactive Component Kit */}
      <section
        data-surface="panel"
        className="rounded-lg border border-slate-200 bg-white overflow-hidden"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            03. Библиотека компонентов интерфейса
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Кнопки, поля ввода, табличные строки, уведомления и модальное окно в едином стиле
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {/* Buttons */}
          <div className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-600">Кнопки действий</h3>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 transition-colors"
              >
                Основная (Primary)
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
              >
                Контрастная (Dark)
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Вторичная (Secondary)
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                Удаление (Danger)
              </button>
              <button
                type="button"
                disabled
                className="rounded-md border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-400 cursor-not-allowed"
              >
                Неактивная (Disabled)
              </button>
              <button
                type="button"
                onClick={() => setDemoModalOpen(true)}
                className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-800 hover:bg-blue-100 transition-colors"
              >
                Открыть пример модального окна
              </button>
            </div>
          </div>

          {/* Form inputs */}
          <div className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-600">Поля ввода и состояния валидации</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="ds-input-normal" className="block text-xs font-medium text-slate-700 mb-1">
                  Текстовое поле
                </label>
                <input
                  id="ds-input-normal"
                  type="text"
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div>
                <label htmlFor="ds-input-search" className="block text-xs font-medium text-slate-700 mb-1">
                  Поле поиска
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="ds-input-search"
                    type="text"
                    placeholder="Поиск по таблице..."
                    className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ds-input-error" className="block text-xs font-medium text-slate-700 mb-1">
                  Состояние ошибки
                </label>
                <input
                  id="ds-input-error"
                  type="text"
                  defaultValue="abc"
                  className="w-full rounded-md border border-red-400 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <p className="mt-1 text-xs text-red-600">
                  Поле length должно содержать целое число (в метрах)
                </p>
              </div>
            </div>
          </div>

          {/* Semantic Statuses (never hue-only) */}
          <div className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-600">
              Семантические уведомления (цвет + иконка + текст)
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="flex items-start gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Операция выполнена</p>
                  <p className="mt-0.5 text-emerald-800">Импортировано 6 записей в таблицу track.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Предупреждение ключа</p>
                  <p className="mt-0.5 text-amber-800">Внешний ключ id_team = 9 отсутствует в team.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Ошибка SQL-синтаксиса</p>
                  <p className="mt-0.5 text-red-800">Не указан блок FROM в запросе SELECT.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Table Specimen */}
          <div className="p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-600">Образец табличного компонента</h3>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                    <th className="px-4 py-2 text-right">id_track</th>
                    <th className="px-4 py-2">name</th>
                    <th className="px-4 py-2">country</th>
                    <th className="px-4 py-2 text-right">length (м)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums">1</td>
                    <td className="px-4 py-2 text-slate-900">Autodromo Nazionale Monza</td>
                    <td className="px-4 py-2 text-slate-600">Италия</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">5793</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums">2</td>
                    <td className="px-4 py-2 text-slate-900">Circuit de Spa-Francorchamps</td>
                    <td className="px-4 py-2 text-slate-600">Бельгия</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">7004</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Modal */}
      {demoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Компонент модального окна
              </h3>
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                aria-label="Закрыть"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 text-sm text-slate-600 leading-relaxed">
              Единый паттерн модального диалога используется для создания и редактирования
              записей таблиц, а также подтверждения необратимых операций удаления.
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                className="rounded-md bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
