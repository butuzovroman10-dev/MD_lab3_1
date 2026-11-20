export type TableName =
  | 'season'
  | 'championship'
  | 'stage'
  | 'track'
  | 'session'
  | 'session_result'
  | 'pilot'
  | 'team';

export type ColumnType = 'integer' | 'text' | 'date' | 'color';

export interface ColumnDef {
  name: string;
  label: string;
  type: ColumnType;
  isPrimaryKey?: boolean;
  isRequired?: boolean;
  foreignKey?: {
    table: TableName;
    column: string;
    displayColumn: string;
  };
  placeholder?: string;
}

export interface TableSchema {
  name: TableName;
  title: string;
  description: string;
  primaryKey: string;
  columns: ColumnDef[];
  /** Coordinates for the interactive ER canvas (viewBox 0 0 1040 560) */
  erPos: { x: number; y: number };
}

export interface RelationDef {
  fromTable: TableName;
  fromColumn: string;
  toTable: TableName;
  toColumn: string;
  label: string;
}

export type DbRow = Record<string, string | number | null>;
export type DatabaseState = Record<TableName, DbRow[]>;

export const TABLE_SCHEMAS: Record<TableName, TableSchema> = {
  season: {
    name: 'season',
    title: 'Сезоны',
    description: 'Годовые сезоны соревнований, статус проведения и генеральный спонсор.',
    primaryKey: 'year_start',
    erPos: { x: 820, y: 24 },
    columns: [
      { name: 'year_start', label: 'Год начала', type: 'integer', isPrimaryKey: true, isRequired: true, placeholder: '2026' },
      { name: 'year_end', label: 'Год окончания', type: 'integer', isRequired: true, placeholder: '2026' },
      { name: 'status', label: 'Статус', type: 'text', isRequired: true, placeholder: 'Активный' },
      { name: 'sponsor', label: 'Спонсор', type: 'text', isRequired: true, placeholder: 'Apex Motorsport Group' },
    ],
  },
  championship: {
    name: 'championship',
    title: 'Чемпионаты',
    description: 'Гоночные серии и чемпионаты, привязанные к сезонам.',
    primaryKey: 'id_championship',
    erPos: { x: 560, y: 24 },
    columns: [
      { name: 'id_championship', label: 'ID чемпионата', type: 'integer', isPrimaryKey: true, isRequired: true, placeholder: '1' },
      { name: 'name', label: 'Название', type: 'text', isRequired: true, placeholder: 'Formula Grand Prix' },
      { name: 'country', label: 'Страна / Регион', type: 'text', isRequired: true, placeholder: 'Международный' },
      {
        name: 'year_start',
        label: 'Сезон (year_start)',
        type: 'integer',
        isRequired: true,
        foreignKey: { table: 'season', column: 'year_start', displayColumn: 'sponsor' },
      },
    ],
  },
  track: {
    name: 'track',
    title: 'Трассы',
    description: 'Автодромы, страны расположения и протяжённость круга в метрах.',
    primaryKey: 'id_track',
    erPos: { x: 560, y: 206 },
    columns: [
      { name: 'id_track', label: 'ID трассы', type: 'integer', isPrimaryKey: true, isRequired: true, placeholder: '1' },
      { name: 'name', label: 'Название трассы', type: 'text', isRequired: true, placeholder: 'Autodromo Nazionale Monza' },
      { name: 'country', label: 'Страна', type: 'text', isRequired: true, placeholder: 'Италия' },
      { name: 'length', label: 'Длина (м)', type: 'integer', isRequired: true, placeholder: '5793' },
    ],
  },
  stage: {
    name: 'stage',
    title: 'Этапы',
    description: 'Этапы (Гран-при) чемпионатов с порядковым номером и назначенной трассой.',
    primaryKey: 'id_stage',
    erPos: { x: 300, y: 84 },
    columns: [
      { name: 'id_stage', label: 'ID этапа', type: 'integer', isPrimaryKey: true, isRequired: true, placeholder: '1' },
      { name: 'name', label: 'Название этапа', type: 'text', isRequired: true, placeholder: 'Гран-при Италии' },
      { name: 'number', label: 'Номер этапа', type: 'integer', isRequired: true, placeholder: '1' },
      {
        name: 'id_championship',
        label: 'Чемпионат',
        type: 'integer',
        isRequired: true,
        foreignKey: { table: 'championship', column: 'id_championship', displayColumn: 'name' },
      },
      {
        name: 'id_track',
        label: 'Трасса',
        type: 'integer',
        isRequired: true,
        foreignKey: { table: 'track', column: 'id_track', displayColumn: 'name' },
      },
    ],
  },
  session: {
    name: 'session',
    title: 'Сессии',
    description: 'Заезды в рамках этапа: практики, квалификация, спринт и основная гонка.',
    primaryKey: 'id_session',
    erPos: { x: 40, y: 120 },
    columns: [
      { name: 'id_session', label: 'ID сессии', type: 'integer', isPrimaryKey: true, isRequired: true, placeholder: '1' },
      { name: 'type', label: 'Тип сессии', type: 'text', isRequired: true, placeholder: 'Гонка' },
      { name: 'duration', label: 'Длительность (мин)', type: 'integer', isRequired: true, placeholder: '90' },
      { name: 'date', label: 'Дата', type: 'date', isRequired: true, placeholder: '2025-05-18' },
      {
        name: 'id_stage',
        label: 'Этап',
        type: 'integer',
        isRequired: true,
        foreignKey: { table: 'stage', column: 'id_stage', displayColumn: 'name' },
      },
    ],
  },
  team: {
    name: 'team',
    title: 'Команды',
    description: 'Конструкторы и гоночные коллективы с фирменным цветом ливреи.',
    primaryKey: 'id_team',
    erPos: { x: 560, y: 378 },
    columns: [
      { name: 'id_team', label: 'ID команды', type: 'integer', isPrimaryKey: true, isRequired: true, placeholder: '1' },
      { name: 'name', label: 'Название команды', type: 'text', isRequired: true, placeholder: 'Scuderia Rossa' },
      { name: 'country', label: 'Страна', type: 'text', isRequired: true, placeholder: 'Италия' },
      { name: 'colour', label: 'Цвет', type: 'color', isRequired: true, placeholder: '#DC2626' },
    ],
  },
  pilot: {
    name: 'pilot',
    title: 'Пилоты',
    description: 'Участники заездов, стартовые номера, гражданство и текущая команда.',
    primaryKey: 'id_pilot',
    erPos: { x: 300, y: 314 },
    columns: [
      { name: 'id_pilot', label: 'ID пилота', type: 'integer', isPrimaryKey: true, isRequired: true, placeholder: '1' },
      { name: 'first_name', label: 'Имя', type: 'text', isRequired: true, placeholder: 'Максим' },
      { name: 'last_name', label: 'Фамилия', type: 'text', isRequired: true, placeholder: 'Волков' },
      { name: 'birth_date', label: 'Дата рождения', type: 'date', isRequired: true, placeholder: '1998-04-12' },
      { name: 'number', label: 'Номер', type: 'integer', isRequired: true, placeholder: '14' },
      { name: 'nationality', label: 'Гражданство', type: 'text', isRequired: true, placeholder: 'Россия' },
      {
        name: 'id_team',
        label: 'Команда',
        type: 'integer',
        isRequired: true,
        foreignKey: { table: 'team', column: 'id_team', displayColumn: 'name' },
      },
    ],
  },
  session_result: {
    name: 'session_result',
    title: 'Результаты сессий',
    description: 'Итоговые позиции и лучшее время круга пилотов в конкретных сессиях.',
    primaryKey: 'id_result',
    erPos: { x: 40, y: 334 },
    columns: [
      { name: 'id_result', label: 'ID результата', type: 'integer', isPrimaryKey: true, isRequired: true, placeholder: '1' },
      { name: 'position', label: 'Позиция', type: 'integer', isRequired: true, placeholder: '1' },
      { name: 'lap_time', label: 'Время круга', type: 'text', isRequired: true, placeholder: '1:19.420' },
      {
        name: 'id_session',
        label: 'Сессия',
        type: 'integer',
        isRequired: true,
        foreignKey: { table: 'session', column: 'id_session', displayColumn: 'type' },
      },
      {
        name: 'id_pilot',
        label: 'Пилот',
        type: 'integer',
        isRequired: true,
        foreignKey: { table: 'pilot', column: 'id_pilot', displayColumn: 'last_name' },
      },
      {
        name: 'id_team',
        label: 'Команда',
        type: 'integer',
        isRequired: true,
        foreignKey: { table: 'team', column: 'id_team', displayColumn: 'name' },
      },
    ],
  },
};

