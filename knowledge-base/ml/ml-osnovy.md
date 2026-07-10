---
title: "Machine Learning — Основы"
section: "ML"
summary: "Практический цикл ML: EDA, подготовка данных, обучение моделей, кросс-валидация, тюнинг гиперпараметров и вывод в продакшен."
tags: ["#ML", "#Analytics", "#Python", "#DataScience", "#DeepLearning", "#scikit-learn", "#PyTorch"]
source: "https://peat-possum-c31.notion.site/ML-caca8dc0d8e94f08831120f6af512357 (ML, ML PART 2, ML part 3)"
imported: "2026-07-03"
updated: "2026-07-10"
status: "ready"
---

# Machine Learning — Основы

> `#ML` `#Analytics` `#Python` `#DataScience` `#DeepLearning`
>
> Раздел покрывает практический цикл ML: от EDA и подготовки данных до обучения
> моделей, кросс-валидации и продакшена. Теория алгоритмов — в
> [ML — Алгоритмы и методы](ml-algoritmy-i-metody.md).

## Содержание

1. [Ключевые концепции](#ключевые-концепции)
2. [Подробное объяснение](#подробное-объяснение)
   - [2.1 Переменные и целевая переменная](#21-переменные-и-целевая-переменная)
   - [2.2 Распределения вероятностей](#22-распределения-вероятностей)
   - [2.3 Разведочный анализ данных (EDA)](#23-разведочный-анализ-данных-eda)
   - [2.4 Пропуски, аномалии и выбросы](#24-пропуски-аномалии-и-выбросы)
   - [2.5 Типы задач ML](#25-типы-задач-ml)
   - [2.6 Классификация и метрики качества](#26-классификация-и-метрики-качества)
   - [2.7 Деревья решений и случайный лес](#27-деревья-решений-и-случайный-лес)
   - [2.8 Тюнинг гиперпараметров](#28-тюнинг-гиперпараметров)
   - [2.9 Линейная регрессия](#29-линейная-регрессия)
   - [2.10 Логистическая регрессия](#210-логистическая-регрессия)
   - [2.11 Нейронные сети](#211-нейронные-сети)
   - [2.12 Переобучение и кросс-валидация](#212-переобучение-и-кросс-валидация)
   - [2.13 Сериализация модели и peer review](#213-сериализация-модели-и-peer-review)
3. [Математическая основа](#математическая-основа)
4. [Практическая реализация (сквозной пример)](#практическая-реализация-сквозной-пример)
5. [Лучшие практики и подводные камни](#лучшие-практики-и-подводные-камни)
6. [Связи с другими темами](#связи-с-другими-темами)
7. [Рекомендуемые источники](#рекомендуемые-источники)
8. [Примеры реальных кейсов](#примеры-реальных-кейсов)
9. [История версий](#история-версий)

---

## Ключевые концепции

- **Целевая переменная (таргет)** — зависимая величина, которую модель предсказывает.
- **Признаки (features)** — независимые переменные, описывающие объект.
- **EDA** — разведочный анализ данных: дубликаты, пропуски, типы, аномалии, корреляции.
- **Три типа задач:** классификация, регрессия, кластеризация.
- **Обучение с учителем / без учителя** (supervised / unsupervised).
- **Модели:** деревья решений, случайный лес, линейная/логистическая регрессия, нейросети.
- **Переобучение (overfitting)** и способы контроля: train/valid/test split, кросс-валидация, регуляризация.
- **Продакшн:** сериализация модели, peer review.
- **Теория алгоритмов** (метрики, ансамбли, бустинг, kNN, кластеризация) — в отдельном разделе [ML — Алгоритмы и методы](ml-algoritmy-i-metody.md).

---

## Подробное объяснение

### 2.1 Переменные и целевая переменная

**Целевая переменная** — это зависимая переменная, значение которой требуется
объяснить или предсказать (её также называют *таргетом* или *целевой меткой*).
Она зависима, потому что между признаками объекта и целевым признаком существует
функциональная зависимость.

Переменные делятся на два вида:

| Вид | Подвид | Определение | Пример |
|-----|--------|-------------|--------|
| **Количественные** (численные) | Дискретные | Строго ограниченный список значений | Количество этажей |
| | Непрерывные | Значения, полученные измерением | Скорость автобуса, рост |
| **Качественные** (номинативные) | — | Могут быть числами, но без математического смысла; часто текст | Коды регионов, цвет |

> ⚠️ Номинативные признаки, закодированные числами (например, код региона `77`),
> нельзя усреднять или сравнивать по величине — это частая ошибка новичков.

### 2.2 Распределения вероятностей

**Распределение вероятностей** переменной — функция, показывающая вероятность
появления каждого значения (какие значения мы будем видеть чаще).

**Стандартное нормальное распределение** — нормальное распределение со средним
$\mu = 0$ и стандартным отклонением $\sigma = 1$. Это самое популярное
распределение в статистике и ML.

### 2.3 Разведочный анализ данных (EDA)

**EDA (Exploratory Data Analysis)** — обязательный первый шаг. Проверяем:
дубликаты, пропуски, типы данных, аномальные значения и зависимости
(корреляцию) между признаками.

```python
import missingno as msno  # pip install missingno

# Столбцы, наиболее "проседающие" по заполненности
msno.bar(df)

# Матрица пропусков: чёрное — заполнено, белое — пропуск (NaN/None)
msno.matrix(df)

# Процент пропусков по каждой колонке (по возрастанию)
# isna() строит булеву маску (True там, где NaN/None); sum() считает True
missing_values = (df.isna().sum() / len(df) * 100).sort_values()

# Количество NaN в конкретной колонке (dropna=False учитывает пропуски)
df["county"].value_counts(dropna=False)
```

Работа с типами данных:

```python
df.dtypes                                   # тип каждого столбца
df["weight"] = pd.to_numeric(df["weight"])  # приведение к числу
df["odometer"] = df["odometer"].astype(int) # приведение к int
df["posting_date"] = pd.to_datetime(df["posting_date"], utc=True)  # к дате
```

### 2.4 Пропуски, аномалии и выбросы

Если данных нет, есть два варианта:

- **Импутация** — заполнение пропусков замещающими значениями (среднее, медиана, `"other"`).
- **Удаление** — удаление строки/столбца с пропуском.

```python
df_clean = df.copy()

# Удалить неинформативные столбцы
df_clean = df_clean.drop(columns=["VIN", "condition", "cylinders",
                                  "size", "drive", "paint_color", "type"])

# Импутация категориального признака дефолтным значением
df_clean["manufacturer"] = df_clean["manufacturer"].fillna("other")

# Доля полностью заполненных строк
def print_useful_rows_info(df):
    full = len(df.dropna())
    print("Полностью заполненных объектов:", full)
    print("Процент:", round(full / len(df) * 100, 2))
```

**Выявление выбросов.** Наиболее распространены два статистических метода:

- **Метод 3-сигм** (стандартное отклонение) — ищем точки, далёкие от *среднего*.
- **Метод 1.5 · IQR** (межквартильный размах) — ищем точки, далёкие от *медианы*.

```python
def calculate_outliers(data: pd.Series) -> tuple[float, float]:
    """Границы выбросов по правилу 1.5 * IQR."""
    q25, q75 = data.quantile(0.25), data.quantile(0.75)
    iqr = q75 - q25
    return q25 - 1.5 * iqr, q75 + 1.5 * iqr

low, high = calculate_outliers(df_clean["odometer"])
is_outlier = (df_clean["odometer"] < low) | (df_clean["odometer"] > high)

is_outlier.sum()                       # количество выбросов
is_outlier.sum() / len(df_clean) * 100 # процент выбросов
```

**Чек-лист валидации данных:** пропущенные значения → недопустимые значения →
выбросы → дубликаты → непротиворечивость.

### 2.5 Типы задач ML

> 📘 **Теория алгоритмов** — парадигмы обучения, метрики, линейные модели, ансамбли,
> бустинг, kNN, кластеризация, балансировка классов — в отдельном разделе
> [ML — Алгоритмы и методы](ml-algoritmy-i-metody.md).

Два самых распространённых вида обучения:

- **Supervised (с учителем)** — есть целевая переменная.
- **Unsupervised (без учителя)** — целевой переменной нет.

Три основных типа задач (по типу таргета):

| Задача | Тип таргета | Что делает | Пример |
|--------|-------------|-----------|--------|
| **Классификация** | Категория (конечное множество) | Предсказывает класс | Спам / не спам |
| **Регрессия** | Непрерывное число | Прогнозирует величину | Цена квартиры |
| **Кластеризация** | Нет (unsupervised) | Группирует по сходству | Сегментация клиентов |

Классификация бывает **бинарной** (2 класса) и **многоклассовой** (> 2 классов).

![Три типа задач ML: классификация, регрессия, кластеризация; supervised vs unsupervised](/kb-img/ml-task-types.svg)

### 2.6 Классификация и метрики качества

**Train-test split** — перед обучением датасет делят на тренировочную и
тестовую выборки (обычно 70/30 или 80/20).

```python
from sklearn.model_selection import train_test_split

x = df_prepared.drop(columns=["price_category"])
y = df_prepared["price_category"]

x_train, x_test, y_train, y_test = train_test_split(
    x, y, test_size=0.3, random_state=42
)
```

**Accuracy** — доля верных предсказаний. **Матрица ошибок (confusion matrix)** —
таблица «предсказано / истинно».

```python
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

accuracy_score(y_test, y_pred)
confusion_matrix(y_test, y_pred)
print(classification_report(y_test, y_pred))
```

![Матрица ошибок 2x2: TP, FP, FN, TN и формулы precision, recall, F1](/kb-img/confusion-matrix.svg)

> ⚠️ При **несбалансированных классах** accuracy обманчива. Подробнее о precision,
> recall, F1, ROC-AUC, PR-AUC и балансировке — в [ML — Алгоритмы и методы](ml-algoritmy-i-metody.md#23-метрики-качества).

### 2.7 Деревья решений и случайный лес

**Дерево решений** решает задачи классификации и регрессии.

- **Узел (Node)** — правило (условие).
- **Лист (Leaf)** — ответ (предсказание).
- **Глубина** — максимальное число узлов до листа.

![Дерево решений: узлы с условиями сплита и листья с предсказаниями](/kb-img/decision-tree.svg)

```python
from sklearn.tree import DecisionTreeClassifier

clf = DecisionTreeClassifier(random_state=42)
clf.fit(x_train, y_train)

f_imp = sorted(zip(x_train.columns, clf.feature_importances_),
               key=lambda pair: pair[1], reverse=True)
```

**Случайный лес (Random Forest)** — ансамбль деревьев на bootstrap-подвыборках.

```python
from sklearn.ensemble import RandomForestClassifier

rf = RandomForestClassifier(random_state=42)
rf.fit(x_train, y_train)
print(accuracy_score(y_test, rf.predict(x_test)))
```

![Bagging (Random Forest) vs Boosting: параллельное усреднение vs последовательное исправление ошибок](/kb-img/bagging-boosting.svg)

> Подробнее о критериях сплита, bagging, boosting, stacking и bias–variance —
> [ML — Алгоритмы и методы](ml-algoritmy-i-metody.md#25-деревья-решений).

### 2.8 Тюнинг гиперпараметров

- **Grid Search** — полный перебор по сетке значений.
- **Random Search** — случайная выборка комбинаций.
- **Optuna** — байесовская оптимизация (2025–2026).

```python
from sklearn.model_selection import GridSearchCV

param_grid = {"max_depth": [3, 5, 10, None], "n_estimators": [100, 300, 500]}
grid = GridSearchCV(RandomForestClassifier(random_state=42),
                    param_grid, cv=5, scoring="f1_macro", n_jobs=-1)
grid.fit(x_train, y_train)
print(grid.best_params_, grid.best_score_)
```

### 2.9 Линейная регрессия

Краткий практический пример. Теория линейных моделей, log loss и регуляризация —
[ML — Алгоритмы и методы](ml-algoritmy-i-metody.md#24-линейные-модели).

```python
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

lr = LinearRegression()
lr.fit(train[["age"]], train["charges"])
mean_absolute_error(test["charges"], lr.predict(test[["age"]]))
```

### 2.10 Логистическая регрессия

```python
from sklearn.linear_model import LogisticRegression

lr = LogisticRegression(max_iter=1000)
lr.fit(x_train[["age", "gender"]], y_train)
lr.predict_proba(x_test[["age", "gender"]])
```

### 2.11 Нейронные сети

- **Функция активации** (ReLU, sigmoid, tanh) — нелинейное преобразование после взвешенной суммы входов.
- **Веса и смещения** — обучаемые параметры, подбираются градиентным спуском (backpropagation).
- **MLP** — многослойный персептрон: входной → скрытые → выходной слой.
- Фреймворки: **PyTorch**, **Keras / TensorFlow**.

![Полносвязная нейросеть: входной, скрытые и выходной слои с весами](/kb-img/neural-network.svg)

```python
from sklearn.neural_network import MLPClassifier

mlp = MLPClassifier(random_state=42, max_iter=500,
                    hidden_layer_sizes=(100, 20), activation="relu")
mlp.fit(X_train, y_train)
```

Современный эквивалент на **PyTorch 2.x**:

```python
import torch
import torch.nn as nn

class MLP(nn.Module):
    def __init__(self, in_features: int, n_classes: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, 100), nn.ReLU(),
            nn.Linear(100, 20), nn.ReLU(),
            nn.Linear(20, n_classes),
        )

    def forward(self, x):
        return self.net(x)

model = MLP(in_features=X_train.shape[1], n_classes=y.nunique())
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
criterion = nn.CrossEntropyLoss()
```

### 2.12 Переобучение и кросс-валидация

**Переобучение (overfitting)** — модель запоминает тренировочные данные и плохо
обобщает на новые.

![Компромисс bias-variance: оптимум между недообучением и переобучением](/kb-img/bias-variance.svg)

#### Как бороться с переобучением

| Способ | Описание |
|--------|----------|
| **Регуляризация** | L1/L2, dropout, `max_depth` в деревьях |
| **Упрощение модели** | Меньше признаков, меньше параметров |
| **Больше данных** | Сбор новых примеров |
| **Аугментация** | Искусственное расширение выборки (повороты изображений, шум, SMOTE для таблиц) |

**Train / Validation / Test split:**

- **Train** — обучение модели.
- **Valid** — подбор гиперпараметров, ранняя остановка.
- **Test** — финальная оценка **один раз** в конце проекта.

#### Кросс-валидация

Разбивает данные на несколько фолдов и даёт **более честную и стабильную** оценку,
чем один train/test split. Особенно полезна при **малом объёме данных** и
**нестабильных выборках**.

![K-fold cross-validation: каждый фолд по очереди служит валидацией](/kb-img/cross-validation.svg)

| Вид CV | Когда использовать |
|--------|-------------------|
| **K-Fold** | Стандартный случай, $k = 5$ или $10$ |
| **Stratified K-Fold** | Несбалансированные классы — сохраняет доли классов в каждом фолде |
| **Leave-One-Out (LOO)** | Очень мало данных: $n$ фолдов по 1 объекту в тесте |
| **TimeSeriesSplit** | Временные ряды — тест всегда «в будущем» относительно train |

> Подробнее о видах CV (stratified, LOO, TimeSeriesSplit) —
> [ML — Алгоритмы и методы](ml-algoritmy-i-metody.md#212-кросс-валидация).

```python
from sklearn.model_selection import (train_test_split, cross_val_score,
                                     StratifiedKFold, TimeSeriesSplit)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
scores = cross_val_score(pipe, X, y, cv=cv, scoring="f1_macro")
print(f"CV: {scores.mean():.3f} ± {scores.std():.3f}")

tscv = TimeSeriesSplit(n_splits=5)
```

> Смотрите на **среднее** и **стандартное отклонение** метрики по фолдам.
> Высокий разброс — признак нестабильности или переобучения.

### 2.13 Сериализация модели и peer review

**Сериализация** сохраняет обученную модель на диск для повторного использования без переобучения.

```python
import joblib

joblib.dump(pipe, "model.joblib")
model = joblib.load("model.joblib")
```

> 💡 **joblib** быстрее pickle на больших numpy-массивах. Для переносимости —
> **ONNX** или **skops**. ⚠️ Не загружайте pickle/joblib из ненадёжных источников.

**Peer review** — взаимная проверка кода, экспериментов и выводов внутри команды.

---

## Математическая основа

**Линейная регрессия** — модель и функция потерь MSE:

$$
\hat{y} = kx + b, \qquad \mathrm{MSE} = \frac{1}{n}\sum_{i=1}^{n}\left(y_i - \hat{y}_i\right)^2
$$

**MAE:**

$$
\mathrm{MAE} = \frac{1}{n}\sum_{i=1}^{n}\left|\, y_i - \hat{y}_i \,\right|
$$

**Логистическая регрессия** — сигмоида:

$$
\sigma(z) = \frac{1}{1 + e^{-z}}, \qquad z = \mathbf{w}^\top \mathbf{x} + b
$$

> Формулы метрик, Gini, энтропии, bias–variance — в [ML — Алгоритмы и методы](ml-algoritmy-i-metody.md#математическая-основа).

**Accuracy** через матрицу ошибок:

$$
\mathrm{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN}
$$

---

## Практическая реализация (сквозной пример)

Пайплайн без утечки данных: препроцессинг внутри `Pipeline`, обучение только на train.

![ML-пайплайн: ColumnTransformer + Pipeline, fit на train, predict на test](/kb-img/ml-pipeline.svg)

```python
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

df = pd.read_csv("data.csv")
X = df.drop(columns=["target"])
y = df["target"]

num_cols = X.select_dtypes("number").columns.tolist()
cat_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()

preprocess = ColumnTransformer([
    ("num", Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ]), num_cols),
    ("cat", Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ]), cat_cols),
])

pipe = Pipeline([
    ("preprocess", preprocess),
    ("clf", RandomForestClassifier(random_state=42, class_weight="balanced", n_jobs=-1)),
])

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y
)

pipe.fit(X_train, y_train)
print(classification_report(y_test, pipe.predict(X_test)))

cv = cross_val_score(pipe, X, y, cv=5, scoring="f1_macro")
print(f"CV F1: {cv.mean():.3f} ± {cv.std():.3f}")

joblib.dump(pipe, "rf_pipeline.joblib")
```

### Тюнинг гиперпараметров (Optuna)

```python
import optuna
from sklearn.model_selection import cross_val_score

def objective(trial):
    params = {
        "clf__n_estimators": trial.suggest_int("n_estimators", 50, 300),
        "clf__max_depth": trial.suggest_int("max_depth", 3, 20),
    }
    pipe.set_params(**params)
    return cross_val_score(pipe, X_train, y_train, cv=3, scoring="f1_macro").mean()

study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=30)
pipe.set_params(**{f"clf__{k}": v for k, v in study.best_params.items()})
```

---

## Лучшие практики и подводные камни

- ✅ **Всегда фиксируйте `random_state`** для воспроизводимости.
- ✅ **`stratify=y`** в `train_test_split` для несбалансированных классов.
- ✅ Не оценивайте классификацию только по accuracy — используйте precision/recall/F1/ROC-AUC.
- ✅ Масштабируйте признаки (`StandardScaler`) для линейных моделей и нейросетей; деревьям это не нужно.
- ✅ Используйте **`Pipeline` + `ColumnTransformer`** — препроцессинг только на train.
- ✅ **`OneHotEncoder`** внутри пайплайна, не `get_dummies` до split (утечка).
- ✅ Для табличных данных 2025–2026: **LightGBM / CatBoost** часто сильнее RF.
- ✅ Объяснимость: **SHAP** (`TreeExplainer` для бустинга).
- ⚠️ **Утечка данных (data leakage):** трансформеры (scaler, encoder) обучайте только на train, применяйте к test. Оборачивайте в `Pipeline`.
- ⚠️ Номинативные числовые коды (регионы, ZIP) — не числа по смыслу, кодируйте как категории.
- ⚠️ Не загружайте `pickle` из недоверенных источников.
- ⚠️ Test-выборку используйте **один раз** в самом конце; подбор гиперпараметров — на valid / через CV.

---

## Связи с другими темами

- [ML — Алгоритмы и методы](ml-algoritmy-i-metody.md) — теория: метрики, ансамбли, бустинг, kNN, кластеризация. `#ML`
- [Pandas](../pandas/) — подготовка и очистка данных для всех примеров выше. `#Pandas`
- [Matplotlib](../matplotlib/) — визуализация распределений, матрицы ошибок, важности признаков. `#Matplotlib`
- [Алгоритмы](../algorithms/) — структуры данных за деревьями решений. `#Algorithms`
- [Modeling](../modeling/) — углублённое моделирование и продвинутые метрики. `#Modeling`
- [Deployment](../deployment/) — вывод сериализованной модели в продакшн. `#Deployment` `#MLOps`

---

## Рекомендуемые источники

- 📓 [Colab-ноутбук курса: Grid/Random Search](https://colab.research.google.com/drive/170RUJhhOe-ciC8BkLeOibAO4YEDmexkp) _(из исходного материала)_
- 📘 [scikit-learn User Guide](https://scikit-learn.org/stable/user_guide.html)
- 📘 [PyTorch 2.x Documentation](https://pytorch.org/docs/stable/index.html)
- 📗 Aurélien Géron, «Hands-On Machine Learning with Scikit-Learn, Keras & TensorFlow» (3rd ed.)
- 🔧 [Optuna — Hyperparameter Optimization](https://optuna.org/)
- 🔧 [missingno — визуализация пропусков](https://github.com/ResidentMario/missingno)

---

## Примеры реальных кейсов

- **Кредитный скоринг:** логистическая регрессия / случайный лес предсказывают
  вероятность дефолта; класс-дисбаланс критичен → упор на recall и ROC-AUC.
- **Прогноз цены авто/недвижимости:** линейная регрессия и градиентный бустинг;
  MAE как понятная бизнесу метрика ошибки в рублях.
- **Отток клиентов (churn):** классификация с `class_weight="balanced"`; feature
  importance подсказывает, какие факторы удерживают клиента.
- **Сегментация клиентов:** K-Means / DBSCAN для маркетинговых кампаний.
- **Поиск мошенничества:** kNN или изоляционный лес по «отдалённым» транзакциям.
- **Табличный бенчмарк:** LightGBM / CatBoost vs логистическая регрессия как baseline.

---

## История версий

| Дата | Изменение | Источник |
|------|-----------|----------|
| 2026-07-03 | Первичный импорт и переструктурирование разделов ML, ML PART 2, ML part 3 | [Notion: ML](https://peat-possum-c31.notion.site/ML-caca8dc0d8e94f08831120f6af512357) |
| 2026-07-03 | Актуализация: Pipeline+ColumnTransformer, Optuna, joblib, ml-pipeline.svg | Редакция KB |
| 2026-07-10 | Теория алгоритмов вынесена в ml-algoritmy-i-metody.md | Редакция KB |
