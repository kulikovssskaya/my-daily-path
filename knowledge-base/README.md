# База знаний: Machine Learning & Data Analytics

> Единая, структурированная база знаний по ML и аналитике данных.
> Материалы импортируются из [Notion-курса «Data science course»](https://peat-possum-c31.notion.site/Data-science-cource-192ec23ea21047a9bde882f9e72f69ca) и переструктурируются в чистый, готовый к публикации формат.

**Метатеги:** `#ML` `#Analytics` `#Python` `#DataScience` `#DeepLearning`

---

## Как устроена база

Каждая статья следует единой иерархии:

1. **Ключевые концепции** — кратко и чётко
2. **Подробное объяснение**
3. **Математическая основа** (формулы в KaTeX)
4. **Практическая реализация** (Python)
5. **Лучшие практики и подводные камни**
6. **Связи с другими темами**
7. **Рекомендуемые источники / дальнейшее чтение**
8. **Примеры реальных кейсов**
9. **История версий** (дата + источник)

---

## Разделы

| # | Раздел | Файл | Статус | Источник (Notion) |
|---|--------|------|--------|-------------------|
| 1 | **Вводные** | [`intro/vvodnye.md`](intro/vvodnye.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/1d17ef40048944a9b40f4c92ea0715f3) |
| 2 | **Python** | [`python/python-osnovy.md`](python/python-osnovy.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/Python-929e0fa837974c6a835fab17ab457829) |
| 3 | **Pandas** | [`pandas/pandas-osnovy.md`](pandas/pandas-osnovy.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/Pandas-0ddba042bbd8453aa941c2ff4ba7f2eb) |
| 4 | **Matplotlib** | [`matplotlib/matplotlib-osnovy.md`](matplotlib/matplotlib-osnovy.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/Matplotlib-2198b85aafc080f7899dcc6a5125203a) |
| 5 | **Алгоритмы** | [`algorithms/algoritmy.md`](algorithms/algoritmy.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/2578b85aafc08054a739c0393d413331) |
| 6 | **ML — Основы** | [`ml/ml-osnovy.md`](ml/ml-osnovy.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/ML-caca8dc0d8e94f08831120f6af512357) |
| 6b | **ML — Алгоритмы и методы** | [`ml/ml-algoritmy-i-metody.md`](ml/ml-algoritmy-i-metody.md) | ✅ **Готово** | Редакция KB (конспект) |
| 7 | **Modeling** | [`modeling/modeling.md`](modeling/modeling.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/Modeling-2318b85aafc08070b0d4f17c57b716d5) |
| 8 | **БД** | [`databases/bazy-dannyh.md`](databases/bazy-dannyh.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/7ddb789631fc4ad1aaa151542278c53e) |
| 9 | **API** | [`api/api.md`](api/api.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/API-e8ff36bbf9cc4035b2eb7cfd87c0ca59) |
| 10 | **Airflow** | [`airflow/airflow.md`](airflow/airflow.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/Airflow-2998b85aafc08035922bd5a31fda0881) |
| 11 | **Marketing** | [`marketing/marketing.md`](marketing/marketing.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/Marketing-24c8b85aafc080a2a1abeb5f17066d2f) |
| 12 | **Deployment** | [`deployment/deployment.md`](deployment/deployment.md) | ✅ **Готово** | [ссылка](https://peat-possum-c31.notion.site/Deployment-2858b85aafc0806e8f07ec1086cc06cf) |

### Дополнительные материалы

| Раздел | Файл | Статус | Источник |
|--------|------|--------|----------|
| Шпаргалки | [`interview/ds-cheatsheet.md`](interview/ds-cheatsheet.md) | ✅ **Готово** | Aaron Wang — Data Science Cheatsheet 2.0 (PDF, перевод на русский) |
| Собеседования | [`interview/ml-interview-handbook.md`](interview/ml-interview-handbook.md) | ✅ **Готово** | Lamhot Siagian — ML Interview Q&A Handbook, 200+ вопросов (PDF, перевод на русский) |

> Диаграммы для наглядности — собственные SVG в [`public/kb-img/`](../public/kb-img/):
> CRISP-DM, Python types, DataFrame, chart types, box plot, stack/queue, ML task types,
> decision tree, cross-validation, bias-variance, confusion matrix, ROC/AUC, bagging vs boosting,
> neural network, PCA, transformer, hypothesis flow, star schema, OLTP/OLAP, REST API,
> Airflow DAG, AIDA funnel, retention curve, ETL pipeline, **merge joins**, **ML pipeline**.

> **Актуализация 2026-07-03:** проверка фактов, современные примеры кода (sklearn Pipeline,
> Pydantic v2, Optuna, seaborn, TaskFlow API, ELT/dbt, LLM/RAG), исправление ошибок
> (p-value, Churn, box plot whiskers, dict ordering).

---

## Легенда статусов

- ✅ Готово — импортировано, переструктурировано, вычитано
- 🔄 В работе
- ⏳ Ожидает импорта

_Последнее обновление: 2026-07-10_
