import type { EnglishCategory, EnglishDifficulty, EnglishVocabWord } from "@/types";
import { uid } from "@/lib/utils";

export const ENGLISH_CATEGORY_LABELS: Record<EnglishCategory, string> = {
  everyday: "Everyday English",
  it: "IT & Tech",
  ml: "Machine Learning",
  analytics: "Data Analytics",
  phrasal: "Phrasal Verbs",
  idiom: "Idioms",
};

export const ALL_ENGLISH_CATEGORIES: EnglishCategory[] = [
  "everyday",
  "it",
  "ml",
  "analytics",
  "phrasal",
  "idiom",
];

const FALLBACK_EVERYDAY: Omit<EnglishVocabWord, "id" | "createdAt">[] = [
  { term: "make sense", translationRu: "иметь смысл, быть понятным", definition: "to be logical or understandable", example: "These numbers do not make sense yet.", category: "everyday", difficulty: "B1" },
  { term: "figure out", translationRu: "разобраться, понять", definition: "to understand or solve something", example: "I need to figure out what went wrong.", category: "phrasal", difficulty: "B1" },
  { term: "run into", translationRu: "случайно встретить; столкнуться с", definition: "to meet someone or face a problem by chance", example: "I ran into an old friend at the store.", category: "phrasal", difficulty: "B1" },
  { term: "look up", translationRu: "найти (в словаре, в интернете)", definition: "to search for information", example: "She looked up the address online.", category: "phrasal", difficulty: "B1" },
  { term: "come across", translationRu: "наткнуться на, случайно найти", definition: "to find something by chance", example: "I came across a nice cafe near my place.", category: "phrasal", difficulty: "B1" },
  { term: "keep track of", translationRu: "следить за, учитывать", definition: "to monitor or remember something over time", example: "I keep track of my spending in an app.", category: "phrasal", difficulty: "B1" },
  { term: "on the same page", translationRu: "договориться; понимать друг друга одинаково", definition: "to agree or share the same understanding", example: "Let's get on the same page before we book tickets.", category: "idiom", difficulty: "B1" },
  { term: "by the way", translationRu: "кстати", definition: "used to add a related remark", example: "By the way, did you buy milk?", category: "idiom", difficulty: "B1" },
  { term: "grocery shopping", translationRu: "покупка продуктов", definition: "buying food at a supermarket", example: "I do grocery shopping on Sundays.", category: "everyday", difficulty: "B1" },
  { term: "commute", translationRu: "дорога на работу / учёбу", definition: "regular travel to work or school", example: "My commute takes about forty minutes.", category: "everyday", difficulty: "B1" },
  { term: "chores", translationRu: "домашние дела", definition: "routine housework", example: "I do chores on Sunday mornings.", category: "everyday", difficulty: "B1" },
  { term: "appointment", translationRu: "запись (к врачу и т.п.)", definition: "a scheduled visit or meeting", example: "I have a dentist appointment at noon.", category: "everyday", difficulty: "B1" },
  { term: "take out the trash", translationRu: "вынести мусор", definition: "to remove garbage from home", example: "Could you take out the trash tonight?", category: "everyday", difficulty: "B1" },
  { term: "catch up", translationRu: "пообщаться (после перерыва); наверстать", definition: "to talk after time apart, or get up to date", example: "Let's catch up over coffee this week.", category: "phrasal", difficulty: "B1" },
  { term: "work out", translationRu: "получиться; тренироваться", definition: "to succeed, or to exercise", example: "Everything worked out in the end.", category: "phrasal", difficulty: "B1" },
  { term: "show up", translationRu: "прийти, появиться", definition: "to arrive", example: "He showed up late to the party.", category: "phrasal", difficulty: "B1" },
  { term: "get along with", translationRu: "ладить с кем-то", definition: "to have a good relationship", example: "I get along with my neighbors.", category: "phrasal", difficulty: "B1" },
  { term: "in a hurry", translationRu: "тороплиться, спешить", definition: "needing to move or act quickly", example: "Sorry, I'm in a hurry to catch the bus.", category: "idiom", difficulty: "B1" },
  { term: "once in a while", translationRu: "время от времени", definition: "sometimes, but not often", example: "We eat out once in a while.", category: "idiom", difficulty: "B1" },
  { term: "day off", translationRu: "выходной", definition: "a day when you do not work", example: "I'm taking a day off on Friday.", category: "everyday", difficulty: "B1" },
  { term: "run out of", translationRu: "закончиться (чего-то)", definition: "to have no more of something", example: "We ran out of coffee this morning.", category: "phrasal", difficulty: "B1" },
  { term: "put off", translationRu: "отложить", definition: "to delay doing something", example: "Don't put off calling the doctor.", category: "phrasal", difficulty: "B1" },
  { term: "hang out", translationRu: "тусоваться, проводить время", definition: "to spend time relaxing with others", example: "We hung out at the park on Saturday.", category: "phrasal", difficulty: "B1" },
  { term: "pick up", translationRu: "забрать; купить по пути", definition: "to collect someone or something", example: "Can you pick up milk on your way home?", category: "phrasal", difficulty: "B1" },
  { term: "look after", translationRu: "присматривать за", definition: "to take care of someone or something", example: "Can you look after my cat this weekend?", category: "phrasal", difficulty: "B1" },
  { term: "give up", translationRu: "сдаться, бросить", definition: "to stop trying or quit a habit", example: "Don't give up — try one more time.", category: "phrasal", difficulty: "B1" },
  { term: "on my way", translationRu: "уже еду / иду", definition: "currently going somewhere", example: "I'm on my way — see you in ten minutes.", category: "idiom", difficulty: "B1" },
  { term: "no big deal", translationRu: "не страшно, ерунда", definition: "something is not important or serious", example: "It's no big deal if we're a bit late.", category: "idiom", difficulty: "B1" },
  { term: "take a break", translationRu: "сделать перерыв", definition: "to rest for a short time", example: "Let's take a break and get some water.", category: "everyday", difficulty: "B1" },
  { term: "check out", translationRu: "посмотреть, заценить", definition: "to look at or try something", example: "Check out this new bakery near the station.", category: "phrasal", difficulty: "B1" },
];