export const TABLE_ORDER: TableName[] = [
  'season',
  'championship',
  'track',
  'stage',
  'session',
  'team',
  'pilot',
  'session_result',
];

export const ER_RELATIONS: RelationDef[] = [
  { fromTable: 'championship', fromColumn: 'year_start', toTable: 'season', toColumn: 'year_start', label: 'N:1' },
  { fromTable: 'stage', fromColumn: 'id_championship', toTable: 'championship', toColumn: 'id_championship', label: 'N:1' },
  { fromTable: 'stage', fromColumn: 'id_track', toTable: 'track', toColumn: 'id_track', label: 'N:1' },
  { fromTable: 'session', fromColumn: 'id_stage', toTable: 'stage', toColumn: 'id_stage', label: 'N:1' },
  { fromTable: 'pilot', fromColumn: 'id_team', toTable: 'team', toColumn: 'id_team', label: 'N:1' },
  { fromTable: 'session_result', fromColumn: 'id_session', toTable: 'session', toColumn: 'id_session', label: 'N:1' },
  { fromTable: 'session_result', fromColumn: 'id_pilot', toTable: 'pilot', toColumn: 'id_pilot', label: 'N:1' },
  { fromTable: 'session_result', fromColumn: 'id_team', toTable: 'team', toColumn: 'id_team', label: 'N:1' },
];

