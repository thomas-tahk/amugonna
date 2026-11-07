import { canonicalize, getEntry } from './ingredients/index.js';

export const ALLERGENS = {
  milk: 'Milk / dairy', egg: 'Eggs', fish: 'Fish', shellfish: 'Shellfish',
  peanut: 'Peanuts', 'tree-nut': 'Tree nuts', wheat: 'Wheat', soy: 'Soy', sesame: 'Sesame',
} as const;

export interface Exclusions {
  avoidedAllergens: string[];
  excludedIngredients: string[];
  reviewedIngredients?: string[];
}

// Exact ingredient families and derivatives, not substring matches (eggplant != egg).
const SOURCES: Record<string, string[]> = {
  milk: ['milk', 'buttermilk', 'condensed milk', 'evaporated milk', 'cream', 'sour cream', 'butter', 'cheese', 'cream cheese', 'ricotta', 'cottage cheese', 'yogurt', 'mascarpone', 'clotted cream', 'custard', 'ghee', 'ice cream', 'milk chocolate', 'white chocolate', 'whey', 'casein', 'caseinate', 'milk powder', 'milk protein', 'lactose', 'creme fraiche', 'dulce de leche'],
  egg: ['egg', 'egg white', 'egg yolk', 'egg noodle', 'mayonnaise', 'meringue', 'custard'],
  fish: ['salmon', 'smoked salmon', 'tuna', 'white fish', 'anchovy', 'sardine', 'mackerel', 'herring', 'monkfish', 'sea bass', 'red snapper', 'salt cod', 'fish sauce', 'fish stock', 'worcestershire sauce', 'bonito', 'korean fish cake'],
  shellfish: ['prawn', 'crab', 'squid', 'clam', 'mussel', 'oyster', 'lobster', 'conch', 'scallop', 'shrimp paste', 'saeujeot', 'oyster sauce'],
  peanut: ['peanut', 'peanut butter', 'peanut oil', 'groundnut'],
  'tree-nut': ['almond', 'almond milk', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'pine nut', 'mixed nut', 'brazil nut', 'macadamia', 'marzipan', 'almond flour'],
  wheat: ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'couscous', 'bulgur', 'semolina', 'soy sauce', 'seitan', 'breadcrumb', 'puff pastry', 'filo pastry', 'tortilla', 'burger bun'],
  soy: ['soybean', 'soy milk', 'soy sauce', 'tamari', 'tofu', 'miso', 'tempeh', 'edamame', 'soybean oil', 'doenjang', 'ssamjang', 'gochujang'],
  sesame: ['sesame seed', 'sesame oil', 'tahini', 'halva'],
};

const NON_DAIRY = new Set(['coconut milk', 'coconut cream', 'almond milk', 'oat milk', 'soy milk', 'cream of tartar', 'butter bean', 'peanut butter', 'almond butter', 'cocoa butter']);

const NON_WHEAT = new Set(['rice flour', 'chickpea flour', 'cornstarch', 'rice noodle', 'brown rice noodle', 'corn tortilla', 'ground almond']);

const COMPOSITE = new Set(['pastry', 'tortilla', 'burger bun', 'english muffin', 'pretzel', 'spring roll wrapper', 'digestive biscuit', 'christmas pudding', 'mincemeat', 'pasta sauce', 'hoisin sauce', 'gochujang', 'kimchi', 'doenjang', 'ssamjang', 'korean fish cake', 'hummus', 'bbq sauce', 'ketchup', 'mayonnaise', 'mustard', 'miso paste', 'sriracha', 'sweet chilli sauce', 'chorizo', 'black pudding', 'kielbasa', 'baked bean', 'refried bean', 'margarine', 'bread', 'chocolate', 'chocolate chip', 'pesto', 'stock', 'chicken stock', 'vegetable stock', 'beef stock', 'curry paste', 'sausage', 'horseradish sauce', 'custard powder']);

function ingredientCanonical(name: string): string {
  return canonicalize(name.replace(/^\s*to taste\s+/i, ''));
}

function family(name: string): string[] {
  const canonical = ingredientCanonical(name);
  const parent = getEntry(canonical)?.parent;
  return parent ? [canonical, parent] : [canonical];
}

function containsIngredient(name: string, source: string): boolean {
  return ` ${name.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `.includes(` ${source} `);
}

function ingredientParts(name: string): string[] {
  return name.split(/\s*(?:[,;]|\b(?:with|and|or|plus)\b)\s*/i).map(part => part.trim()).filter(Boolean);
}

function blockedIngredient(name: string, preferences: Exclusions): boolean {
  const parts = ingredientParts(name).map(raw => ({ raw, canonical: ingredientCanonical(raw), names: family(raw) }));
  if (preferences.excludedIngredients.some(item => {
    const excluded = canonicalize(item);
    return parts.some(part => part.names.includes(excluded) || containsIngredient(part.raw, excluded));
  })) return true;
  return preferences.avoidedAllergens.some(allergen => parts.some(part => {
    const alternative = (allergen === 'wheat' && NON_WHEAT.has(part.canonical)) ||
      (allergen === 'milk' && NON_DAIRY.has(part.canonical));
    if (alternative) return false;
    return (SOURCES[allergen] ?? []).some(source => part.names.includes(source) || containsIngredient(part.raw, source));
  }));
}

export function assessIngredients(names: string[], preferences: Exclusions) {
  const active = preferences.avoidedAllergens.length + preferences.excludedIngredients.length > 0;
  const reviewed = new Set((preferences.reviewedIngredients ?? []).map(canonicalize));
  const blocked = names.filter(name => blockedIngredient(name, preferences));
  const uncertain = active ? names.filter(name => !blocked.includes(name) &&
    !reviewed.has(ingredientCanonical(name)) &&
    (!getEntry(ingredientCanonical(name)) || family(name).some(part => COMPOSITE.has(part)))) : [];
  return { blocked, uncertain };
}

export function allowedPantry(pantry: string[], preferences: Exclusions): string[] {
  return pantry.filter(name => {
    const assessment = assessIngredients([name], preferences);
    return assessment.blocked.length + assessment.uncertain.length === 0;
  });
}
