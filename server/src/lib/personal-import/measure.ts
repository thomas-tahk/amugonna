export function ingredientMeasure(line: string): string | null {
  const text = line.trim();
  const quantity = /^(?:(?:about|approx\.?|around)\s+)?(?:\d+\s+\d+\/\d+|\d+\s*[¼½¾⅐-⅞]|\d+\/\d+|[¼½¾⅐-⅞]|\d+(?:\.\d+)?|(?:one|two|three|four|five|half|quarter|an|a)\b)/i.exec(text);
  if (!quantity) return null;
  const rest = text.slice(quantity[0].length);
  const unit = /^\s*(?:cups?|tbsp|tbs|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|kg|grams?|g|ml|litres?|liters?|cloves?|cans?|pinch(?:es)?|bunch(?:es)?|heads?|pieces?)(?=\s|$)/i.exec(rest);
  if (!unit && rest && !/^\s/.test(rest)) return null;
  return `${quantity[0]}${unit?.[0] ?? ''}`.trim();
}