export type ScreenId =
  | 'overview'
  | 'tables'
  | 'sql'
  | 'import-export'
  | 'wireframes'
  | 'design-system';

export interface PrototypeScenarioStep {
  id: string;
  title: string;
  description: string;
  targetScreen: ScreenId;
  targetTable?: TableName;
  actionHint: string;
}

export const PROTOTYPE_SCENARIO_STEPS: PrototypeScenarioStep[] = [
  {
    id: 'step-1',
    title: '01. Структура и навигация',
    description: 'Изучение ER-диаграммы из 8 таблиц и переход к таблице пилотов через схему или боковое меню.',
    targetScreen: 'overview',
    actionHint: 'Нажмите на таблицу pilot на ER-схеме или перейдите к следующему шагу.',
  },
  {
    id: 'step-2',
    title: '02. Просмотр, фильтрация и ввод данных',
    description: 'Сортировка, поиск, фильтрация по командам и добавление новой записи через модальную форму.',
    targetScreen: 'tables',
    targetTable: 'pilot',
    actionHint: 'Отфильтруйте таблицу или нажмите «Добавить запись», чтобы проверить форму ввода.',
  },
  {
    id: 'step-3',
    title: '03. Выполнение SQL-запросов',
    description: 'Запуск JOIN-запроса по таблицам session_result, pilot и team с анализом результатов.',
    targetScreen: 'sql',
    actionHint: 'Выберите шаблон запроса или отредактируйте SQL и нажмите «Выполнить».',
  },
  {
    id: 'step-4',
    title: '04. Импорт и экспорт (CSV / JSON)',
    description: 'Загрузка тестового файла с предпросмотром, валидацией внешних ключей и экспортом таблицы.',
    targetScreen: 'import-export',
    actionHint: 'Выберите формат CSV или JSON, загрузите пример и проверьте статус операции.',
  },
  {
    id: 'step-5',
    title: '05. Wireframes и дизайн-система',
    description: 'Просмотр упрощённых каркасов всех экранов, карты переходов и библиотеки UI-компонентов.',
    targetScreen: 'wireframes',
    actionHint: 'Переключайтесь между каркасами и режимом «Каркас / UI» в верхней панели.',
  },
];
