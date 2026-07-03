---
title: "Matplotlib — Визуализация данных"
section: "Matplotlib"
summary: "Визуализация данных в Matplotlib: выбор типа диаграммы, гистограммы и box plot для распределений и выбросов, столбчатые/круговые диаграммы для категорий, scatter и heatmap для корреляций, коэффициент Пирсона."
tags: ["#Python", "#Matplotlib", "#Analytics", "#DataViz", "#DataScience"]
source: "https://peat-possum-c31.notion.site/Matplotlib-2198b85aafc080f7899dcc6a5125203a"
imported: "2026-07-03"
updated: "2026-07-03"
status: "ready"
---

# Matplotlib — Визуализация данных

> `#Matplotlib` `#Python` `#DataViz` `#Analytics`
>
> Построение графиков для разведочного анализа: распределения, выбросы,
> сравнение категорий и поиск зависимостей.

## Ключевые концепции

- **Выбор типа диаграммы** под тип данных (категориальные / числовые).
- **Гистограмма** и **box plot** — распределения и выбросы.
- **Столбчатая** и **круговая** диаграммы — категориальные данные.
- **Scatter plot** и **heatmap** — зависимости и корреляции.
- **Коэффициент корреляции Пирсона** — сила линейной связи.
- Принцип **KISS** (Keep It Simple, Stupid) — простота важнее сложности.

## Подробное объяснение

### Какой график выбрать

- **Категориальные данные** → столбчатые (гистограммы) или круговые диаграммы.
- **Числовые данные** → линейные графики или точечные (scatter) диаграммы.

![Выбор типа диаграммы: категориальные, числовые, связи и best practices](/kb-img/chart-types.svg)

> Круговые диаграммы малоинформативны (сложно сравнить похожие секторы). Их
> уместно применять для сравнения двух групп; в остальных случаях лучше
> столбчатые.

### Гистограмма (распределение числовых переменных)

```python
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.ticker import FormatStrFormatter

plt.figure(figsize=(8, 5))              # (ширина, высота) в дюймах
plt.hist(df.odometer, bins=15, color="green")  # bins — число интервалов (по умолчанию 10)
plt.xlabel("Количество пройденных миль")   # подпись оси X
plt.ylabel("Частота")                       # подпись оси Y
plt.title("Распределение пробега")          # заголовок
plt.show()
```

### Box plot («ящик с усами») для выбросов

Для выявления аномалий полезны гистограмма и box plot. «Ящик» — от Q1 до Q3 (IQR),
медиана внутри ящика. **Усы** по умолчанию в matplotlib — до `Q1 − 1.5×IQR` и
`Q3 + 1.5×IQR`; точки за усами — выбросы (не обязательно min/max всего ряда).

![Анатомия box plot: квартили Q1/Q3, медиана, усы и выбросы](/kb-img/boxplot.svg)

```python
fig, ax = plt.subplots(figsize=(8, 5))
ax.boxplot(df.odometer)
ax.set_ylabel("Пробег")
ax.xaxis.set_major_formatter(FormatStrFormatter("%.0f"))
```

### Несколько графиков в одной фигуре (`subplots`)

```python
# Два графика рядом (1 строка, 2 столбца), общая ось Y
fig, (ax1, ax2) = plt.subplots(nrows=1, ncols=2, figsize=(8, 12), sharey=True)
ax1.boxplot(df.odometer)
ax2.boxplot(df_with_out.odometer)

# Гистограмма + box plot друг под другом, общая ось X
fig, (ax1, ax2) = plt.subplots(nrows=2, ncols=1, figsize=(20, 10), sharex=True)
ax1.hist(df_with_out.odometer, bins=100, color="orange")
ax2.boxplot(df_with_out.odometer, vert=False)   # горизонтальный box plot

# Медианная линия на гистограмме
ax1.axvline(df_with_out.odometer.median(), color="red",
            linestyle="dashed", linewidth=1)
```

### Категориальные переменные

```python
# Группировка и агрегация
stats = df.groupby(["year", "price_category"]).agg(
    {"fuel": "first", "odometer": "mean"}
)
stats = stats.rename(columns={"fuel": "fuel_first", "odometer": "odometer_mean"})

# Столбец как обычная колонка (не индекс) — as_index=False
stats = df.groupby(["fuel"], as_index=False)[["id"]].count()

# Столбчатая диаграмма
plt.bar(stats["fuel"], stats["count"], color=["orange", "red", "green"])

# Круговая диаграмма с процентами
plt.pie(stats["count"], labels=stats["fuel"], autopct="%1.0f%%")
```

