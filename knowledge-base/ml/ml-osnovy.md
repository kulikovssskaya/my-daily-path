---
title: "Machine Learning — Основы"
section: "ML"
tags: ["#ML", "#Analytics", "#Python", "#DataScience", "#DeepLearning", "#scikit-learn", "#PyTorch"]
source: "https://peat-possum-c31.notion.site/ML-caca8dc0d8e94f08831120f6af512357 (ML, ML PART 2, ML part 3)"
imported: "2026-07-03"
updated: "2026-07-03"
status: "template"
---

# Machine Learning — Основы

> `#ML` `#Analytics` `#Python` `#DataScience` `#DeepLearning`
>
> Раздел покрывает полный базовый цикл ML: от типов переменных и разведочного
> анализа данных (EDA) до классификации, регрессии, ансамблей, нейросетей,
> кросс-валидации и подготовки модели к продакшену.

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
- **Типы переменных:** количественные (дискретные / непрерывные) и качественные (номинативные).
- **EDA** — разведочный анализ данных: дубликаты, пропуски, типы, аномалии, корреляции.
- **Три типа задач:** классификация, регрессия, кластеризация.
- **Обучение с учителем / без учителя** (supervised / unsupervised).
- **Метрики:** accuracy, матрица ошибок, MAE и др.
- **Модели:** деревья решений, случайный лес, линейная/логистическая регрессия, нейросети.
- **Переобучение (overfitting)** и способы его контроля: train/valid/test split, кросс-валидация, регуляризация.
- **Продакшн:** сериализация модели, peer review.

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
\( \mu = 0 \) и стандартным отклонением \( \sigma = 1 \). Это самое популярное
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

Два самых распространённых вида обучения:

- **Supervised (с учителем)** — есть целевая переменная.
- **Unsupervised (без учителя)** — целевой переменной нет.

Три основных типа задач (по типу таргета):

| Задача | Тип таргета | Что делает | Пример |
|--------|-------------|-----------|--------|
| **Классификация** | Категория (конечное множество) | Предсказывает класс | Спам / не спам |
| **Регрессия** | Непрерывное число | Прогнозирует величину | Цена квартиры |
| **Кластеризация** | Нет (unsupervised) | Группирует по сходству | Сегментация клиентов |

Классификация бывает **бинарной** (2 класса) и **многоклассовой** (>2 классов).

### 2.6 Классификация и метрики качества

**Train-test split** — перед обучением датасет делят на тренировочную и
тестовую выборки (обычно 70/30 или 80/20).

```python
from sklearn.model_selection import train_test_split

x = df_prepared.drop(columns=["price_category"])
y = df_prepared["price_category"]

x_train, x_test, y_train, y_test = train_test_split(
    x, y, test_size=0.3, random_state=42  # 30% в тест; random_state — воспроизводимость
)
```

**Accuracy** — доля верных предсказаний. **Матрица ошибок (confusion matrix)** —
таблица «предсказано / истинно».

```python
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

accuracy_score(y_test, y_pred)
confusion_matrix(y_test, y_pred)
print(classification_report(y_test, y_pred))  # precision, recall, f1 по классам
```

> ⚠️ При **несбалансированных классах** (например, 500 vs 1000 объектов) accuracy
> обманчива — модель может «угадывать» большинство. Смотрите precision/recall/F1,
> ROC-AUC и балансируйте классы (`class_weight="balanced"`, oversampling/SMOTE).

### 2.7 Деревья решений и случайный лес

**Дерево решений** решает задачи классификации и регрессии.

- **Узел (Node)** — правило (условие).
- **Лист (Leaf)** — ответ (предсказание).
- **Глубина** — максимальное число узлов до листа.

```python
from sklearn.tree import DecisionTreeClassifier

clf = DecisionTreeClassifier(random_state=42)
clf.fit(x_train, y_train)

pred_train = clf.predict(x_train)
pred_test = clf.predict(x_test)

# Важность признаков вместе с названиями, по убыванию
f_imp = sorted(zip(x_train.columns, clf.feature_importances_),
               key=lambda pair: pair[1], reverse=True)
```

**Ансамблевый метод** — несколько моделей обучаются на одной задаче и
объединяются для лучшего результата. **Случайный лес (Random Forest)** — ансамбль
деревьев.

```python
from sklearn.ensemble import RandomForestClassifier

rf = RandomForestClassifier(random_state=42)
rf.fit(x_train, y_train)

print(accuracy_score(y_train, rf.predict(x_train)))
print(accuracy_score(y_test, rf.predict(x_test)))
rf.get_params()  # параметры обучения
```

### 2.8 Тюнинг гиперпараметров

Два самых частых метода подбора гиперпараметров:

