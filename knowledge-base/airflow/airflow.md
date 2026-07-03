---
title: "Apache Airflow — оркестрация пайплайнов"
section: "Airflow"
summary: "Оркестрация дата-пайплайнов в Apache Airflow: DAG и идемпотентность, операторы и задачи, сенсоры, планировщик и экзекьюторы (Sequential/Local/Celery), веб-интерфейс и запуск через Docker Compose."
tags: ["#Airflow", "#DataEngineering", "#MLOps", "#Python", "#ETL"]
source: "https://peat-possum-c31.notion.site/Airflow-2998b85aafc08035922bd5a31fda0881"
imported: "2026-07-03"
updated: "2026-07-03"
status: "ready"
---

# Apache Airflow — оркестрация пайплайнов

> `#Airflow` `#DataEngineering` `#MLOps` `#ETL`
>
> Планирование и оркестрация рабочих процессов (DAG) для дата-инженерии и MLOps.

## Ключевые концепции

- **DAG** — направленный ациклический граф этапов (граф **без циклов**).
- **Операторы (Operators)** — «как запустить» (PythonOperator, BashOperator, PostgresOperator).
- **Задачи (Tasks)** — «что запустить».
- **Сенсоры (Sensors)** — операторы для событийных пайплайнов (ждут наступления условия).
- **Планировщик (Scheduler)** — решает, что и когда запускать.
- **Экзекьюторы (Executors)** — исполняют задачи.

## Подробное объяснение

### DAG, операторы и задачи

**DAG** (Directed Acyclic Graph) — граф задач без циклов: каждый запуск описывает
последовательность шагов, но **идемпотентность** относится к **задачам**, а не к DAG
как структуре. Повторный запуск задачи с теми же входами должен давать тот же результат.

- **Операторы** — «рабочие», выполняющие задачи. Готовые операторы:
  - `PythonOperator` — исполнение Python-кода;
  - `BashOperator` — запуск bash-команд/скриптов;
  - `PostgresOperator` — SQL-запросы в PostgreSQL.
- **Сенсоры** — разновидность операторов для событийно-ориентированных
  пайплайнов (например, дождаться нового файла).
- **Задачи (Tasks)** — определяемые пользователем действия (функции Python или
  внешние скрипты). Должны быть идемпотентны.

> **Задачи** определяют, *что* запускать, **Операторы** — *как* запускать.

### Компоненты Airflow

- **Планировщик (Scheduler)** — «мозг»: читает метаданные, проверяет состояние
  задач и решает порядок запуска.
- **Экзекьюторы (Executors)** — исполняют задачи:
  - `SequentialExecutor` — одна задача одномоментно (самый простой);
  - `LocalExecutor` — задачи как локальные подпроцессы;
  - `CeleryExecutor` — популярный, масштабируемый: таск-менеджер Celery +
    брокер сообщений (Redis / RabbitMQ) для асинхронной очереди. Масштабируется
    добавлением воркеров (удалённых машин).
- **Метабаза данных** — хранит все метаданные; конфигурация — в `airflow.cfg`.

### Последовательность выполнения

![DAG Airflow: extract, transform, load, validate — компоненты и executors](/kb-img/airflow-dag.svg)

1. Файлы с DAG'ами сканируются веб-сервером и планировщиком; код задач
   выполняется на **воркерах**.
2. БД метаданных хранит статусы задач («В очереди», «Запланировано», «Выполняется»).
3. Планировщик читает метаданные и решает, что делать.
4. Планировщик передаёт задачи экзекьютору для выделения ресурсов.

### Возможности

- **Variables** — параметры вычислений.
- **Pools** — контроль параллелизма.
- **Hooks** — подключение к сторонним системам.
- **Connections** — хранение авторизационных данных.
- **Plugins** — расширение функционала.

### Веб-интерфейс

- Представления: **Tree View**, **Graph View**.
- **DAG Run** — инстанс DAG в момент времени; **TaskInstance** — инстанс задачи.
- **Task Duration / Task Tries**, **Landing Times**, диаграмма **Gantt**.
- Логи — в `TaskInstance -> Log` (разбиты по попыткам). **Task Actions** —
  перезапуск и смена статуса.
- Вкладки: Security, Browse, Admin (Variables/Connections), Docs, Profile.

## Практическая реализация

```python
# dag.py — обычно два PythonOperator и один BashOperator (сообщение о старте)
# Проверка корректности:
#   python3 dag.py
# DAG кладётся в папку, за которой следит scheduler:
#   $AIRFLOW_HOME/dags
```

```bash
# Ручное копирование DAG
cp dags/first_dag.py ~/airflow/dags/first_dag.py

# Запуск Airflow (в разных терминалах), активировав окружение
source .venv/bin/activate
airflow webserver -p 8090
airflow scheduler

# Через Docker Compose V2
docker compose up airflow-init
docker compose up -d          # в фоне
# localhost:8080  (логин/пароль: airflow / airflow)
docker compose down
```

## Лучшие практики и подводные камни

- ✅ Пишите **идемпотентные** задачи: повтор с теми же входами → тот же результат.
- ✅ Для продакшена используйте `CeleryExecutor` (или KubernetesExecutor) — масштабируемость.
- ⚠️ `SequentialExecutor` — только для отладки (одна задача за раз).
- ⚠️ Проверяйте DAG (`python3 dag.py`) перед деплоем в папку `dags/`.
- 💡 Храните креды в **Connections**, а параметры — в **Variables**, не в коде.
- 💡 **TaskFlow API** (Airflow 2.x): декоратор `@task` вместо явных операторов — чище зависимости и XCom.

```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(start_date=datetime(2026, 1, 1), schedule="@daily", catchup=False)
def etl_example():
    @task
    def extract():
        return {"rows": 100}

    @task
    def transform(data: dict):
        return data["rows"] * 2

    @task
    def load(count: int):
        print(f"Loaded {count} records")

    load(transform(extract()))

etl_example()
```

## Связи с другими темами

- [Базы данных](../databases/bazy-dannyh.md) — оркестрация ETL в хранилище. `#ETL`
- [API / FastAPI](../api/api.md) — альтернатива cron для расписаний. `#API`
- [Deployment](../deployment/deployment.md) — место Airflow в MLOps-конвейере. `#Deployment`

## Рекомендуемые источники

- 📘 [Apache Airflow Documentation](https://airflow.apache.org/docs/)
- 📘 [Airflow Concepts: DAGs](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html)

## Примеры реальных кейсов

- **Ночной ETL:** DAG выгружает данные из источников, трансформирует и грузит в DWH.
- **Переобучение модели:** DAG по расписанию готовит данные, обучает и публикует модель.

## История версий

| Дата | Изменение | Источник |
|------|-----------|----------|
| 2026-07-03 | Первичный импорт раздела Airflow | [Notion: Airflow](https://peat-possum-c31.notion.site/Airflow-2998b85aafc08035922bd5a31fda0881) |
| 2026-07-03 | Актуализация: идемпотентность задач, docker compose, TaskFlow API | Редакция KB |
