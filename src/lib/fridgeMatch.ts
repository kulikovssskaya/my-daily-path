/** Normalize a fridge item or search term for fuzzy matching. */
export function normFridge(s: string): string {
  return s.toLowerCase().trim();
}

/**
 * Category / group keywords → patterns that match typical fridge item names.
 * Used when the user says "remove grains / удали крупы" etc.
 */
const GROUP_PATTERNS: Record<string, RegExp> = {
  grains: /rice|pasta|noodle|oat|buckwheat|millet|barley|quinoa|couscous|grain|flour|хлопья|лапша|рис|греч|овсян|пшено|макарон|круп/i,
  крупы: /rice|pasta|noodle|oat|buckwheat|millet|barley|quinoa|couscous|grain|flour|хлопья|лапша|рис|греч|овсян|пшено|макарон|круп/i,
  carbs: /rice|pasta|noodle|oat|potato|bread|grain|картош|хлеб|круп/i,
  углеводы: /rice|pasta|noodle|oat|potato|bread|grain|картош|хлеб|круп/i,
  proteins: /chicken|meat|beef|pork|fish|egg|tofu|wing|филе|мясо|куриц|крыл|рыб|яйц|белок/i,
  белки: /chicken|meat|beef|pork|fish|egg|tofu|wing|филе|мясо|куриц|крыл|рыб|яйц|белок/i,
  vegetables: /carrot|onion|pepper|tomato|cucumber|garlic|mushroom|lettuce|vegetable|морков|лук|перец|помидор|огур|чеснок|гриб|овощ|капуст|салат/i,
  овощи: /carrot|onion|pepper|tomato|cucumber|garlic|mushroom|lettuce|vegetable|морков|лук|перец|помидор|огур|чеснок|гриб|овощ|капуст|салат/i,
  fruits: /banana|apple|orange|lemon|lime|mango|berry|fruit|банан|яблок|апельсин|лайм|манго|фрукт/i,
  фрукты: /banana|apple|orange|lemon|lime|mango|berry|fruit|банан|яблок|апельсин|лайм|манго|фрукт/i,
  dairy: /milk|cheese|yogurt|cream|butter|молок|сыр|йогурт|слив/i,
  молочное: /milk|cheese|yogurt|cream|butter|молок|сыр|йогурт|слив/i,
  sauces: /sauce|ketchup|vinegar|soy|масло|соус|уксус|кетчуп/i,
  соусы: /sauce|ketchup|vinegar|soy|масло|соус|уксус|кетчуп/i,
  spices: /pepper|salt|sugar|spice|приправ|специ|соль|сахар|перец/i,
  специи: /pepper|salt|sugar|spice|приправ|специ|соль|сахар|перец/i,
};

/** Does a fridge item name match a removal term (direct or via category group)? */
export function fridgeItemMatchesRemove(itemName: string, removeTerm: string): boolean {
  const name = normFridge(itemName);
  const term = normFridge(removeTerm);
  if (!term) return false;

  if (name === term || name.includes(term) || term.includes(name)) return true;

  const group = GROUP_PATTERNS[term];
  if (group && group.test(name)) return true;

  // Also check if the term itself looks like a category header stored as an item name.
  if (GROUP_PATTERNS[name] && GROUP_PATTERNS[term] === GROUP_PATTERNS[name]) return true;

  return false;
}

/** Expand a removal term to all matching names from the current fridge list. */
export function expandRemoveTerms(remove: string[], fridgeNames: string[]): string[] {
  const expanded = new Set<string>();
  for (const term of remove) {
    expanded.add(term);
    for (const name of fridgeNames) {
      if (fridgeItemMatchesRemove(name, term)) expanded.add(name);
    }
  }
  return [...expanded];
}
