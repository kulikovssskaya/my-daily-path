"use client";

import { useState, type CSSProperties } from "react";

const C = {
  bg: "#080A10",
  surface: "#0F1118",
  card: "#141720",
  accent: "#5B4FE8",
  accentBright: "#7B6FFF",
  accentGlow: "rgba(91,79,232,0.15)",
  teal: "#00C9A7",
  rose: "#FF4D6D",
  amber: "#FFB020",
  green: "#22C55E",
  blue: "#3B9EFF",
  violet: "#A855F7",
  text: "#F0EEF8",
  muted: "#6B6980",
  mutedLight: "#9896A8",
  border: "rgba(91,79,232,0.2)",
  borderMuted: "rgba(255,255,255,0.06)",
  red: "#FF3B30",
};

// ─── DATA ────────────────────────────────────────────────────────────────────

const RULES = [
  { n: "01", rule: "Стартуешь в 9:00. Без исключений.", sub: "Буткемп — это работа. Рабочий день начинается в 9.", icon: "⏰" },
  { n: "02", rule: "25 мин работа → 5 мин отдых.", sub: "2 помидоры подряд → длинный перерыв 20 мин. Таймер обязателен.", icon: "🍅" },
  { n: "03", rule: "Не смотришь решение первые 20 минут.", sub: "Застряла — запиши что непонятно, попробуй иначе. Только потом гугл.", icon: "🔒" },
  { n: "04", rule: "Каждый день — коммит на GitHub.", sub: "Даже 5 строк. Зелёный граф = видимый прогресс. Без коммита — день не считается.", icon: "💚" },
  { n: "05", rule: "Дневник в конце дня. 5 минут, 3 пункта.", sub: "Что сделала. Что не поняла. Что завтра первым делом.", icon: "📓" },
  { n: "06", rule: "Никакой теории без практики в тот же день.", sub: "Прочитала раздел конспекта → до конца дня написала код на эту тему.", icon: "⚡" },
];

const SETUP = [
  { step: "1", title: "Python окружение", cmd: "brew install python → python --version (нужен 3.10+)", detail: "Если уже есть — пропусти. Если нет — 10 минут на установку." },
  { step: "2", title: "Jupyter Lab", cmd: "pip install jupyterlab pandas numpy matplotlib seaborn scikit-learn catboost shap", detail: "Одна команда. Занимает 3–5 минут." },
  { step: "3", title: "GitHub", cmd: "Создай репозиторий: ml-portfolio. Папки: week1/, week2/, project0-catboost/", detail: "Публичный репозиторий. README с одной строкой: 'ML portfolio — Aleksandra Kulikova'" },
  { step: "4", title: "Kaggle аккаунт", cmd: "kaggle.com → Sign Up → скачай Titanic dataset (CSV)", detail: "Это будет твой первый датасет. Положи в week1/" },
  { step: "5", title: "Первый ноутбук", cmd: "jupyter lab → New Notebook → назови: 01_pandas_basics.ipynb", detail: "Всё. Среда готова. Завтра с 9:00 начинаешь." },
];