- **Grid Search** — полный перебор по сетке значений.
- **Random Search** — случайная выборка комбинаций (быстрее на больших пространствах).

```python
from sklearn.model_selection import GridSearchCV

param_grid = {"max_depth": [3, 5, 10, None], "n_estimators": [100, 300, 500]}
grid = GridSearchCV(RandomForestClassifier(random_state=42),
                    param_grid, cv=5, scoring="f1_macro", n_jobs=-1)
grid.fit(x_train, y_train)
print(grid.best_params_, grid.best_score_)
```

> 💡 В 2025–2026 для тяжёлого тюнинга чаще используют **Optuna** (байесовская
> оптимизация) вместо полного перебора — она находит хорошие гиперпараметры
> за меньшее число итераций.

### 2.9 Линейная регрессия

Алгоритм подбирает коэффициенты \( k \) и \( b \), чтобы приблизить целевую
переменную: \( y = kx + b \). **Ошибка** — расстояние между линией и истинными
значениями таргета на тренировочной выборке.

```python
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

lr = LinearRegression()
lr.fit(train[["age"]], train["charges"])

pred = lr.predict(test[["age"]])
mean_absolute_error(test["charges"], pred)  # MAE
```

**MAE (Mean Absolute Error)** — усреднённая абсолютная разница между предсказанным
и истинным значением.

### 2.10 Логистическая регрессия

Для каждого объекта определяет **вероятность** принадлежности к классу (значение
от 0 до 1). Если вероятность близка к 1 — позитивный класс, если к 0 — негативный.

```python
from sklearn.linear_model import LogisticRegression

train_cols = ["age", "gender"]
lr = LogisticRegression(max_iter=1000)
lr.fit(x_train[train_cols], y_train)

pred = lr.predict(x_test[train_cols])
lr.predict_proba(x_test[train_cols])  # вероятности классов

# Коэффициенты при признаках и свободный член
for col, coef in zip(train_cols, lr.coef_[0]):
    print(f"Коэффициент при {col} = {coef}")
lr.intercept_
```

Настраивается гиперпараметрами регуляризации `penalty` и `C` — они не дают модели
слишком сильно «подстраиваться» под тренировочные данные (борьба с переобучением).

### 2.11 Нейронные сети

- **Функция активации** (например, **сигмоида**): вход нейрона умножается на веса,
  произведения суммируются со свободным членом, к результату применяется активация.
- **Синапсы** — связи (веса) между нейронами. При обучении подбираются «идеальные» веса.
- **Многослойный персептрон (MLP)** — нейросеть прямого распространения минимум из
  трёх слоёв: входной → скрытый → выходной.
- Основные фреймворки: **PyTorch**, **Keras**, более низкоуровневый **TensorFlow**.

Быстрый прототип на scikit-learn:

```python
from sklearn.neural_network import MLPClassifier

mlp = MLPClassifier(random_state=42, max_iter=500,
                    hidden_layer_sizes=(100, 20), activation="tanh")
mlp.fit(x_train, y_train)
mlp.get_params()
mlp.n_layers_
```

Современный эквивалент на **PyTorch 2.x** (для реальных проектов):

```python
import torch
import torch.nn as nn

class MLP(nn.Module):
    def __init__(self, in_features: int, n_classes: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, 100), nn.Tanh(),
            nn.Linear(100, 20), nn.Tanh(),
            nn.Linear(20, n_classes),
        )

    def forward(self, x):
        return self.net(x)

model = MLP(in_features=x_train.shape[1], n_classes=len(y.unique()))
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
criterion = nn.CrossEntropyLoss()  # softmax внутри, логиты на входе
```

### 2.12 Переобучение и кросс-валидация

**Переобучение (overfitting)** — модель отлично работает на тренировке, но плохо
на новых данных.

**Train / Validation / Test split:**

- **Train** — обучение модели.
- **Valid** — разработчик видит её и оценивает качество/подбирает гиперпараметры.
- **Test** — скрыта и от модели, и от разработчика; финальная честная оценка.

**Кросс-валидация** — метод оценки, показывающий, насколько модель стабильна на
разных наборах данных. Если модель переобучилась, метрика будет сильно скакать
от фолда к фолду.

```python
from sklearn.model_selection import cross_validate, cross_val_score

logreg = LogisticRegression(random_state=42, max_iter=1000)

# cv=5 → 5 фолдов, в каждый попадает 20% датасета
cross_validate(logreg, x, y, cv=5, scoring="precision")

scores = cross_val_score(logreg, x, y, cv=5)
print(scores.mean(), scores.std())  # маленький std → метрика стабильна
```

> После кросс-валидации смотрят на **среднее** и **отклонение**. Небольшое
> отклонение = метрика не скачет, модель не переобучается.

### 2.13 Сериализация модели и peer review

