import { describe, it, expect } from 'vitest';
import { mapMealDbMeal, type MealDbMeal } from './mealdb.js';

// Original test meal in TheMealDB's response shape (unused slots are "", " " or null).
const lentilBowl: MealDbMeal = {
  idMeal: 'test-1001',
  strMeal: 'Smoky Lentil Bowl',
  strDrinkAlternate: null,
  strCategory: 'Vegetarian',
  strArea: 'Test Kitchen',
  strInstructions:
    'STEP 1\r\nRinse the lentils and simmer in plenty of water for 20 minutes. Drain well.\r\n\r\nSTEP 2\r\nFry the sliced onion in the oil until soft, about 8 minutes. Stir in the garlic and smoked paprika.\r\nFold in the lentils and the tomatoes, then warm through for 5 minutes.\r\nServe topped with yoghurt.',
  strMealThumb: 'https://example.com/images/lentil-bowl.jpg',
  strTags: 'Lentils,Quick',
  strYoutube: '',
  strIngredient1: 'green lentils',
  strIngredient2: 'olive oil',
  strIngredient3: 'garlic',
  strIngredient4: 'chopped tomatoes',
  strIngredient5: 'smoked paprika',
  strIngredient6: 'onion',
  strIngredient7: 'natural yoghurt',
  strIngredient8: 'Sea Salt',
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
  strMeasure1: '250g',
  strMeasure2: '2 tbsp',
  strMeasure3: '3 cloves',
  strMeasure4: '1 tin ',
  strMeasure5: '1 tsp',
  strMeasure6: '1',
  strMeasure7: 'To serve',
  strMeasure8: ' ',
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
  const dto = mapMealDbMeal(lentilBowl);

  it('maps the recipe-level fields', () => {
    expect(dto.externalSource).toBe('TheMealDB');
    expect(dto.externalId).toBe('test-1001');
    expect(dto.title).toBe('Smoky Lentil Bowl');
    expect(dto.category).toBe('Vegetarian');
    expect(dto.area).toBe('Test Kitchen');
    expect(dto.imageUrl).toBe('https://example.com/images/lentil-bowl.jpg');
    expect(dto.sourceName).toBe('TheMealDB');
    expect(dto.attribution).toBe('Recipe from TheMealDB (themealdb.com)');
    expect(dto.license).toBe('TheMealDB API terms — free test key, development use');
    expect(dto.tags).toEqual(['Lentils', 'Quick']);
  });

  it('falls back to the TheMealDB page when strSource is blank, otherwise uses strSource', () => {
    expect(dto.sourceUrl).toBe('https://www.themealdb.com/meal/test-1001');
    expect(mapMealDbMeal({ ...lentilBowl, strSource: '  ' }).sourceUrl).toBe('https://www.themealdb.com/meal/test-1001');
    expect(mapMealDbMeal({ ...lentilBowl, strSource: 'https://example.com/lentils' }).sourceUrl).toBe(
      'https://example.com/lentils'
    );
  });

  it('turns the CRLF instructions into clean steps joined by newlines', () => {
    const steps = dto.instructions.split('\n');
    expect(steps).toHaveLength(4); // STEP headers and the blank line dropped
    expect(dto.instructions).not.toContain('\r');
    expect(steps.every((s) => s.trim() === s && s.length > 0)).toBe(true);
    expect(steps[0]).toBe('Rinse the lentils and simmer in plenty of water for 20 minutes. Drain well.');
    expect(steps[3]).toBe('Serve topped with yoghurt.');
  });

  it('skips blank ingredient slots (16-20 are null, 9-15 are empty) and keeps order', () => {
    expect(dto.ingredients.map((i) => i.name)).toEqual([
      'green lentils',
      'olive oil',
      'garlic',
      'chopped tomatoes',
      'smoked paprika',
      'onion',
      'natural yoghurt',
      'Sea Salt',
    ]);
  });

  it('builds rawText, measure and canonical per ingredient', () => {
    const [lentils, oil, garlic, tomatoes] = dto.ingredients;
    expect(lentils).toMatchObject({ rawText: '250g green lentils', measure: '250g' });
    expect(oil).toMatchObject({ canonical: 'olive oil', measure: '2 tbsp', rawText: '2 tbsp olive oil' });
    expect(garlic.canonical).toBe('garlic');
    expect(tomatoes).toMatchObject({ measure: '1 tin', rawText: '1 tin chopped tomatoes' });
    expect(tomatoes.canonical).toBeTruthy();
  });

  it('uses a null measure and bare name as rawText when the measure is blank', () => {
    const m = mapMealDbMeal({ ...lentilBowl, strIngredient9: 'Salt', strMeasure9: ' ' });
    const salt = m.ingredients.find((i) => i.name === 'Salt')!;
    expect(salt.measure).toBeNull();
    expect(salt.rawText).toBe('Salt');
    expect(salt.canonical).toBe('salt');
  });

  it('can be re-labelled for fixtures (own source, no TheMealDB page link)', () => {
    const f = mapMealDbMeal(lentilBowl, {
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