const WEEK1 = [
  {
    day: "День 1",
    date: "Пн",
    title: "Python + Pandas. Руки в данные.",
    color: C.accentBright,
    emoji: "🐍",
    goal: "К концу дня: умеешь загрузить датасет, посмотреть структуру, найти пропуски, построить 3 графика.",
    blocks: [
      {
        time: "09:00–10:30",
        label: "БЛОК 1 · 90 мин",
        title: "Pandas: основы без компромиссов",
        color: C.accentBright,
        tasks: [
          "Открой 01_pandas_basics.ipynb",
          "Напиши import pandas as pd, import numpy as np — запусти",
          "df = pd.read_csv('titanic.csv') — загрузи данные",
          "Выполни руками (не копируй): df.head(), df.info(), df.describe(), df.shape",
          "df.isnull().sum() — найди пропуски. Запиши в markdown-ячейке что нашла",
          "df['Age'].fillna(df['Age'].median(), inplace=True) — заполни пропуск",
        ],
        output: "Ноутбук с 10+ ячейками, все запущены, нет ошибок"
      },
      {
        time: "10:30–10:50",
        label: "ПЕРЕРЫВ",
        title: "Выйди из-за компьютера. Вода, воздух.",
        color: C.muted,
        tasks: [],
        output: ""
      },
      {
        time: "10:50–12:30",
        label: "БЛОК 2 · 100 мин",
        title: "Pandas: группировка и фильтрация",
        color: C.accentBright,
        tasks: [
          "df[df['Survived'] == 1] — фильтрация. Сколько выжило?",
          "df.groupby('Pclass')['Survived'].mean() — выживаемость по классу",
          "df.groupby(['Sex', 'Pclass'])['Survived'].mean().reset_index() — двойная группировка",
          "df.sort_values('Fare', ascending=False).head(10) — топ по цене билета",
          "df['FamilySize'] = df['SibSp'] + df['Parch'] + 1 — создай новый признак",
          "ЗАДАЧА БЕЗ ПОДСКАЗКИ: найди средний возраст выживших vs не выживших по полу",
        ],
        output: "Новый признак FamilySize создан. Задача решена самостоятельно."
      },
      {
        time: "12:30–13:30",
        label: "ОБЕД · 60 мин",
        title: "Полный отдых. Без экрана.",
        color: C.muted,
        tasks: [],
        output: ""
      },
      {
        time: "13:30–15:30",
        label: "БЛОК 3 · 120 мин",
        title: "Визуализация: matplotlib + seaborn",
        color: C.teal,
        tasks: [
          "import matplotlib.pyplot as plt, import seaborn as sns",
          "sns.histplot(df['Age'].dropna()) — распределение возраста",
          "sns.countplot(x='Survived', hue='Sex', data=df) — выживаемость по полу",
          "sns.boxplot(x='Pclass', y='Fare', data=df) — цены по классу",
          "plt.figure(figsize=(10,6)) + заголовок + xlabel/ylabel — оформление",
          "ЗАДАЧА: построй корреляционную матрицу sns.heatmap(df.corr())",
          "Сохрани все графики: plt.savefig('plot_name.png')",
        ],
        output: "3+ графика сохранены в папке week1/"
      },
      {
        time: "15:30–15:50",
        label: "ПЕРЕРЫВ",
        title: "Встань, подвигайся.",
        color: C.muted,
        tasks: [],
        output: ""
      },
      {
        time: "15:50–17:30",
        label: "БЛОК 4 · 100 мин",
        title: "EDA — первый самостоятельный анализ",
        color: C.teal,
        tasks: [
          "Создай новый ноутбук: 02_eda_titanic.ipynb",
          "Напиши анализ в markdown: что за данные, что хочешь узнать",
          "5 собственных вопросов к данным (например: влияет ли размер семьи на выживаемость?)",
          "Ответь на каждый вопрос кодом + графиком",
          "Финальный вывод в markdown: 3–5 предложений что нашла интересного",
          "git add . → git commit -m 'Day 1: pandas basics + EDA titanic' → git push",
        ],
        output: "02_eda_titanic.ipynb запушен на GitHub. День 1 завершён."
      },
      {
        time: "17:30–17:45",
        label: "ДНЕВНИК",
        title: "5 минут. 3 пункта. Обязательно.",
        color: C.muted,
        tasks: ["Что сделала сегодня", "Что не поняла / где застряла", "Что завтра первым делом (конкретно)"],
        output: ""
      },
    ]
  },
  {
    day: "День 2",
    date: "Вт",
    title: "Sklearn: первая модель. LogReg на Titanic.",
    color: C.teal,
    emoji: "🤖",
    goal: "К концу дня: обучена первая модель, понимаешь train/test split, accuracy/precision/recall.",
    blocks: [
      {
        time: "09:00–10:30",
        label: "БЛОК 1 · 90 мин",
        title: "Препроцессинг: готовим данные для модели",
        color: C.teal,
        tasks: [
          "Создай 03_first_model.ipynb",
          "Загрузи Titanic, повтори очистку (5 минут — должно быть быстро после вчера)",
          "Label Encoding: df['Sex'] = df['Sex'].map({'male': 0, 'female': 1})",
          "Выбери признаки: features = ['Pclass', 'Sex', 'Age', 'Fare', 'FamilySize']",
          "X = df[features], y = df['Survived']",
          "from sklearn.model_selection import train_test_split",
          "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)",
          "Объясни в markdown: почему random_state=42? Что такое test_size=0.2?",
        ],
        output: "X_train, X_test готовы. Ноутбук запущен без ошибок."
      },
      {
        time: "10:50–12:30",
        label: "БЛОК 2 · 100 мин",
        title: "Логистическая регрессия + метрики",
        color: C.teal,
        tasks: [
          "from sklearn.linear_model import LogisticRegression",
          "model = LogisticRegression(max_iter=1000)",
          "model.fit(X_train, y_train)",
          "y_pred = model.predict(X_test)",
          "from sklearn.metrics import accuracy_score, classification_report, confusion_matrix",
          "Напечатай все метрики. Для каждой напиши в markdown: что это значит?",
          "sns.heatmap(confusion_matrix(y_test, y_pred), annot=True) — матрица ошибок",
          "ВОПРОС К СЕБЕ: что значит precision=0.8 для класса 'выжил'? Запиши ответ.",
        ],
        output: "Первая модель обучена. Метрики распечатаны и объяснены."
      },
      {
        time: "13:30–15:00",
        label: "БЛОК 3 · 90 мин",
        title: "DecisionTree + сравнение моделей",
        color: C.amber,
        tasks: [
          "from sklearn.tree import DecisionTreeClassifier",
          "tree = DecisionTreeClassifier(max_depth=5, random_state=42)",
          "Обучи, предскажи, выведи метрики — по той же схеме",
          "Сравни LogReg vs DecisionTree в таблице (можно в markdown)",
          "feature_importances_ — какие признаки важнее для дерева?",
          "Попробуй max_depth=3 и max_depth=10 — что меняется? Запиши вывод.",
          "ЗАДАЧА: объясни своими словами почему глубокое дерево хуже обобщает",
        ],
        output: "2 модели обучены. Сравнение записано. Понятие overfitting — своими словами."
      },
      {
        time: "15:50–17:30",
        label: "БЛОК 4 · 100 мин",
        title: "Cross-validation. Делаем оценку честной.",
        color: C.amber,
        tasks: [
          "from sklearn.model_selection import cross_val_score",
          "scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')",
          "print(scores, scores.mean(), scores.std())",
          "Объясни в markdown: зачем CV, если у нас есть test set?",
          "Повтори CV для DecisionTree с разными max_depth",
          "git add . → git commit -m 'Day 2: LogReg + DecisionTree + CV' → git push",
        ],
        output: "Cross-validation понята и применена на двух моделях."
      },
    ]
  },
  {
    day: "День 3",
    date: "Ср",
    title: "CatBoost. Воспроизводишь свой реальный проект.",
    color: C.amber,
    emoji: "🐱",
    goal: "К концу дня: воспроизведён CatBoost-проект с нуля. Это твоё главное собеседовательное оружие.",
    blocks: [
      {
        time: "09:00–10:30",
        label: "БЛОК 1 · 90 мин",
        title: "CatBoost: установка, первый запуск",
        color: C.amber,
        tasks: [
          "Создай 04_catboost_project.ipynb",
          "from catboost import CatBoostClassifier, Pool",
          "Используй Titanic (или свои анонимизированные данные если можешь)",
          "cat_features = ['Sex', 'Embarked'] — укажи категориальные признаки",
          "model = CatBoostClassifier(iterations=300, depth=6, learning_rate=0.1, eval_metric='AUC', verbose=50)",
          "Запусти обучение. Посмотри на лог — что значат цифры?",
          "Запиши в markdown: чем CatBoost отличается от DecisionTree?",
        ],
        output: "CatBoost обучен. Лог обучения прочитан и понят."
      },
      {
        time: "10:50–12:30",
        label: "БЛОК 2 · 100 мин",
        title: "Метрики: PR-AUC. Это твой главный вопрос на интервью.",
        color: C.amber,
        tasks: [
          "from sklearn.metrics import average_precision_score, roc_auc_score",
          "from sklearn.metrics import precision_recall_curve, roc_curve",
          "y_prob = model.predict_proba(X_test)[:, 1]",
          "Посчитай оба: PR-AUC и ROC-AUC",
          "Нарисуй обе кривые на одном графике",
          "КРИТИЧЕСКИ ВАЖНО: напиши в markdown своими словами — когда PR-AUC лучше ROC-AUC?",
          "Ответ: когда классы несбалансированы. Объясни на примере своего выкупного проекта.",
        ],
        output: "PR-AUC и ROC-AUC посчитаны. Объяснение записано — это твой ответ на интервью."
      },
      {
        time: "13:30–15:30",
        label: "БЛОК 3 · 120 мин",
        title: "SHAP: интерпретируемость модели",
        color: C.rose,
        tasks: [
          "import shap",
          "explainer = shap.TreeExplainer(model)",
          "shap_values = explainer.shap_values(X_test)",
          "shap.summary_plot(shap_values, X_test) — общая важность признаков",
          "shap.waterfall_plot(explainer(X_test)[0]) — объяснение одного предсказания",
          "Выбери 1 пассажира. Объясни: почему модель решила что он выживет/не выживет?",
          "ЗАДАЧА: как бы ты использовала SHAP чтобы объяснить модель выкупа менеджеру?",
        ],
        output: "SHAP-графики сохранены. Умеешь объяснить предсказание конкретного случая."
      },
      {
        time: "15:50–17:30",
        label: "БЛОК 4 · 100 мин",
        title: "README для проекта. Это часть резюме.",
        color: C.rose,
        tasks: [
          "Создай папку project0-catboost/ на GitHub",
          "README.md структура:",
          "  ## Задача: предсказание [выкупа/выживания]",
          "  ## Результат: PR-AUC X.XX, метрика улучшилась на XX%",
          "  ## Стек: Python, CatBoost, SHAP, Pandas",
          "  ## Ключевые находки: [3 инсайта из SHAP]",
          "  ## Как запустить: [2-3 команды]",
          "git add . → git commit -m 'Day 3: CatBoost + SHAP + project README' → git push",
        ],
        output: "project0-catboost на GitHub с README. Это в резюме."
      },
    ]
  },
  {
    day: "День 4",
    date: "Чт",
    title: "SQL. Не забываем — это на каждом интервью.",
    color: C.green,
    emoji: "🗄️",
    goal: "К концу дня: window functions от и до. Пишешь когортный анализ на SQL без подсказок.",
    blocks: [
      {
        time: "09:00–10:30",
        label: "БЛОК 1 · 90 мин",
        title: "Window functions: ROW_NUMBER, RANK, DENSE_RANK",
        color: C.green,
        tasks: [
          "Открой sql-ex.ru или mode.com/sql-tutorial",
          "ROW_NUMBER() OVER (PARTITION BY city ORDER BY salary DESC)",
          "Задача: пронумеруй партнёров внутри каждого GEO по объёму трафика",
          "RANK vs DENSE_RANK — в чём разница? Напиши пример где они дают разный результат",
          "LAG(revenue, 1) OVER (ORDER BY date) — предыдущее значение",
          "Задача: посчитай рост выручки день к дню для каждого партнёра",
        ],
        output: "5 запросов с window functions написаны и выполнены."
      },
      {
        time: "10:50–12:30",
        label: "БЛОК 2 · 100 мин",
        title: "Когортный анализ на SQL — то что реально спрашивают",
        color: C.green,
        tasks: [
          "Создай таблицу users(user_id, signup_date, purchase_date, revenue) — вручную или в SQLite",
          "Когорта = месяц первой покупки",
          "WITH cohorts AS (SELECT user_id, MIN(purchase_date) as cohort_month FROM ...)",
          "Retention: сколько из когорты вернулись через 1/2/3 месяца",
          "Визуализируй результат в Python (sns.heatmap) — retention matrix",
          "ЗАДАЧА: объясни вслух что ты делаешь на каждом шаге — это репетиция интервью",
        ],
        output: "Когортный анализ написан + retention matrix визуализирована."
      },
      {
        time: "13:30–15:00",
        label: "БЛОК 3 · 90 мин",
        title: "SQL + Pandas: два инструмента одной задачи",
        color: C.green,
        tasks: [
          "Возьми любую SQL-задачу из утра",
          "Реши её на Pandas (без SQL)",
          "Сравни: что удобнее? Где SQL быстрее? Запиши вывод",
          "pandasql или sqlite3 в Python — выполни SQL прямо в ноутбуке",
          "10 задач на LeetCode SQL Easy — без таймера, просто набить руку",
        ],
        output: "Умеешь решать одну задачу двумя способами."
      },
      {
        time: "15:50–17:30",
        label: "БЛОК 4 · 100 мин",
        title: "Аномалии на SQL — твоя реальная экспертиза",
        color: C.teal,
        tasks: [
          "Задача: найти партнёров с CTR > среднего + 3*std (аномальный трафик)",
          "AVG(ctr) OVER () + STDDEV(ctr) OVER () в одном запросе",
          "Как бы ты автоматизировала этот запрос для 100+ партнёров?",
          "Сохрани запрос в файл sql_snippets.sql на GitHub",
          "git commit -m 'Day 4: SQL window functions + cohort analysis'",
        ],
        output: "SQL-сниппеты на GitHub. Аномалия через SQL — понятно и записано."
      },
    ]
  },
  {
    day: "День 5",
    date: "Пт",
    title: "Feature Engineering + Неделя 1 закрыта.",
    color: C.violet,
    emoji: "🔧",
    goal: "К концу дня: умеешь создавать признаки руками. Неделя зафиксирована, план на нед. 2 готов.",
    blocks: [
      {
        time: "09:00–10:30",
        label: "БЛОК 1 · 90 мин",
        title: "Feature engineering: числовые признаки",
        color: C.violet,
        tasks: [
          "Создай 05_feature_engineering.ipynb",
          "Бинаризация: df['is_high_fare'] = (df['Fare'] > df['Fare'].median()).astype(int)",
          "Логарифм: df['log_fare'] = np.log1p(df['Fare']) — зачем? Запиши.",
          "Взаимодействия: df['age_class'] = df['Age'] * df['Pclass']",
          "Полиномиальные признаки: from sklearn.preprocessing import PolynomialFeatures",
          "Обучи CatBoost с новыми признаками. PR-AUC вырос или упал? Почему?",
        ],
        output: "Feature engineering применён. Метрика до/после записана."
      },
      {
        time: "10:50–12:30",
        label: "БЛОК 2 · 100 мин",
        title: "Feature engineering: категории и даты",
        color: C.violet,
        tasks: [
          "OneHotEncoding vs LabelEncoding — когда что?",
          "pd.get_dummies(df, columns=['Embarked', 'Pclass'])",
          "Если есть дата: df['month'] = df['date'].dt.month, df['dayofweek'] = ...",
          "df['is_weekend'] = df['dayofweek'].isin([5, 6]).astype(int)",
          "ЗАДАЧА: придумай 3 признака которые бы ты создала для модели выкупа партнёра",
          "Запиши их в markdown с объяснением бизнес-логики",
        ],
        output: "Категориальные признаки закодированы. 3 признака для выкупа описаны."
      },
      {
        time: "13:30–15:30",
        label: "БЛОК 3 · 120 мин",
        title: "РЕТРОСПЕКТИВА недели 1 + GitHub приведён в порядок",
        color: C.amber,
        tasks: [
          "Открой все ноутбуки недели 1. Убедись что везде есть markdown-объяснения.",
          "README.md в корне репозитория: напиши что сделала за неделю",
          "Составь список: что из теории Skillbox теперь понимаешь на практике?",
          "Составь список: что ещё непонятно / где застряла?",
          "Создай файл WEEK2_PLAN.md — заполнишь его в следующем блоке",
          "git commit -m 'Week 1 complete: pandas, sklearn, catboost, shap, sql'",
        ],
        output: "Репозиторий чистый. README обновлён. Рефлексия зафиксирована."
      },
      {
        time: "15:50–17:30",
        label: "БЛОК 4 · 100 мин",
        title: "Постановка проекта Churn — старт недели 2",
        color: C.rose,
        tasks: [
          "Скачай: Telco Customer Churn (kaggle.com/datasets/blastchar/telco-customer-churn)",
          "Создай папку: project1-churn/",
          "Создай churn_eda.ipynb — напиши постановку задачи в markdown",
          "Ответь на 5 вопросов перед моделированием (в markdown):",
          "  1. Что предсказываем? 2. Кто будет использовать? 3. Какая метрика? Почему?",
          "  4. Что значит ошибка типа I vs типа II для бизнеса?",
          "  5. Какой baseline (наивная модель)?",
          "Запусти df.info() и df['Churn'].value_counts() — запомни баланс классов",
        ],
        output: "Проект Churn начат. Постановка задачи записана в markdown."
      },
    ]
  },
];