const FALLBACK_TECH: Omit<EnglishVocabWord, "id" | "createdAt">[] = [
  { term: "deploy", translationRu: "развернуть", definition: "to put software into production", example: "We will deploy the API after testing.", category: "it", difficulty: "B1+" },
  { term: "overfitting", translationRu: "переобучение", definition: "when a model learns training noise too well", example: "Regularization helps reduce overfitting.", category: "ml", difficulty: "B2" },
  { term: "throughput", translationRu: "пропускная способность", definition: "amount of work completed in a period", example: "Pipeline throughput dropped after the schema change.", category: "analytics", difficulty: "B2" },
  { term: "stakeholder", translationRu: "заинтересованная сторона", definition: "person with interest in a project outcome", example: "Stakeholders asked for a clearer dashboard.", category: "analytics", difficulty: "B1+" },
  { term: "latency", translationRu: "задержка", definition: "time delay in a system", example: "High latency hurts the user experience.", category: "it", difficulty: "B1+" },
  { term: "feature engineering", translationRu: "конструирование признаков", definition: "creating input variables for ML models", example: "Feature engineering improved recall.", category: "ml", difficulty: "B2" },
  { term: "bottleneck", translationRu: "узкое место", definition: "a point that limits overall performance", example: "The database became the main bottleneck.", category: "it", difficulty: "B1+" },
  { term: "churn rate", translationRu: "отток клиентов", definition: "percentage of customers who stop using a product", example: "Churn rate rose after the pricing change.", category: "analytics", difficulty: "B2" },
  { term: "inference", translationRu: "вывод модели", definition: "using a trained model to make predictions", example: "Inference runs on a separate GPU cluster.", category: "ml", difficulty: "B2" },
  { term: "rollback", translationRu: "откат", definition: "reverting to a previous version", example: "We did a rollback after the failed release.", category: "it", difficulty: "B1+" },
  { term: "cohort analysis", translationRu: "когортный анализ", definition: "tracking groups over time", example: "Cohort analysis showed retention improved.", category: "analytics", difficulty: "B2" },
  { term: "hyperparameter", translationRu: "гиперпараметр", definition: "a setting configured before training", example: "We tuned the learning rate hyperparameter.", category: "ml", difficulty: "B2" },
  { term: "scalable", translationRu: "масштабируемый", definition: "able to handle growth", example: "We need a scalable ingestion pipeline.", category: "it", difficulty: "B1+" },
  { term: "funnel", translationRu: "воронка", definition: "stages users pass through toward a goal", example: "The signup funnel has a sharp drop at step two.", category: "analytics", difficulty: "B1+" },
  { term: "embedding", translationRu: "эмбеддинг", definition: "a dense vector representation of data", example: "We store user embeddings for recommendations.", category: "ml", difficulty: "B2" },
  { term: "data pipeline", translationRu: "конвейер данных", definition: "automated flow of data between systems", example: "The data pipeline runs every night.", category: "analytics", difficulty: "B1+" },
  { term: "refactor", translationRu: "рефакторить", definition: "to restructure code without changing behavior", example: "We refactored the service before adding features.", category: "it", difficulty: "B1+" },
  { term: "precision and recall", translationRu: "точность и полнота", definition: "metrics for classification quality", example: "We balanced precision and recall for fraud detection.", category: "ml", difficulty: "B2" },
  { term: "A/B test", translationRu: "A/B-тест", definition: "comparing two versions to measure impact", example: "We ran an A/B test on the landing page.", category: "analytics", difficulty: "B1+" },
  { term: "microservice", translationRu: "микросервис", definition: "a small independent software service", example: "Auth was moved into a separate microservice.", category: "it", difficulty: "B1+" },
  { term: "gradient descent", translationRu: "градиентный спуск", definition: "an optimization method for training models", example: "Gradient descent updated the weights each epoch.", category: "ml", difficulty: "B2" },
  { term: "dashboard", translationRu: "дашборд", definition: "a visual summary of key metrics", example: "The dashboard shows daily active users.", category: "analytics", difficulty: "B1" },
  { term: "endpoint", translationRu: "эндпоинт", definition: "a URL where an API accepts requests", example: "The endpoint returns JSON with user data.", category: "it", difficulty: "B1+" },
  { term: "train-test split", translationRu: "разделение на train/test", definition: "splitting data for training and evaluation", example: "We used an 80/20 train-test split.", category: "ml", difficulty: "B1+" },
  { term: "pull request", translationRu: "пул-реквест, запрос на слияние", definition: "a proposed code change for review", example: "Please review my pull request before merge.", category: "it", difficulty: "B1+" },
  { term: "bug fix", translationRu: "исправление бага", definition: "a change that corrects a software error", example: "We shipped a bug fix for the login crash.", category: "it", difficulty: "B1" },
  { term: "release notes", translationRu: "заметки о релизе", definition: "a summary of changes in a new version", example: "Check the release notes before upgrading.", category: "it", difficulty: "B1+" },
  { term: "unit test", translationRu: "юнит-тест", definition: "a test for a small piece of code", example: "Add a unit test for this helper function.", category: "it", difficulty: "B1+" },
  { term: "dataset", translationRu: "датасет, набор данных", definition: "a collection of data for analysis or training", example: "The dataset has missing values in three columns.", category: "analytics", difficulty: "B1" },
  { term: "baseline model", translationRu: "базовая модель", definition: "a simple model used as a comparison starting point", example: "Our baseline model already reaches 70% accuracy.", category: "ml", difficulty: "B1+" },
  { term: "false positive", translationRu: "ложное срабатывание", definition: "an incorrect positive prediction", example: "Too many false positives annoyed support agents.", category: "ml", difficulty: "B1+" },
  { term: "feature store", translationRu: "хранилище признаков", definition: "a system that stores reusable ML features", example: "We publish customer features to the feature store.", category: "ml", difficulty: "B2" },
  { term: "query", translationRu: "запрос (к БД)", definition: "a request for data from a database", example: "This query is slow on large tables.", category: "analytics", difficulty: "B1" },
  { term: "metric", translationRu: "метрика", definition: "a number used to measure performance", example: "Conversion rate is our main metric this week.", category: "analytics", difficulty: "B1" },
  { term: "retention", translationRu: "удержание пользователей", definition: "how many users keep coming back", example: "Weekly retention improved after onboarding changes.", category: "analytics", difficulty: "B1+" },
  { term: "API key", translationRu: "API-ключ", definition: "a secret token used to access an API", example: "Do not commit the API key to git.", category: "it", difficulty: "B1" },
  { term: "timeout", translationRu: "таймаут, превышение времени ожидания", definition: "when a request fails because it took too long", example: "The request failed with a timeout error.", category: "it", difficulty: "B1+" },
  { term: "caching", translationRu: "кэширование", definition: "storing results temporarily for faster reuse", example: "Caching reduced load on the database.", category: "it", difficulty: "B1+" },
  { term: "prompt", translationRu: "промпт, запрос к модели", definition: "the text instruction given to an AI model", example: "Rewrite the prompt to be more specific.", category: "ml", difficulty: "B1+" },
  { term: "fine-tuning", translationRu: "дообучение модели", definition: "further training a model on specialized data", example: "Fine-tuning improved answers for support tickets.", category: "ml", difficulty: "B2" },
  { term: "outlier", translationRu: "выброс", definition: "a data point far from the rest", example: "Remove outliers before fitting the model.", category: "analytics", difficulty: "B1+" },
  { term: "schema", translationRu: "схема данных", definition: "the structure of tables or fields", example: "We updated the schema after adding a new field.", category: "analytics", difficulty: "B1+" },
  { term: "CI/CD", translationRu: "CI/CD, непрерывная интеграция и доставка", definition: "automated build, test, and deploy pipeline", example: "CI/CD blocks merges when tests fail.", category: "it", difficulty: "B1+" },
];

export function getFallbackEverydayPack() {
  return FALLBACK_EVERYDAY;
}

export function getFallbackTechPack() {
  return FALLBACK_TECH;
}

export function fallbackVocabDrop(count = 22): EnglishVocabWord[] {
  const now = new Date().toISOString();
  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  const everyday = shuffle(FALLBACK_EVERYDAY).map((w) => ({
    ...w,
    id: uid("en"),
    createdAt: now,
  }));
  const tech = shuffle(FALLBACK_TECH).map((w) => ({
    ...w,
    id: uid("en"),
    createdAt: now,
  }));
  const half = Math.floor(count / 2);
  return [...everyday.slice(0, half), ...tech.slice(0, count - half)].slice(0, count);
}

export function aiWordToDomain(
  w: {
    term: string;
    translationRu: string;
    definition: string;
    example: string;
    category: EnglishCategory;
    difficulty: EnglishDifficulty;
  }
): EnglishVocabWord {
  return {
    id: uid("en"),
    ...w,
    createdAt: new Date().toISOString(),
  };
}
