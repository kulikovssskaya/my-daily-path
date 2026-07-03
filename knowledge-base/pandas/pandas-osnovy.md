---
title: "Pandas — Основы"
section: "Pandas"
summary: "Работа с данными в Pandas: DataFrame и Series, чтение CSV/Excel/JSON, индексация loc/iloc, статистики, объединение таблиц (concat/merge), apply и lambda, кодирование категорий (OneHot) и масштабирование (StandardScaler)."
tags: ["#Python", "#Pandas", "#Analytics", "#DataScience", "#scikit-learn"]
source: "https://peat-possum-c31.notion.site/Pandas-0ddba042bbd8453aa941c2ff4ba7f2eb"
imported: "2026-07-03"
updated: "2026-07-03"
status: "ready"
---

# Pandas — Основы

> `#Pandas` `#Python` `#Analytics` `#DataScience`
>
> Основной инструмент табличного анализа данных: загрузка, индексация,
> статистики, объединение таблиц, преобразование признаков.

## Ключевые концепции

- **DataFrame** — двумерная таблица (матрица) с именованными колонками.
- **Series** — маркированная одномерная структура (столбец) с произвольными метками-индексами.
- **Чтение данных:** `read_csv`, `read_excel`, `read_json`.
- **Индексация:** `.loc` (по именам), `.iloc` (по позициям).
- **Объединение:** `concat`, `merge` (inner/outer).
- **Преобразование признаков:** `apply` + lambda, One-Hot, стандартизация.

## Подробное объяснение

### Создание DataFrame и Series

```python
import pandas as pd

# Из списка списков
data = [["Tomsk", 70], ["Omsk", 55]]
df = pd.DataFrame(data, columns=["city", "code"])

# Из списка словарей
df = pd.DataFrame([{"city": "Tomsk", "code": 70},
                   {"city": "Omsk", "code": 55}])

# Из Series
df = pd.DataFrame({"city": pd.Series(["Tomsk", "Omsk"]),
                   "code": pd.Series([70, 55])})

df["city"]                              # обращение к столбцу
s = pd.Series(["Tomsk", "Omsk"], name="city")  # объект Series
```

![Структура Pandas DataFrame: строки (index), столбцы (features), методы .iloc и .loc](/kb-img/dataframe.svg)

> **Series** — таблица с одной «строкой»/столбцом; к элементам обращаются по меткам, которыми могут быть не только числа, но и произвольные имена.

### Чтение файлов

```python
# CSV (sep — разделитель, index_col — колонка индекса)
df = pd.read_csv("partner_data.csv", sep=";", index_col="id")

# Excel (header — строка заголовков, sheet_name — лист)
df = pd.read_excel("partner_data.xlsx", sheet_name="partner_data1",
                   header=0, index_col="id")

# JSON
import json
with open("data.json", "r", encoding="utf-8") as j:
    contents = json.load(j)

df = pd.read_json("data.json")
df = df.set_index("id")            # предпочтительнее inplace=False (pandas 2.x)
pd.read_parquet("data.parquet")    # стандартный формат обмена в 2025–2026
df.to_parquet("out.parquet", index=False)
```

### Обзор датафрейма

```python
df.shape       # (строки, столбцы)
df.columns     # названия колонок
df.index       # значения индекса
df.head(10)    # первые 10 строк
df.tail(10)    # последние 10 строк
```

### Индексация: `.iloc` и `.loc`

```python
# По позициям (.iloc)
df.iloc[0, 0]        # элемент [0, 0]
df.iloc[0:3, 0]      # строки 0,1,2 столбца 0
df.iloc[:, 0]        # весь столбец 0
df.iloc[0, :]        # вся строка 0

# По именам (.loc) — обе границы диапазона включаются
df.loc[1, "age"]                       # строка id=1, столбец age
df.loc[5:6, "marital":"education"]     # диапазон строк и столбцов
df.loc[[5, 10], ["marital", "default"]]  # списки строк/столбцов

df["age"]                # один столбец (Series)
df[["age", "marital"]]   # несколько столбцов (DataFrame)
```

### Статистики и пропуски

```python
df["marital"].isna()                 # маска пропусков
df[df["marital"].isna()]             # строки с пропуском в marital
df[df["age"].isna() & df["marital"].isna()]  # несколько условий

df.describe()                # описательные статистики (числовые колонки)
df.info()                    # типы и заполненность
df["balance"].min()          # либо df.balance.min()
df.max(numeric_only=True)    # максимум только по числовым
df.max(axis=1)               # максимум для каждой строки (axis=1 == 'columns')
df.mean(); df.median(); df.mode()

df["balance"].value_counts()   # частоты значений
df["marital"].nunique()        # число уникальных
df["marital"].unique()         # сами уникальные значения
df.duplicated()                # маска дубликатов
df.drop_duplicates()           # удалить дубликаты
```

### Объединение датафреймов

```python
pd.concat([df1, df2])            # снизу (axis=0)
pd.concat([df1, df2], axis=1)    # справа (axis=1)

pd.merge(left=df1, right=df2, on="id", how="inner")  # пересечение
pd.merge(left=df1, right=df2, on="id", how="outer")  # объединение

df = df.reset_index()   # индекс -> обычный столбец
```

