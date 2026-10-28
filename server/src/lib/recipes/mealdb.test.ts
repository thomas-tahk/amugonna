import { describe, it, expect } from 'vitest';
import { mapMealDbMeal, type MealDbMeal } from './mealdb.js';

// Shape copied from TheMealDB's documented lookup/search response (content shortened).
const arrabiata: MealDbMeal = {
  idMeal: '52771',
  strMeal: 'Spicy Arrabiata Penne',
  strDrinkAlternate: null,
  strCategory: 'Vegetarian',
  strArea: 'Italian',
  strInstructions:
    'Bring a large pot of water to a boil. Add kosher salt to the boiling water, then add the pasta. Cook according to the package instructions, about 9 minutes.\r\nIn a large skillet over medium-high heat, add the olive oil and heat until the oil starts to shimmer. Add the garlic and cook, stirring, until fragrant, 1 to 2 minutes.\r\n\r\nAdd the chopped tomatoes, red chile flakes, Italian seasoning and salt and pepper to taste. Bring to a boil and cook for 5 minutes.\r\nServe with Parmigiano-Reggiano.',
  strMealThumb: 'https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg',
  strTags: 'Pasta,Curry',
  strYoutube: 'https://www.youtube.com/watch?v=1IszT_guI08',
  strIngredient1: 'penne rigate',
  strIngredient2: 'olive oil',
  strIngredient3: 'garlic',
  strIngredient4: 'chopped tomatoes',
  strIngredient5: 'red chile flakes',
  strIngredient6: 'italian seasoning',
  strIngredient7: 'basil',
  strIngredient8: 'Parmigiano-Reggiano',
  strIngredient9: '',
  strIngredient10: '',
  strIngredient11: '',
  strIngredient12: '',
  strIngredient13: '',
  strIngredient14: '',
  strIngredient15: '',
  strIngredient16: null,
  strIngredient17: null,
  strIngredient18: null,
  strIngredient19: null,
  strIngredient20: null,
  strMeasure1: '1 pound',
  strMeasure2: '1/4 cup',
  strMeasure3: '3 cloves',
  strMeasure4: '1 tin ',
  strMeasure5: '1/2 teaspoon',
  strMeasure6: '1/2 teaspoon',
  strMeasure7: '6 leaves',
  strMeasure8: 'spinkling',
  strMeasure9: ' ',
  strMeasure10: ' ',
  strMeasure11: ' ',
  strMeasure12: ' ',
  strMeasure13: ' ',
  strMeasure14: ' ',
  strMeasure15: ' ',
  strMeasure16: null,
  strMeasure17: null,
  strMeasure18: null,
  strMeasure19: null,
  strMeasure20: null,
  strSource: null,
  strImageSource: null,
  strCreativeCommonsConfirmed: null,
  dateModified: null,
};

describe('mapMealDbMeal', () => {
  const dto = mapMealDbMeal(arrabiata);

  it('maps the recipe-level fields', () => {
    expect(dto.externalSource).toBe('TheMealDB');
    expect(dto.externalId).toBe('52771');
    expect(dto.title).toBe('Spicy Arrabiata Penne');
    expect(dto.category).toBe('Vegetarian');
    expect(dto.area).toBe('Italian');
    expect(dto.imageUrl).toBe('https://www.themealdb.com/images/media/meals/ustsqw1468250014.jpg');
    expect(dto.sourceName).toBe('TheMealDB');
    expect(dto.attribution).toBe('Recipe from TheMealDB (themealdb.com)');
    expect(dto.license).toBe('TheMealDB API terms — free test key, development use');
    expect(dto.tags).toEqual(['Pasta', 'Curry']);
  });

  it('falls back to the TheMealDB page when strSource is blank, otherwise uses strSource', () => {
    expect(dto.sourceUrl).toBe('https://www.themealdb.com/meal/52771');
    expect(mapMealDbMeal({ ...arrabiata, strSource: '  ' }).sourceUrl).toBe('https://www.themealdb.com/meal/52771');
    expect(mapMealDbMeal({ ...arrabiata, strSource: 'https://example.com/penne' }).sourceUrl).toBe(
      'https://example.com/penne'
    );
  });

  it('turns the CRLF instructions into clean steps joined by newlines', () => {
    const steps = dto.instructions.split('\n');
    expect(steps).toHaveLength(4); // one step per source line; blank line dropped
    expect(dto.instructions).not.toContain('\r');
    expect(steps.every((s) => s.trim() === s && s.length > 0)).toBe(true);
    expect(steps[0]).toMatch(/^Bring a large pot of water to a boil\. Add kosher salt/);
    expect(steps[3]).toBe('Serve with Parmigiano-Reggiano.');
  });

  it('skips blank ingredient slots (16-20 are null, 9-15 are empty) and keeps order', () => {
    expect(dto.ingredients.map((i) => i.name)).toEqual([
      'penne rigate',
      'olive oil',
      'garlic',
      'chopped tomatoes',
      'red chile flakes',
      'italian seasoning',
      'basil',
      'Parmigiano-Reggiano',
    ]);
  });

  it('builds rawText, measure and canonical per ingredient', () => {
    const [penne, oil, garlic, tomatoes] = dto.ingredients;
    expect(penne).toMatchObject({ rawText: '1 pound penne rigate', measure: '1 pound' });
    expect(oil).toMatchObject({ canonical: 'olive oil', measure: '1/4 cup', rawText: '1/4 cup olive oil' });
    expect(garlic.canonical).toBe('garlic');
    expect(tomatoes).toMatchObject({ measure: '1 tin', rawText: '1 tin chopped tomatoes' });
    expect(tomatoes.canonical).toBeTruthy();
  });

  it('uses a null measure and bare name as rawText when the measure is blank', () => {
    const m = mapMealDbMeal({ ...arrabiata, strIngredient9: 'Salt', strMeasure9: ' ' });
    const salt = m.ingredients.find((i) => i.name === 'Salt')!;
    expect(salt.measure).toBeNull();
    expect(salt.rawText).toBe('Salt');
    expect(salt.canonical).toBe('salt');
  });

  it('can be re-labelled for fixtures (own source, no TheMealDB page link)', () => {
    const f = mapMealDbMeal(arrabiata, {
      externalSource: 'fixture',
      sourceName: 'Amugonna fixture',
      attribution: 'Amugonna test fixture',
      license: 'Original test data',
      linkToMealDb: false,
    });
    expect(f).toMatchObject({
      externalSource: 'fixture',
      attribution: 'Amugonna test fixture',
      license: 'Original test data',
      sourceUrl: null,
    });
  });

  it('tolerates a meal with missing optional fields', () => {
    const d = mapMealDbMeal({ idMeal: '1', strMeal: 'Toast', strInstructions: null });
    expect(d).toMatchObject({
      title: 'Toast',
      category: null,
      area: null,
      imageUrl: null,
      instructions: '',
      ingredients: [],
    });
  });
});