const WEEK2 = [
  {
    day: "День 6",
    date: "Пн",
    title: "Churn EDA. Данные рассказывают историю.",
    color: C.accentBright,
    emoji: "🔍",
    goal: "К концу дня: полный EDA по Churn. Знаешь какие признаки важны ДО обучения модели.",
    blocks: [
      {
        time: "09:00–10:30",
        label: "БЛОК 1",
        title: "EDA: распределения и пропуски",
        color: C.accentBright,
        tasks: [
          "df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce') — есть скрытые пропуски",
          "Найди их. Реши: удалить или заполнить? Запиши решение и обоснование.",
          "df['Churn'] = (df['Churn'] == 'Yes').astype(int)",
          "value_counts(normalize=True) — какой баланс классов?",
          "ВАЖНО: запиши: как несбалансированность влияет на выбор метрики?",
        ],
        output: "Пропуски обработаны. Баланс классов зафиксирован. Метрика выбрана."
      },
      {
        time: "10:50–12:30",
        label: "БЛОК 2",
        title: "EDA: бизнес-инсайты из графиков",
        color: C.accentBright,
        tasks: [
          "Для каждой категориальной фичи: sns.countplot с hue='Churn'",
          "Для числовых: sns.boxplot(x='Churn', y=feature)",
          "Корреляционная матрица только для числовых",
          "ЗАДАЧА: найди топ-3 признака которые визуально сильно связаны с оттоком",
          "Напиши бизнес-вывод: кто уходит? Что их объединяет?",
          "Сравни с твоим опытом аффилиатов — есть ли аналогии?",
        ],
        output: "10+ графиков. Бизнес-вывод в markdown. Топ-3 признака определены."
      },
      {
        time: "13:30–15:30",
        label: "БЛОК 3",
        title: "Baseline модель + имбаланс классов",
        color: C.teal,
        tasks: [
          "Baseline: всегда предсказывай 0 (не уйдёт). Какой accuracy? Почему это плохо?",
          "Обучи LogReg. Посмотри на PR-AUC — ниже чем AUC? Почему?",
          "class_weight='balanced' в LogReg — запусти снова. Что изменилось?",
          "from imblearn.over_sampling import SMOTE",
          "X_res, y_res = SMOTE().fit_resample(X_train, y_train)",
          "Сравни 3 подхода: без балансировки / class_weight / SMOTE",
        ],
        output: "3 подхода к имбалансу протестированы. Лучший выбран с обоснованием."
      },
      {
        time: "15:50–17:30",
        label: "БЛОК 4",
        title: "CatBoost на Churn. Optuna для подбора.",
        color: C.amber,
        tasks: [
          "CatBoostClassifier с eval_set, early_stopping_rounds=50",
          "plot_model = True — посмотри кривую обучения",
          "pip install optuna",
          "Напиши objective функцию для Optuna (подбери depth, learning_rate, iterations)",
          "study.optimize(objective, n_trials=30) — запусти",
          "Лучшие параметры → переобучи финальную модель",
        ],
        output: "CatBoost оптимизирован через Optuna. PR-AUC финальной модели записан."
      },
    ]
  },
  {
    day: "День 7",
    date: "Вт",
    title: "XGBoost. Сравнение. Feature Importance.",
    color: C.teal,
    emoji: "⚡",
    goal: "К концу дня: умеешь сравнивать модели правильно. Знаешь разницу CatBoost vs XGBoost — на интервью.",
    blocks: [
      {
        time: "09:00–12:30",
        label: "БЛОК 1–2",
        title: "XGBoost + сравнение с CatBoost",
        color: C.teal,
        tasks: [
          "pip install xgboost",
          "from xgboost import XGBClassifier",
          "Обучи XGBoost с теми же параметрами что CatBoost",
          "Сравни время обучения, PR-AUC, recall на классе 1",
          "Главный вопрос на интервью: чем CatBoost лучше XGBoost для категориальных признаков?",
          "Ответ написать в markdown своими словами (ordered target encoding vs ручной OHE)",
          "Когда XGBoost лучше? Запиши сценарии.",
        ],
        output: "Сравнительная таблица моделей. Ответ на вопрос интервью записан."
      },
      {
        time: "13:30–17:30",
        label: "БЛОК 3–4",
        title: "SHAP для Churn + бизнес-вывод",
        color: C.rose,
        tasks: [
          "SHAP summary plot — топ-10 признаков",
          "SHAP dependence plot для топ-3 признака",
          "Найди 'хорошего' и 'плохого' клиента — объясни предсказание через waterfall",
          "БИЗНЕС-ЗАДАЧА: если маркетинг может удержать 100 клиентов — кому звонить первым?",
          "Реши это через модель: sort by predict_proba, filter by top features",
          "Это твой STAR-кейс для интервью: запиши его по формату Ситуация→Задача→Действие→Результат",
        ],
        output: "SHAP-анализ завершён. STAR-кейс по Churn записан."
      },
    ]
  },
  {
    day: "День 8",
    date: "Ср",
    title: "Isolation Forest. Аномалии — твоя ниша.",
    color: C.amber,
    emoji: "🎯",
    goal: "К концу дня: Anomaly Detection проект начат. Связан с твоим реальным fraud-опытом.",
    blocks: [
      {
        time: "09:00–12:30",
        label: "БЛОК 1–2",
        title: "Isolation Forest: теория + код",
        color: C.amber,
        tasks: [
          "Датасет: Credit Card Fraud (kaggle.com/datasets/mlg-ulb/creditcardfraud)",
          "Создай project2-fraud/fraud_detection.ipynb",
          "from sklearn.ensemble import IsolationForest",
          "model = IsolationForest(contamination=0.001, random_state=42)",
          "Что такое contamination? Как выбрать значение в реальном проекте?",
          "y_pred = model.fit_predict(X) → -1 значит аномалия",
          "Оцени через confusion_matrix (если есть метки)",
          "ВАЖНО: объясни в markdown как Isolation Forest работает интуитивно",
        ],
        output: "Isolation Forest обучен. Интуитивное объяснение записано."
      },
      {
        time: "13:30–17:30",
        label: "БЛОК 3–4",
        title: "Связь с реальным опытом + STAR-кейс",
        color: C.amber,
        tasks: [
          "Напиши в ноутбуке: как ты искала аномалии вручную раньше (описание процесса)",
          "Как Isolation Forest мог бы автоматизировать это?",
          "Сравни: rule-based (SQL + пороги) vs ML (Isolation Forest) — плюсы/минусы",
          "Создай синтетические данные партнёров: np.random.normal + np.random.uniform для аномалий",
          "Запусти Isolation Forest на них. Нашёл аномалии?",
          "README для project2-fraud: обязательно упомяни связь с реальным опытом",
        ],
        output: "Fraud detection проект с README. STAR-кейс по аномалиям готов."
      },
    ]
  },
  {
    day: "День 9",
    date: "Чт",
    title: "MLSD: учимся думать как Senior. Антифрод-система.",
    color: C.rose,
    emoji: "⚙️",
    goal: "К концу дня: умеешь структурно отвечать на MLSD-вопрос. Закрываешь главный gap с Авито.",
    blocks: [
      {
        time: "09:00–10:30",
        label: "БЛОК 1",
        title: "Шаблон MLSD: учи наизусть",
        color: C.rose,
        tasks: [
          "Открой раздел интервью из предыдущего артефакта — блок MLSD",
          "12 блоков: Бизнес → Метрики → Данные → Модель → Оценка → Архитектура → Ресурсы → SLA → Риски → Мониторинг → Fallback → Rollout",
          "Создай карточки (можно в Notion или бумажные): блок → 3 ключевых вопроса",
          "Поставь таймер: 5 минут. Воспроизведи все 12 блоков по памяти.",
          "Повтори 3 раза. Это должно стать автоматическим.",
        ],
        output: "12 блоков MLSD воспроизводишь по памяти без подсказок."
      },
      {
        time: "10:50–14:30",
        label: "БЛОК 2–3",
        title: "Кейс: антифрод система для CPA-платформы",
        color: C.rose,
        tasks: [
          "ЭТО УСТНЫЙ КЕЙС. Говори вслух. Записывай себя на телефон.",
          "Бизнес: CPA-платформа теряет 15% бюджета на фродовый трафик. Нужна система.",
          "Пройди все 12 блоков вслух за 50 минут:",
          "  Метрики: Precision@K (не хотим банить честных), Recall (не пропустить фрод)",
          "  Данные: что есть (клики, конверсии, IP, user agent, timing)",
          "  Модель: Isolation Forest + CatBoost (двухэтапный подход)",
          "  Архитектура: batch (ночью) или realtime? Почему?",
          "  Fallback: rule-based фильтр если ML недоступен",
          "  Мониторинг: доля заблокированных, апелляции, дрейф признаков",
          "Прослушай запись. Где пробелы? Запиши.",
        ],
        output: "Антифрод кейс пройден вслух. Запись прослушана. Пробелы зафиксированы."
      },
      {
        time: "15:00–17:30",
        label: "БЛОК 4",
        title: "Production: сервинг модели. Закрываем gap с Авито.",
        color: C.rose,
        tasks: [
          "Изучи концептуально (не кодить, понять): batch vs realtime inference",
          "Batch: ночной джоб, предсказания в БД, дашборд — когда подходит?",
          "Realtime: API, latency < 100ms — когда нужен?",
          "Напиши в Notion/Markdown: для антифрода — что выбираешь и почему?",
          "Data drift: что это? Как детектировать? (PSI, KS-test)",
          "Canary rollout: 5% трафика → мониторинг → 100%. Запиши схему.",
          "ЭТО ЗАКРЫВАЕТ ГЛАВНЫЙ GAP АВИТО. Повтори вслух.",
        ],
        output: "Понятия: batch/realtime, data drift, canary rollout — объяснить без шпаргалки."
      },
    ]
  },
  {
    day: "День 10",
    date: "Пт",
    title: "Финальный спринт. GitHub готов. Резюме обновлено.",
    color: C.green,
    emoji: "🏁",
    goal: "Конец дня: portfolio на GitHub публично готово. Резюме обновлено. Неделя 2 закрыта.",
    blocks: [
      {
        time: "09:00–11:00",
        label: "БЛОК 1",
        title: "Доделать: Churn проект — финальный вид",
        color: C.green,
        tasks: [
          "Пройди по churn-ноутбуку. Убери мусорный код. Добавь markdown везде.",
          "Финальная ячейка: 3 бизнес-вывода из анализа",
          "README: задача / метрика / результат (PR-AUC) / стек / как запустить",
          "Добавь скриншот SHAP summary plot в README",
        ],
        output: "project1-churn готов для показа рекрутеру."
      },
      {
        time: "11:00–13:00",
        label: "БЛОК 2",
        title: "Доделать: Fraud проект + финальный README репо",
        color: C.green,
        tasks: [
          "То же самое для project2-fraud",
          "Главный README репозитория: таблица проектов",
          "  | Проект | Задача | Метрика | Стек |",
          "  | CatBoost выкуп | Предсказание buyout | PR-AUC 0.80 | CatBoost, SHAP |",
          "  | Churn | Отток клиентов | PR-AUC X.XX | CatBoost, Optuna |",
          "  | Fraud | Аномалии трафика | Precision XX% | IsolationForest |",
          "git add . → git commit -m 'Week 2 complete: churn + fraud + MLSD prep' → git push",
        ],
        output: "GitHub-портфолио публично готово. 3 проекта в таблице."
      },
      {
        time: "14:00–15:30",
        label: "БЛОК 3",
        title: "Резюме: обновить ML-секцию",
        color: C.accentBright,
        tasks: [
          "В резюме добавить под ML-проектом (CatBoost -21% costs):",
          "  'GitHub: [ссылка] | PR-AUC 0.80 | SHAP-интерпретация'",
          "Добавить в Skills: CatBoost, XGBoost, Sklearn, SHAP, Optuna, Pandas, Matplotlib",
          "В Summary: добавить 'Building ML portfolio: churn prediction, fraud detection'",
          "LinkedIn: обновить Skills, добавить ссылку на GitHub в Featured",
        ],
        output: "Резюме и LinkedIn обновлены. GitHub-ссылка везде проставлена."
      },
      {
        time: "15:30–17:30",
        label: "БЛОК 4",
        title: "РЕТРОСПЕКТИВА 2 НЕДЕЛЬ + план недели 3",
        color: C.violet,
        tasks: [
          "Открой дневник. Прочитай записи каждого дня.",
          "Зафиксируй: что умеешь сейчас чего не умела 2 недели назад (список минимум 15 пунктов)",
          "Зафиксируй: топ-3 темы где ещё не уверена",
          "Напиши план недели 3: MLSD углубление + начало E2E pipeline (Streamlit)",
          "Последний коммит: git commit -m '2 weeks bootcamp complete. Lets go.'",
          "ПОЗДРАВЛЯЮ. За 2 недели ты сделала больше, чем большинство за 2 месяца.",
        ],
        output: "2 недели завершены. 3 проекта. 10 коммитов. Резюме обновлено. Вперёд."
      },
    ]
  },
];