Логика соединения:

| Метод | Что делает |
|-------|-----------|
| `concat(axis=0)` | присоединяет таблицу снизу |
| `concat(axis=1)` | присоединяет таблицу справа |
| `merge(how="inner")` | пересечение по ключу |
| `merge(how="left")` | все строки левой таблицы + совпадения справа |
| `merge(how="right")` | все строки правой таблицы + совпадения слева |
| `merge(how="outer")` | объединение всех строк |

![Типы join в pd.merge: inner, left, right, outer](/kb-img/merge-joins.svg)

> ⚠️ Метод `df.append()` **удалён в pandas 2.x** — используйте `pd.concat([df1, df2], ignore_index=True)`.

### Преобразование столбцов, `apply` и lambda

```python
df["new"] = df["col"].astype(int)               # смена типа
df = df.rename(columns={"col1": "col3"})        # переименование
df[df["Column1"].str.contains("a[a-z]+")]       # фильтр по регулярке

# lambda-функции
df["odometer"].apply(lambda x: x ** 2)
df.apply(lambda row: row["odometer"] ** 2, axis=1)  # axis=1 — по строкам
df["region"].apply(lambda x: x.lower())
df["region_corrected"] = df["region"].apply(
    lambda x: x.lower().split("/")[0].replace(" ", "").replace("-", "")
)
df.apply(lambda r: ": ".join([r["manufacturer"], r["model"]]), axis=1)
```

## Практическая реализация: подготовка признаков

### One-Hot кодирование категорий

One-Hot — представление категориальных переменных двоичными векторами (через `scikit-learn`).

```python
from sklearn.preprocessing import OneHotEncoder

# sklearn >= 1.2: параметр называется sparse_output (раньше sparse)
ohe = OneHotEncoder(sparse_output=False)
ohe.fit(df[["fuel"]])                 # определить параметры преобразования
ohe_fuel = ohe.transform(df[["fuel"]])
ohe.categories_                       # какие категории закодированы
ohe.inverse_transform(ohe_fuel)       # обратное преобразование
```

### Нормализация и стандартизация

**Нормализация (Min-Max scaling)** — линейное приведение признака к заданному диапазону (обычно `[0, 1]`). **Не делает** распределение нормальным — для этого нужны другие преобразования (логарифм, Box-Cox, Yeo-Johnson).

**Стандартизация (Z-масштабирование)** — вычесть среднее и поделить на стандартное отклонение; результат имеет $\mu \approx 0$, $\sigma \approx 1$.

```python
from sklearn.preprocessing import StandardScaler, MinMaxScaler

std_scaler = StandardScaler()
X_std = std_scaler.fit_transform(df[["odometer", "price"]])

minmax = MinMaxScaler()
X_mm = minmax.fit_transform(df[["odometer", "price"]])
```

## Математическая основа

**Z-масштабирование (стандартизация):**

$$
z = \frac{x - \mu}{\sigma}
$$

где $\mu$ — среднее признака, $\sigma$ — стандартное отклонение (корень из дисперсии).

## Лучшие практики и подводные камни

- ⚠️ `df.append` удалён в pandas 2.x → `pd.concat`.
- ⚠️ `OneHotEncoder(sparse=...)` переименован в `sparse_output` (sklearn ≥ 1.2).
- ⚠️ `.loc` включает **обе** границы диапазона, `.iloc` — правую границу **исключает**.
- ✅ Обучайте `StandardScaler`/`OneHotEncoder` только на train, применяйте к test (избегайте утечки данных).
- ✅ Сильно зависимые (коллинеарные) признаки могут вести к переобучению — проверяйте корреляции.
- ✅ Указывайте `encoding` при чтении файлов в нестандартных кодировках (`cp1251`).
- 💡 Для очень больших данных рассмотрите **Polars** (ленивые запросы, Parquet).

## Связи с другими темами

- [Python — Основы](../python/python-osnovy.md) — базовые структуры под капотом. `#Python`
- [Matplotlib](../matplotlib/matplotlib-osnovy.md) — визуализация датафреймов. `#Matplotlib`
- [Machine Learning — Основы](../ml/ml-osnovy.md) — подготовка данных для моделей (EDA, кодирование, масштабирование). `#ML`

## Рекомендуемые источники

- 📘 [Pandas User Guide](https://pandas.pydata.org/docs/user_guide/index.html)
- 📘 [scikit-learn Preprocessing](https://scikit-learn.org/stable/modules/preprocessing.html)

## Примеры реальных кейсов

- **EDA продаж авто:** чтение CSV, `describe`/`value_counts`, поиск пропусков, удаление дубликатов.
- **Объединение источников:** `merge` витрины клиентов с транзакциями по `id`.
- **Feature engineering:** нормализация числовых и One-Hot категориальных признаков перед обучением модели.

## История версий

| Дата | Изменение | Источник |
|------|-----------|----------|
| 2026-07-03 | Первичный импорт и переструктурирование раздела Pandas | [Notion: Pandas](https://peat-possum-c31.notion.site/Pandas-0ddba042bbd8453aa941c2ff4ba7f2eb) |
| 2026-07-03 | Актуализация: join-диаграмма, MinMaxScaler, Parquet, Polars, исправление нормализации | Редакция KB |