**Сериализация** сохраняет обученную модель на диск для дальнейшего использования.

```python
# Классический способ из курса — pickle
import pickle

with open("model.pickle", "wb") as f:
    pickle.dump(tree, f)

with open("model.pickle", "rb") as f:
    model = pickle.load(f)
```

> 💡 Для sklearn-моделей в 2025–2026 предпочтительнее **joblib** (быстрее на
> больших numpy-массивах). Для переносимости между окружениями рассматривайте
> **ONNX** или **skops**. ⚠️ Никогда не загружайте pickle из ненадёжных
> источников — это выполнение произвольного кода.

**Peer review** — процесс, в котором дата-сайентисты и разработчики проводят
ревью кода и исследований друг для друга.

---

## Математическая основа

**Линейная регрессия** — модель и функция потерь MSE:

\[ \hat{y} = kx + b, \qquad \mathrm{MSE} = \frac{1}{n}\sum_{i=1}^{n}\left(y_i - \hat{y}_i\right)^2 \]

**MAE:**

\[ \mathrm{MAE} = \frac{1}{n}\sum_{i=1}^{n}\left|\, y_i - \hat{y}_i \,\right| \]

**Логистическая регрессия** — сигмоида отображает линейную комбинацию в вероятность:

\[ \sigma(z) = \frac{1}{1 + e^{-z}}, \qquad z = \mathbf{w}^\top \mathbf{x} + b \]

**Правило выбросов по IQR** (\( \mathrm{IQR} = Q_3 - Q_1 \)):

\[ x \text{ — выброс}, \;\; \text{если}\;\; x < Q_1 - 1.5\,\mathrm{IQR} \;\; \text{или}\;\; x > Q_3 + 1.5\,\mathrm{IQR} \]

**Правило 3-сигм** (нормальное распределение):

\[ x \text{ — выброс}, \;\; \text{если}\;\; |x - \mu| > 3\sigma \]

**Accuracy** через матрицу ошибок:

\[ \mathrm{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN} \]

---

## Практическая реализация (сквозной пример)

Мини-пайплайн «данные → модель → оценка», объединяющий изученное:

```python
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# 1. Загрузка и базовый EDA
df = pd.read_csv("data.csv")
missing = (df.isna().sum() / len(df) * 100).sort_values()

# 2. Очистка: импутация + удаление неинформативных признаков
df = df.dropna(subset=["target"])              # без таргета строки бесполезны
df["manufacturer"] = df["manufacturer"].fillna("other")

# 3. Разделение на признаки и таргет
x = pd.get_dummies(df.drop(columns=["target"]))
y = df["target"]
x_train, x_test, y_train, y_test = train_test_split(
    x, y, test_size=0.3, random_state=42, stratify=y  # stratify — сохранить баланс классов
)

# 4. Обучение
model = RandomForestClassifier(random_state=42, class_weight="balanced", n_jobs=-1)
model.fit(x_train, y_train)

# 5. Оценка + проверка на переобучение
print("Test accuracy:", accuracy_score(y_test, model.predict(x_test)))
print(classification_report(y_test, model.predict(x_test)))

cv = cross_val_score(model, x, y, cv=5)
print(f"CV: {cv.mean():.3f} ± {cv.std():.3f}")  # стабильность модели
```

---

## Лучшие практики и подводные камни

- ✅ **Всегда фиксируйте `random_state`** для воспроизводимости.
- ✅ **`stratify=y`** в `train_test_split` для несбалансированных классов.
- ✅ Не оценивайте классификацию только по accuracy — используйте precision/recall/F1/ROC-AUC.
- ✅ Масштабируйте признаки (`StandardScaler`) для линейных моделей и нейросетей; деревьям это не нужно.
- ✅ `OneHotEncoder` / `pd.get_dummies` для категориальных признаков (не подавайте текст напрямую).
- ⚠️ **Утечка данных (data leakage):** трансформеры (scaler, encoder) обучайте только на train, применяйте к test. Оборачивайте в `Pipeline`.
- ⚠️ Номинативные числовые коды (регионы, ZIP) — не числа по смыслу, кодируйте как категории.
- ⚠️ Не загружайте `pickle` из недоверенных источников.
- ⚠️ Test-выборку используйте **один раз** в самом конце; подбор гиперпараметров — на valid / через CV.

---

## Связи с другими темами

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
- **Сегментация клиентов:** кластеризация (unsupervised) для маркетинговых кампаний.

---

## История версий

| Дата | Изменение | Источник |
|------|-----------|----------|
| 2026-07-03 | Первичный импорт и переструктурирование разделов ML, ML PART 2, ML part 3 | [Notion: ML](https://peat-possum-c31.notion.site/ML-caca8dc0d8e94f08831120f6af512357) |
