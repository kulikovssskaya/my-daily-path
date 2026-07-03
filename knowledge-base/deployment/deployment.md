---
title: "Deployment и внедрение моделей"
section: "Deployment"
summary: "Внедрение моделей и данных: SQL View, Data Warehouse vs Data Lake, кластеры, бизнес-системы (ERP/SCM/CRM), процесс ETL и staging area, инструменты Informatica/Pentaho."
tags: ["#Deployment", "#MLOps", "#DataEngineering", "#ETL", "#Databases"]
source: "https://peat-possum-c31.notion.site/Deployment-2858b85aafc0806e8f07ec1086cc06cf"
imported: "2026-07-03"
updated: "2026-07-03"
status: "ready"
---

# Deployment и внедрение моделей

> `#Deployment` `#MLOps` `#DataEngineering` `#ETL`
>
> Инфраструктура данных для внедрения аналитики и моделей.

## Ключевые концепции

- **View** — виртуальная таблица (результат SELECT).
- **Data Warehouse** vs **Data Lake**.
- **Кластер** — группа компьютеров как единый ресурс.
- **Бизнес-системы:** ERP, SCM, CRM.
- **ETL** и **staging area**.

## Подробное объяснение

### View

**View (представление)** — именованная виртуальная таблица, представляющая
результат запроса `SELECT`.

```sql
CREATE VIEW salesmen_stats AS
SELECT salesman_id, SUM(amount) AS revenue
FROM sales
GROUP BY salesman_id;
```

### Хранилища данных

- **Data Warehouse (DWH)** — структурированное корпоративное хранилище (обычно
  OLAP-структура) для аналитики.
- **Data Lake** — концепция, в которой данные **не структурируются** при
  загрузке (хранятся «как есть»).
- **Кластер** — группа компьютеров, представляющая для пользователя единый
  аппаратный ресурс.

### Бизнес-системы

| Система | Назначение |
|---------|-----------|
| **ERP** | Управление ресурсами и бизнес-процессами |
| **SCM** | Управление цепочками поставок |
| **CRM** | Взаимодействие с клиентами |

### ETL

![ETL-пайплайн: Extract, Transform, Load; Data Lake vs Data Warehouse](/kb-img/etl-pipeline.svg)

**ETL (Extract, Transform, Load)** — механизм консолидации данных из разных
систем: извлечь, привести к общему формату и загрузить в единую точку
аналитической обработки (как правило, DWH с OLAP-структурой).

- Выгруженные данные сначала помещаются в **staging area** (промежуточную зону).
- Инструменты ETL: **Informatica**, **Pentaho** (а также современные Airflow, dbt).

## Лучшие практики и подводные камни

- ✅ Промежуточный **staging** упрощает откат и повторную обработку ETL.
- ✅ DWH — для структурированной аналитики; Data Lake — для сырых/разнородных данных.
- ⚠️ Data Lake без каталога и управления рискует превратиться в «болото данных» (data swamp).
- 💡 Современный подход 2025–2026: **Lakehouse** (Delta Lake / Iceberg) объединяет плюсы DWH и Data Lake.

## Связи с другими темами

- [Базы данных](../databases/bazy-dannyh.md) — OLTP/OLAP, схемы «звезда»/«снежинка». `#Databases`
- [Airflow](../airflow/airflow.md) — оркестрация ETL. `#Airflow`
- [API / FastAPI](../api/api.md) — вывод модели как сервиса. `#API`
- [Modeling](../modeling/modeling.md) — мониторинг моделей в проде. `#MLOps`

## Рекомендуемые источники

- 📘 [What is a Data Lakehouse?](https://www.databricks.com/glossary/data-lakehouse)
- 📘 [ETL vs ELT](https://www.ibm.com/think/topics/etl)

## Примеры реальных кейсов

- **Корпоративное DWH:** ETL из ERP/CRM в хранилище для BI-отчётности.
- **Внедрение модели:** пайплайн из Data Lake → фичи → обученная модель → сервис инференса.

## История версий

| Дата | Изменение | Источник |
|------|-----------|----------|
| 2026-07-03 | Первичный импорт раздела Deployment | [Notion: Deployment](https://peat-possum-c31.notion.site/Deployment-2858b85aafc0806e8f07ec1086cc06cf) |
