---
title: "API, requests, Git и FastAPI"
section: "API"
summary: "Работа с API: REST, HTTP-методы GET/POST, библиотека requests, сохранение ответов в DataFrame; основы Git; и построение сервиса на FastAPI с pydantic, joblib и запуском модели по расписанию (APScheduler)."
tags: ["#API", "#Python", "#FastAPI", "#Git", "#MLOps", "#requests"]
source: "https://peat-possum-c31.notion.site/API-e8ff36bbf9cc4035b2eb7cfd87c0ca59 (+ Fast API)"
imported: "2026-07-03"
updated: "2026-07-03"
status: "ready"
---

# API, requests, Git и FastAPI

> `#API` `#Python` `#FastAPI` `#Git` `#MLOps`
>
> Как программы общаются между собой и как выложить ML-модель как веб-сервис.

## Ключевые концепции

- **API** — набор правил взаимодействия программ.
- **REST**, **HTTPS**, методы **GET** (read) и **POST** (create).
- **requests** — Python-библиотека для HTTP-запросов.
- **Git** — контроль версий (commit, push, ветки).
- **FastAPI** + **pydantic** — сервис для инференса модели.
- **APScheduler** — запуск задач по расписанию (cron).

## Подробное объяснение

### Основы API

- **API (Application Programming Interface)** — набор правил, по которым одна
  программа взаимодействует с другой.
- **REST (Representational State Transfer)** — набор правил написания серверного
  приложения.
- **HTTPS** — протокол безопасной передачи гипертекста.
- Методы: **GET** (read), **POST** (create; параметры передаются в теле запроса).
- **Postman** — инструмент для ручной проверки API.

### Библиотека requests

```python
import requests
import pandas as pd

# GET (params — словарь query-параметров)
response = requests.get(url, params=params)

# POST (data — тело запроса, timeout — время ожидания)
response = requests.post(url, data=params, timeout=10)

response.status_code   # код статуса
response.text          # ответ строкой
response.json()        # ответ как JSON

# Ответ -> DataFrame -> файл
results = response.json()["results"]
df = pd.DataFrame(results)
df.to_excel("data/iTunes_api.xlsx", sheet_name="Manizha", index_label="id")
df.to_csv("data/iTunes_api.csv", sep="\t", index=False)
```

### Git — основные команды

```bash
# Работа в ветке master
git clone <project_path>          # клонировать репозиторий
git add <file>                    # добавить в отслеживаемые (git add . — все)
git commit -m "commit text"       # зафиксировать изменения
git push origin master            # отправить на сервер

# Работа в отдельной ветке
git checkout -b new_branch        # создать и перейти в ветку
git push origin new_branch

# Полезное
git status        # изменения в рабочем каталоге
git log           # история коммитов
git branch        # список веток (git branch -r — удалённые)
git pull origin master   # загрузить и объединить изменения
git diff origin/master   # различия с удалённой веткой
```

## Практическая реализация: сервис на FastAPI

### Сохранение и загрузка модели (joblib)

```python
import joblib, datetime

# Сохраняем пайплайн + метаданные
joblib.dump({
    "model": best_pipe,
    "metadata": {
        "name": "Loan prediction model",
        "author": "Peter Emelianov",
        "version": 1,
        "date": datetime.datetime.now(),
        "type": type(best_pipe.named_steps["classifier"]).__name__,
        "accuracy": best_score,
    },
}, "loan_pipe.pkl")

# Загрузка
model = joblib.load("model/loan_pipe.pkl")
```

### Приложение FastAPI

```python
from fastapi import FastAPI
from pydantic import BaseModel
import joblib, json
import pandas as pd

app = FastAPI()
model = joblib.load("model/loan_pipe.pkl")   # глобально — доступно всем обработчикам

# Декоратор превращает функцию в обработчик HTTP GET к /status
@app.get("/status")
def status():
    return "I'm OK"

@app.get("/version")
def version():
    return model["metadata"]
```

Запуск: `uvicorn main:app --reload`. Сервис доступен на `127.0.0.1:8000`
(`127.0.0.1` = localhost, адрес обратной петли).

### Валидация данных через pydantic

```python
class Form(BaseModel):          # pydantic сопоставит имена из JSON и проверит типы
    Loan_ID: str
    Gender: str
    ApplicantIncome: float
    LoanAmount: float
    Credit_History: int
    Property_Area: str

class Prediction(BaseModel):
    Loan_ID: str
    Result: float

@app.post("/predict", response_model=Prediction)
def predict(form: Form):
    df = pd.DataFrame.from_dict([form.dict()])
    y = model["model"].predict(df)
    return {"Loan_ID": form.Loan_ID, "Result": y[0]}
```

### Запуск по расписанию (APScheduler)

```python
from apscheduler.schedulers.blocking import BlockingScheduler
import tzlocal

sched = BlockingScheduler(timezone=tzlocal.get_localzone_name())

@sched.scheduled_job("cron", second="*/10")   # каждые 10 секунд
def on_time():
    data = df.sample(frac=0.05)                # 5% датасета
    data["preds"] = model["model"].predict(data)
    print(data[["Loan_ID", "preds"]])

if __name__ == "__main__":
    sched.start()
```

## Лучшие практики и подводные камни

- ✅ Всегда указывайте `timeout` в `requests` — иначе запрос может «зависнуть».
- ✅ Проверяйте `response.status_code` перед разбором `response.json()`.
- ✅ pydantic валидирует входные данные — не доверяйте телу запроса «на слово».
- ✅ Храните модель глобально (загружайте один раз при старте), а не на каждый запрос.
- ⚠️ Не коммитьте секреты/токены в Git (используйте `.env`, `.gitignore`).
- 💡 `joblib` предпочтительнее `pickle` для sklearn-моделей; храните метаданные (версия, дата, метрика).

## Связи с другими темами

- [Deployment](../deployment/deployment.md) — вывод сервиса в прод. `#Deployment`
- [Airflow](../airflow/airflow.md) — оркестрация вместо простого cron. `#Airflow`
- [Machine Learning — Основы](../ml/ml-osnovy.md) — обучение пайплайна для сервиса. `#ML`

## Рекомендуемые источники

- 📘 [FastAPI Documentation](https://fastapi.tiangolo.com/)
- 📘 [Requests](https://requests.readthedocs.io/) · [APScheduler](https://apscheduler.readthedocs.io/)

## Примеры реальных кейсов

- **Скоринг заявок:** FastAPI-эндпоинт `/predict` для кредитной модели.
- **Сбор данных:** периодический опрос внешнего API через `requests` + `APScheduler`.

## История версий

| Дата | Изменение | Источник |
|------|-----------|----------|
| 2026-07-03 | Первичный импорт разделов API и Fast API | [Notion: API](https://peat-possum-c31.notion.site/API-e8ff36bbf9cc4035b2eb7cfd87c0ca59) |
