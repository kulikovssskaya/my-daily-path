---
title: "Маркетинговая аналитика — метрики и когорты"
section: "Marketing"
summary: "Метрики продукта и маркетинга: DAU/WAU/MAU, CCU/PCCU, Sticky Factor, Retention и Churn, ARPU/ARPPU, LTV, ROI, воронка AIDA и KPI, а также практический когортный анализ на pandas + seaborn."
tags: ["#Marketing", "#Analytics", "#ProductMetrics", "#Python", "#pandas"]
source: "https://peat-possum-c31.notion.site/Marketing-24c8b85aafc080a2a1abeb5f17066d2f"
imported: "2026-07-03"
updated: "2026-07-03"
status: "ready"
---

# Маркетинговая аналитика — метрики и когорты

> `#Marketing` `#Analytics` `#ProductMetrics` `#Python`
>
> Ключевые продуктовые/маркетинговые метрики и когортный анализ удержания.

## Ключевые концепции

- **Активность:** DAU / WAU / MAU, CCU / PCCU, Sticky Factor.
- **Удержание:** Retention Rate (CRR) и Churn Rate.
- **Деньги:** ARPU, ARPPU, LTV, ROI.
- **Воронка:** AIDA; управление через KPI.
- **Когортный анализ** удержания.

## Подробное объяснение

### Метрики активности

- **DAU / WAU / MAU** — дневная / недельная / месячная активность.
- **CCU (concurrent users)** — пользователи в приложении в конкретный момент.
- **PCCU (peak concurrent users)** — пик одновременных пользователей.
- **Sticky Factor** — коэффициент «липкости»: насколько регулярно пользуются
  приложением в течение недели/месяца (часто $\text{DAU}/\text{MAU}$).

### Удержание и отток

**Retention Rate (CRR)** — показатель удержания:

$$\text{CRR} = \frac{CE - CN}{CS} \times 100\%$$

где $CE$ — клиентов на конец периода, $CN$ — новых клиентов за период, $CS$ —
клиентов на начало периода.

**Churn Rate** — отток. Если CRR выражен в **процентах** (как в формуле выше),
то $\text{Churn} = 100\% - \text{CRR}$. В долях: $\text{churn} = 1 - \text{CRR}/100$.

**NRR (Net Revenue Retention)** — удержание выручки с учётом апсейла и даунгрейда
(важно для SaaS): $\text{NRR} = \frac{\text{MRR}_{\text{конец}} - \text{новый MRR}}{\text{MRR}_{\text{начало}}} \times 100\%$.

**CAC (Customer Acquisition Cost)** — стоимость привлечения клиента:
$\text{CAC} = \frac{\text{маркетинговые затраты}}{\text{число новых клиентов}}$.
Сравнивают с LTV: здоровое соотношение LTV/CAC часто > 3.

### Денежные метрики

**ARPU** (средний доход на пользователя) — двумя способами:

$$\text{ARPU} = \frac{\text{Gross (чистый доход)}}{\text{Active Users}} \qquad \text{или} \qquad \text{ARPU} = \text{ARPPU} \times \text{Paying Share}$$

**LTV / CLV** (Lifetime Value) — средний доход с одного пользователя за всё время:

$$\text{LTV} = \text{ARPU} \times \text{Lifetime} \qquad \text{LTV} = \text{AOV} \times \text{RPR} \times \text{Lifetime}$$

где $\text{AOV}$ — средний чек, $\text{RPR}$ — частота повторных покупок.

**ROI (Return on Investment)** — коэффициент рентабельности (окупаемости) вложений.

### Воронка и процесс

- **AIDA** (Attention, Interest, Desire, Action) — основа классической воронки продаж.
- **KPI (Key Performance Indicator)** — ключевые показатели эффективности.

![Воронка AIDA: Awareness, Interest, Desire, Action и связанные метрики](/kb-img/aida-funnel.svg)

**Алгоритм работы маркетингового аналитика:**
1. Сформировать KPI и увязать с метриками.
2. Разбить KPI на понятные задачи.
3. Ревизия систем аналитики (внедрить новые, донастроить старые).
4. Анализ по каждому источнику.
5. Гипотезы о новых источниках и оценка затрат.
6. Внедрение новых каналов / изменений.
7. Расчёты и сравнение с предыдущими периодами.
8. Рекомендации → внедрение → оценка результатов.

## Практическая реализация: когортный анализ

![Кривые retention по когортам: удержание пользователей по неделям после регистрации](/kb-img/retention-curve.svg)

```python
import pandas as pd
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
import datetime as dt

# Месяц/год по дате (день заменяем на 1)
def get_month(x):
    return dt.datetime(x.year, x.month, 1)

# Месяц первой транзакции пользователя = его когорта
data["cohortMonth"] = data.groupby("user_id")["month_year"].transform("min")

# Разница в месяцах между текущей транзакцией и когортой
data["cohort_index"] = (
    (data["month_year"].dt.year - data["cohortMonth"].dt.year) * 12
    + (data["month_year"].dt.month - data["cohortMonth"].dt.month)
    + 1
)

# Таблица когорт (уголком)
cohorts = data.pivot_table(index="cohortMonth", columns="cohort_index",
                           values="user_id", aggfunc=len)

# Перевод в проценты удержания (делим на первый столбец — размер когорты)
first_column = cohorts.iloc[:, 0]
retention = cohorts.div(first_column, axis=0).round(2)

# Тепловая карта удержания
plt.figure(figsize=(11, 9))
sns.heatmap(data=retention, annot=True, fmt=".0%", vmin=0.0, vmax=0.5, cmap="YlGnBu")
plt.show()
```

## Лучшие практики и подводные камни

- ✅ Сопоставляйте каждый KPI с измеримой метрикой — иначе цель неуправляема.
- ✅ Когортный анализ показывает удержание честнее, чем «средний» retention.
- ⚠️ LTV бессмысленен без корректной оценки Lifetime и когорт.
- ⚠️ Sticky Factor и retention чувствительны к определению «активного пользователя» — фиксируйте его.

## Связи с другими темами

- [Data Science Cheatsheet](../interview/ds-cheatsheet.md) — A/B-тестирование и когортный анализ. `#Interview`
- [Pandas](../pandas/pandas-osnovy.md) · [Matplotlib](../matplotlib/matplotlib-osnovy.md) — инструменты расчёта и визуализации. `#Pandas`
- [Modeling](../modeling/modeling.md) — статистическая проверка эффекта кампаний. `#Statistics`

## Рекомендуемые источники

- 📘 [seaborn heatmap](https://seaborn.pydata.org/generated/seaborn.heatmap.html)

## Примеры реальных кейсов

- **Retention-дашборд:** когортная тепловая карта удержания по месяцам регистрации.
- **Оценка канала:** сравнение LTV/CAC по источникам трафика для распределения бюджета.

## История версий

| Дата | Изменение | Источник |
|------|-----------|----------|
| 2026-07-03 | Первичный импорт раздела Marketing | [Notion: Marketing](https://peat-possum-c31.notion.site/Marketing-24c8b85aafc080a2a1abeb5f17066d2f) |
| 2026-07-03 | Актуализация: формула Churn, NRR/CAC, исправленный когортный код | Редакция KB |
