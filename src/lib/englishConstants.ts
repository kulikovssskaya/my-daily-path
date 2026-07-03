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

const FALLBACK_POOL: Omit<EnglishVocabWord, "id" | "createdAt">[] = [
  { term: "figure out", translationRu: "разобраться, понять", definition: "to understand or solve something", example: "We need to figure out why the model underperforms.", category: "phrasal", difficulty: "B1" },
  { term: "deploy", translationRu: "развернуть", definition: "to put software into production", example: "We will deploy the API after testing.", category: "it", difficulty: "B1+" },
  { term: "overfitting", translationRu: "переобучение", definition: "when a model learns training noise too well", example: "Regularization helps reduce overfitting.", category: "ml", difficulty: "B2" },
  { term: "throughput", translationRu: "пропускная способность", definition: "amount of work completed in a period", example: "Pipeline throughput dropped after the schema change.", category: "analytics", difficulty: "B2" },
  { term: "run into", translationRu: "столкнуться с", definition: "to encounter unexpectedly", example: "We ran into a data quality issue.", category: "phrasal", difficulty: "B1" },
  { term: "stakeholder", translationRu: "заинтересованная сторона", definition: "person with interest in a project outcome", example: "Stakeholders asked for a clearer dashboard.", category: "analytics", difficulty: "B1+" },
  { term: "latency", translationRu: "задержка", definition: "time delay in a system", example: "High latency hurts the user experience.", category: "it", difficulty: "B1+" },
  { term: "feature engineering", translationRu: "конструирование признаков", definition: "creating input variables for ML models", example: "Feature engineering improved recall.", category: "ml", difficulty: "B2" },
  { term: "make sense", translationRu: "иметь смысл", definition: "to be logical or understandable", example: "These metrics do not make sense yet.", category: "everyday", difficulty: "B1" },
  { term: "bottleneck", translationRu: "узкое место", definition: "a point that limits overall performance", example: "The database became the main bottleneck.", category: "it", difficulty: "B1+" },
  { term: "churn rate", translationRu: "отток клиентов", definition: "percentage of customers who stop using a product", example: "Churn rate rose after the pricing change.", category: "analytics", difficulty: "B2" },
  { term: "look up", translationRu: "искать (в справочнике)", definition: "to search for information", example: "I looked up the error code in the docs.", category: "phrasal", difficulty: "B1" },
  { term: "inference", translationRu: "вывод модели", definition: "using a trained model to make predictions", example: "Inference runs on a separate GPU cluster.", category: "ml", difficulty: "B2" },
  { term: "on the same page", translationRu: "быть на одной волне", definition: "to agree or understand each other", example: "Let's make sure we're on the same page before the demo.", category: "idiom", difficulty: "B1+" },
  { term: "rollback", translationRu: "откат", definition: "reverting to a previous version", example: "We did a rollback after the failed release.", category: "it", difficulty: "B1+" },
  { term: "cohort analysis", translationRu: "когортный анализ", definition: "tracking groups over time", example: "Cohort analysis showed retention improved.", category: "analytics", difficulty: "B2" },
  { term: "come across", translationRu: "наткнуться на", definition: "to find or encounter by chance", example: "I came across an interesting paper on transformers.", category: "phrasal", difficulty: "B1" },
  { term: "hyperparameter", translationRu: "гиперпараметр", definition: "a setting configured before training", example: "We tuned the learning rate hyperparameter.", category: "ml", difficulty: "B2" },
  { term: "touch base", translationRu: "связаться, синхронизироваться", definition: "to briefly contact or update someone", example: "Let's touch base after the standup.", category: "idiom", difficulty: "B1+" },
  { term: "scalable", translationRu: "масштабируемый", definition: "able to handle growth", example: "We need a scalable ingestion pipeline.", category: "it", difficulty: "B1+" },
  { term: "funnel", translationRu: "воронка", definition: "stages users pass through toward a goal", example: "The signup funnel has a sharp drop at step two.", category: "analytics", difficulty: "B1+" },
  { term: "keep track of", translationRu: "отслеживать", definition: "to monitor or record progress", example: "I keep track of experiments in a spreadsheet.", category: "phrasal", difficulty: "B1" },
];

export function fallbackVocabDrop(count = 22): EnglishVocabWord[] {
  const now = new Date().toISOString();
  return FALLBACK_POOL.slice(0, count).map((w) => ({
    ...w,
    id: uid("en"),
    createdAt: now,
  }));
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