### Корреляции и зависимости

```python
# Наложение гистограмм по категориям цены
colors = {"low": "green", "medium": "orange", "high": "red"}
fig, ax = plt.subplots(figsize=(12, 8))
for price_category, color in colors.items():
    data = df[df["price_category"] == price_category]
    ax.hist(data["odometer"], bins=20, color=color, alpha=0.7)

# Диаграмма рассеивания (scatter)
plt.scatter(df["odometer"], df["year"])

# Scatter с раскраской по категориям
fig, ax = plt.subplots(figsize=(12, 8))
for price_category, color in colors.items():
    data = df[df["price_category"] == price_category]
    ax.scatter(data["odometer"], data["year"], c=color, label=price_category)
ax.legend()

# Корреляция Пирсона между двумя показателями
df["year"].corr(df["odometer"])

# Тепловая карта корреляций
import seaborn as sns
sns.heatmap(df.corr(numeric_only=True), annot=True, cmap="coolwarm", vmin=-1, vmax=1)
```

### Seaborn — современная визуализация (2025–2026)

```python
import seaborn as sns

# Распределение с KDE
sns.histplot(df["odometer"], kde=True)

# Box plot по категориям
sns.boxplot(data=df, x="fuel", y="odometer")

# Pairplot для быстрого EDA
sns.pairplot(df[["odometer", "year", "price"]].dropna(), diag_kind="kde")
```

## Математическая основа

**Коэффициент корреляции Пирсона** измеряет силу и направление линейной связи:

$$
r = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2}\,\sqrt{\sum (y_i - \bar{y})^2}}
$$

$r \in [-1, 1]$: $-1$ — отрицательная связь, $1$ — положительная, $0$ — линейной зависимости нет.

Ориентиры (эвристика Cohen): $|r| \approx 0.1$ — слабая, $0.3$ — умеренная,
$0.5$ — заметная, $0.7$ и выше — сильная линейная связь (зависит от предметной области).

> ⚠️ Пирсон улавливает только **линейную** связь. Если зависимость нелинейная
> (полином и т.п.), коэффициент не сработает — проверяйте визуализацией.

## Лучшие практики и подводные камни

- ✅ Принцип **KISS**: простой график читается лучше перегруженного.
- ✅ Подписывайте оси и заголовок (`xlabel`, `ylabel`, `title`).
- ✅ Для распределений — гистограмма + box plot вместе.
- ⚠️ Избегайте круговых диаграмм при большом числе похожих секторов.
- ⚠️ Пирсон не видит нелинейных связей — дополняйте scatter-графиком.
- 💡 `alpha` (прозрачность) помогает при наложении множества точек/гистограмм.

## Связи с другими темами

- [Pandas](../pandas/pandas-osnovy.md) — источник данных (`groupby`, `corr`). `#Pandas`
- [Python — Основы](../python/python-osnovy.md) — базис. `#Python`
- [Machine Learning — Основы](../ml/ml-osnovy.md) — визуализация в EDA, матрица ошибок, важность признаков. `#ML`

## Рекомендуемые источники

- 📘 [Matplotlib Documentation](https://matplotlib.org/stable/index.html)
- 📘 [Matplotlib Pyplot Tutorial](https://matplotlib.org/stable/tutorials/pyplot.html)

## Примеры реальных кейсов

- **Поиск выбросов пробега:** гистограмма + box plot до и после очистки.
- **Структура парка авто:** столбчатая диаграмма по типу топлива.
- **Матрица корреляций:** heatmap для отбора признаков перед моделированием.

## История версий

| Дата | Изменение | Источник |
|------|-----------|----------|
| 2026-07-03 | Первичный импорт и переструктурирование раздела Matplotlib | [Notion: Matplotlib](https://peat-possum-c31.notion.site/Matplotlib-2198b85aafc080f7899dcc6a5125203a) |
| 2026-07-03 | Актуализация: box plot IQR, seaborn, Cohen r, исправлен ax | Редакция KB |