const DAILY_TEMPLATE = [
  { time: "09:00", act: "Старт. Открыть ноутбук, прочитать вчерашний дневник.", icon: "⚡" },
  { time: "09:00–10:30", act: "Блок 1 (4 помидоро: 25+5+25+5+25+5+25)", icon: "🍅" },
  { time: "10:30–10:50", act: "Длинный перерыв. Выйти из-за стола.", icon: "🚶" },
  { time: "10:50–12:30", act: "Блок 2 (4 помидоро)", icon: "🍅" },
  { time: "12:30–13:30", act: "ОБЕД. Без экрана, без учёбы. Это важно.", icon: "🍽️" },
  { time: "13:30–15:30", act: "Блок 3 (4 помидоро)", icon: "🍅" },
  { time: "15:30–15:50", act: "Перерыв. Подвигаться.", icon: "🏃" },
  { time: "15:50–17:30", act: "Блок 4 (4 помидоро)", icon: "🍅" },
  { time: "17:30–17:45", act: "Дневник: что сделала / не поняла / что завтра", icon: "📓" },
  { time: "17:45", act: "Git commit + push. День закрыт.", icon: "💚" },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function Bootcamp() {
  const [view, setView] = useState("rules");
  const [openDay1, setOpenDay1] = useState<number | null>(null);
  const [openDay2, setOpenDay2] = useState<number | null>(null);
  const [openBlock, setOpenBlock] = useState<Record<string, boolean>>({});

  const toggleBlock = (dayIdx: number, blockIdx: number, week: number) => {
    const key = `${week}-${dayIdx}-${blockIdx}`;
    setOpenBlock(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const tabBtn = (id: string, label: string) => (
    <button onClick={() => setView(id)} style={{
      padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer",
      fontSize: 13, fontWeight: view === id ? 800 : 400,
      background: view === id ? C.accent : "transparent",
      color: view === id ? "#fff" : C.muted,
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  const card = (style: CSSProperties = {}) => ({
    background: C.card, borderRadius: 10, padding: "14px 18px",
    marginBottom: 10, border: `1px solid ${C.border}`, ...style,
  });

  const renderWeek = (days: typeof WEEK1, weekKey: 1 | 2) => (
    <div>
      {days.map((day, di) => {
        const isOpen = weekKey === 1 ? openDay1 === di : openDay2 === di;
        const setOpen = weekKey === 1 ? setOpenDay1 : setOpenDay2;
        return (
          <div key={di} style={{ marginBottom: 14 }}>
            {/* Day header */}
            <div
              onClick={() => setOpen(isOpen ? null : di)}
              style={{ background: C.card, border: `1px solid ${isOpen ? day.color : C.border}`, borderRadius: 12, padding: "14px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 10, background: `${day.color}18`, border: `2px solid ${day.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 18 }}>{day.emoji}</div>
                <div style={{ fontSize: 10, color: day.color, fontWeight: 800 }}>{day.date}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: day.color }}>{day.day} · {day.title}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>🎯 {day.goal}</div>
              </div>
              <span style={{ color: C.muted, fontSize: 16, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
            </div>

            {/* Day content */}
            {isOpen && (
              <div style={{ marginTop: 4, paddingLeft: 8 }}>
                {day.blocks.map((block, bi) => {
                  const bKey = `${weekKey}-${di}-${bi}`;
                  const bOpen = openBlock[bKey];
                  const isBreak = block.tasks.length === 0;
                  return (
                    <div key={bi} style={{ marginBottom: 6 }}>
                      <div
                        onClick={() => !isBreak && toggleBlock(di, bi, weekKey)}
                        style={{
                          background: isBreak ? C.surface : C.card,
                          border: `1px solid ${bOpen ? block.color : C.borderMuted}`,
                          borderRadius: 10, padding: "12px 16px",
                          cursor: isBreak ? "default" : "pointer",
                          display: "flex", alignItems: "center", gap: 14,
                          opacity: isBreak ? 0.6 : 1,
                        }}
                      >
                        <div style={{ minWidth: 100, fontSize: 11, color: C.muted, fontWeight: 600 }}>{block.time}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: block.color, fontWeight: 700, marginBottom: 2 }}>{block.label}</div>
                          <div style={{ fontWeight: isBreak ? 400 : 600, fontSize: 13, color: isBreak ? C.muted : C.text }}>{block.title}</div>
                        </div>
                        {!isBreak && <span style={{ color: C.muted, fontSize: 14 }}>{bOpen ? "▲" : "▼"}</span>}
                      </div>
                      {bOpen && !isBreak && (
                        <div style={{ background: "#0C0E18", border: `1px solid ${block.color}30`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "14px 16px" }}>
                          <div style={{ marginBottom: 10 }}>
                            {block.tasks.map((t, ti) => (
                              <div key={ti} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                                <span style={{ color: block.color, fontWeight: 800, minWidth: 20, fontSize: 12, marginTop: 1 }}>{ti + 1}.</span>
                                <span style={{ color: C.mutedLight, fontSize: 13, lineHeight: 1.6 }}>{t}</span>
                              </div>
                            ))}
                          </div>
                          {block.output && (
                            <div style={{ background: `${block.color}10`, border: `1px solid ${block.color}30`, borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{ color: C.green, fontSize: 13, flexShrink: 0 }}>✓</span>
                              <span style={{ color: C.mutedLight, fontSize: 12 }}><strong style={{ color: C.green }}>Output:</strong> {block.output}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', sans-serif", fontSize: 14 }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, #0A0B14 0%, #0D0A1C 100%)`, padding: "32px 24px 24px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" }}>Буткемп · 2 недели · 35–40 ч/нед</div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px", marginBottom: 6 }}>
            <span style={{ background: `linear-gradient(90deg, ${C.accentBright}, ${C.teal})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Начинаешь кодить завтра в 09:00.
            </span>
          </div>
          <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            Пошаговый алгоритм без воды. Каждый день — конкретный результат. Каждый вечер — коммит на GitHub.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
            {[
              { l: "10 дней", v: "5+5 рабочих" }, { l: "~38 часов", v: "практики" },
              { l: "3 проекта", v: "на GitHub" }, { l: "0", v: "воды" },
            ].map(b => (
              <div key={b.l} style={{ background: C.accentGlow, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 14px" }}>
                <span style={{ color: C.accentBright, fontWeight: 800, fontSize: 13 }}>{b.l} </span>
                <span style={{ color: C.muted, fontSize: 12 }}>{b.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", gap: 2, overflowX: "auto", padding: "10px 24px" }}>
          {tabBtn("rules", "⚡ Правила буткемпа")}
          {tabBtn("setup", "🛠 Сетап (сегодня)")}
          {tabBtn("template", "🕐 Дневной шаблон")}
          {tabBtn("week1", "📅 Неделя 1")}
          {tabBtn("week2", "📅 Неделя 2")}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* RULES */}
        {view === "rules" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Правила буткемпа</div>
              <div style={{ color: C.muted, fontSize: 13 }}>Нарушаешь правило — день не считается. Всё просто.</div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {RULES.map((r, i) => (
                <div key={i} style={{ ...card(), display: "flex", gap: 16, alignItems: "flex-start", border: `1px solid ${C.border}` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: C.accentGlow, border: `2px solid ${C.accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ fontSize: 16 }}>{r.icon}</div>
                    <div style={{ fontSize: 9, color: C.accent, fontWeight: 800 }}>{r.n}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>{r.rule}</div>
                    <div style={{ color: C.muted, fontSize: 13 }}>{r.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...card({ background: "linear-gradient(135deg, #0a0015, #100020)", border: `1px solid ${C.violet}44`, marginTop: 16 }) }}>
              <div style={{ fontWeight: 800, color: C.violet, marginBottom: 10, fontSize: 14 }}>Про сопротивление. Честно.</div>
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                Первые 3 дня будет тяжело. Это нормально — мозг не любит новое. <strong style={{ color: C.text }}>На 4-й день что-то щёлкнет.</strong> Код начнёт работать быстрее чем ломаться. Это момент перехода. До него надо просто дойти — не вдохновением, а дисциплиной. <strong style={{ color: C.violet }}>У тебя 35 часов в неделю. Это больше, чем у большинства кандидатов, которые готовятся после работы. Используй это преимущество.</strong>
              </p>
            </div>
          </div>
        )}

        {/* SETUP */}
        {view === "setup" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Сетап — сделай сегодня</div>
              <div style={{ color: C.muted, fontSize: 13 }}>Займёт 30–45 минут. Завтра в 09:00 уже кодишь, а не настраиваешь.</div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {SETUP.map((s, i) => (
                <div key={i} style={card({ border: `1px solid ${C.border}` })}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accentGlow, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: C.accentBright, fontSize: 14, flexShrink: 0 }}>{s.step}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                      <div style={{ background: "#0a0f0a", border: `1px solid ${C.green}30`, borderRadius: 8, padding: "8px 12px", fontFamily: "monospace", fontSize: 12, color: "#7AE0A0", marginBottom: 8 }}>
                        {s.cmd}
                      </div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{s.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...card({ background: `${C.green}10`, border: `1px solid ${C.green}40`, marginTop: 12 }) }}>
              <div style={{ fontWeight: 700, color: C.green, marginBottom: 6 }}>✅ Чеклист: сетап готов когда...</div>
              {["python --version → 3.10+", "jupyter lab открывается в браузере", "import pandas as pd в ноутбуке → нет ошибок", "GitHub репозиторий ml-portfolio создан и публичен", "Файл titanic.csv лежит в папке week1/"].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, color: C.muted, fontSize: 13 }}>
                  <span style={{ color: C.green }}>◆</span> {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DAILY TEMPLATE */}
        {view === "template" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Дневной шаблон</div>
              <div style={{ color: C.muted, fontSize: 13 }}>Одинаковый каждый день. Структура → меньше решений → больше работы.</div>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {DAILY_TEMPLATE.map((t, i) => (
                <div key={i} style={{ ...card(), display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ minWidth: 110, fontSize: 12, color: C.accent, fontWeight: 700 }}>{t.time}</div>
                  <div style={{ fontSize: 16 }}>{t.icon}</div>
                  <div style={{ color: C.mutedLight, fontSize: 13 }}>{t.act}</div>
                </div>
              ))}
            </div>
            <div style={{ ...card({ marginTop: 16, border: `1px solid ${C.amber}40` }) }}>
              <div style={{ fontWeight: 700, color: C.amber, marginBottom: 10 }}>⚡ Итого в день</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { label: "Чистая работа", val: "~6.5 ч" },
                  { label: "Помидоро", val: "~15–16" },
                  { label: "Перерывы", val: "~1.5 ч" },
                  { label: "Коммитов", val: "минимум 1" },
                ].map(x => (
                  <div key={x.label} style={{ textAlign: "center", background: C.surface, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 800, color: C.amber, fontSize: 18 }}>{x.val}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{x.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === "week1" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Неделя 1: Фундамент</div>
              <div style={{ color: C.muted, fontSize: 13 }}>Python · Pandas · Sklearn · CatBoost · SHAP · SQL. Нажми на день → на блок → пошаговые задания.</div>
            </div>
            {renderWeek(WEEK1, 1)}
            <div style={{ ...card({ background: `${C.accentBright}10`, border: `1px solid ${C.accentBright}40`, marginTop: 8 }) }}>
              <div style={{ fontWeight: 700, color: C.accentBright, marginBottom: 10 }}>📦 Итог недели 1</div>
              {["5 ноутбуков на GitHub (pandas, EDA, LogReg, CatBoost+SHAP, feature engineering)", "project0-catboost/ с README — готов для резюме", "SQL: window functions + когортный анализ написаны своими руками", "Понимаешь PR-AUC vs ROC-AUC — объясняешь без шпаргалки", "10 коммитов на GitHub"].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: C.muted }}>
                  <span style={{ color: C.green }}>✓</span> {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "week2" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>Неделя 2: Проекты + MLSD</div>
              <div style={{ color: C.muted, fontSize: 13 }}>Churn · Fraud · MLSD-кейс · GitHub portfolio ready. Нажми на день → на блок.</div>
            </div>
            {renderWeek(WEEK2, 2)}
            <div style={{ ...card({ background: `${C.green}10`, border: `1px solid ${C.green}40`, marginTop: 8 }) }}>
              <div style={{ fontWeight: 700, color: C.green, marginBottom: 10 }}>🏁 Итог 2 недель</div>
              {[
                "3 проекта на GitHub: CatBoost выкуп + Churn + Fraud Detection",
                "SHAP-анализ на всех трёх — умеешь объяснить модель бизнесу",
                "MLSD шаблон (12 блоков) воспроизводишь наизусть",
                "Антифрод-кейс прошла вслух — главный gap Авито закрыт",
                "Batch vs realtime, data drift, canary rollout — объясняешь без шпаргалки",
                "Резюме и LinkedIn обновлены: GitHub-ссылка проставлена везде",
                "~10 часов SQL + 5 дней Python = рука поставлена",
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: C.muted }}>
                  <span style={{ color: C.green }}>✓</span> {t}
                </div>
              ))}
              <div style={{ marginTop: 14, padding: "12px 16px", background: C.accentGlow, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 800, color: C.accentBright, fontSize: 14 }}>Что дальше — неделя 3</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 6, lineHeight: 1.7 }}>Streamlit демо → деплой на HuggingFace → ссылка в резюме. Углубление MLSD (2 кейса устно). Начало активного поиска работы: LinkedIn-пост, первые 10 откликов.</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
