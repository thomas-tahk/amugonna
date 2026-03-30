import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const commonIngredients = [
  // Proteins
  { name: 'Chicken Breast', category: 'Protein', commonUnits: ['pounds', 'pieces', 'ounces'] },
  { name: 'Ground Beef', category: 'Protein', commonUnits: ['pounds', 'ounces'] },
  { name: 'Salmon Fillet', category: 'Protein', commonUnits: ['fillets', 'pounds', 'ounces'] },
  { name: 'Eggs', category: 'Protein', commonUnits: ['pieces', 'dozen'] },
  { name: 'Tofu', category: 'Protein', commonUnits: ['blocks', 'ounces'] },
  // Vegetables
  { name: 'Onion', category: 'Vegetables', commonUnits: ['pieces', 'cups', 'ounces'] },
  { name: 'Garlic', category: 'Vegetables', commonUnits: ['cloves', 'bulbs', 'teaspoons'] },
  { name: 'Carrots', category: 'Vegetables', commonUnits: ['pieces', 'cups', 'pounds'] },
  { name: 'Bell Peppers', category: 'Vegetables', commonUnits: ['pieces', 'cups'] },
  { name: 'Tomatoes', category: 'Vegetables', commonUnits: ['pieces', 'cups', 'pounds'] },
  { name: 'Spinach', category: 'Vegetables', commonUnits: ['cups', 'ounces', 'bunches'] },
  { name: 'Broccoli', category: 'Vegetables', commonUnits: ['cups', 'heads', 'florets'] },
  { name: 'Mushrooms', category: 'Vegetables', commonUnits: ['cups', 'ounces', 'pieces'] },
  // Grains
  { name: 'Rice', category: 'Grains', commonUnits: ['cups', 'pounds'] },
  { name: 'Pasta', category: 'Grains', commonUnits: ['cups', 'ounces', 'pounds'] },
  { name: 'Bread', category: 'Grains', commonUnits: ['slices', 'loaves'] },
  { name: 'Quinoa', category: 'Grains', commonUnits: ['cups', 'ounces'] },
  { name: 'Potatoes', category: 'Vegetables', commonUnits: ['pieces', 'pounds', 'cups'] },
  // Dairy
  { name: 'Milk', category: 'Dairy', commonUnits: ['cups', 'ounces', 'gallons'] },
  { name: 'Cheese', category: 'Dairy', commonUnits: ['cups', 'ounces', 'slices'] },
  { name: 'Butter', category: 'Dairy', commonUnits: ['tablespoons', 'sticks', 'cups'] },
  { name: 'Greek Yogurt', category: 'Dairy', commonUnits: ['cups', 'ounces'] },
  // Pantry Staples
  { name: 'Olive Oil', category: 'Oils & Fats', commonUnits: ['tablespoons', 'cups', 'ounces'] },
  { name: 'Salt', category: 'Seasonings', commonUnits: ['teaspoons', 'tablespoons', 'pinches'] },
  { name: 'Black Pepper', category: 'Seasonings', commonUnits: ['teaspoons', 'tablespoons', 'pinches'] },
  { name: 'Garlic Powder', category: 'Seasonings', commonUnits: ['teaspoons', 'tablespoons'] },
  { name: 'Paprika', category: 'Seasonings', commonUnits: ['teaspoons', 'tablespoons'] },
  { name: 'Cumin', category: 'Seasonings', commonUnits: ['teaspoons', 'tablespoons'] },
  { name: 'All-Purpose Flour', category: 'Baking', commonUnits: ['cups', 'pounds', 'ounces'] },
  { name: 'Sugar', category: 'Baking', commonUnits: ['cups', 'tablespoons', 'pounds'] },
  { name: 'Baking Powder', category: 'Baking', commonUnits: ['teaspoons', 'tablespoons'] },
  // Fruits
  { name: 'Apples', category: 'Fruits', commonUnits: ['pieces', 'cups', 'pounds'] },
  { name: 'Bananas', category: 'Fruits', commonUnits: ['pieces', 'cups'] },
  { name: 'Lemons', category: 'Fruits', commonUnits: ['pieces', 'tablespoons', 'teaspoons'] },
  { name: 'Oranges', category: 'Fruits', commonUnits: ['pieces', 'cups'] },
  // Canned
  { name: 'Canned Tomatoes', category: 'Canned Goods', commonUnits: ['cans', 'cups', 'ounces'] },
  { name: 'Chicken Broth', category: 'Canned Goods', commonUnits: ['cups', 'ounces', 'cartons'] },
  { name: 'Coconut Milk', category: 'Canned Goods', commonUnits: ['cans', 'cups', 'ounces'] },
  { name: 'Black Beans', category: 'Canned Goods', commonUnits: ['cans', 'cups'] }
];

const dietaryRestrictions = [
  { name: 'Vegetarian', description: 'No meat, poultry, or fish', category: 'diet' },
  { name: 'Vegan', description: 'No animal products', category: 'diet' },
  { name: 'Gluten-Free', description: 'No wheat, barley, rye, or gluten-containing ingredients', category: 'intolerance' },
  { name: 'Dairy-Free', description: 'No milk or dairy products', category: 'intolerance' },
  { name: 'Nut Allergy', description: 'No tree nuts or peanuts', category: 'allergy' },
  { name: 'Shellfish Allergy', description: 'No shellfish or crustaceans', category: 'allergy' },
  { name: 'Egg Allergy', description: 'No eggs or egg-containing products', category: 'allergy' },
  { name: 'Soy Allergy', description: 'No soy or soy-containing products', category: 'allergy' },
  { name: 'Keto', description: 'Low carbohydrate, high fat diet', category: 'diet' },
  { name: 'Paleo', description: 'No grains, legumes, or processed foods', category: 'diet' },
  { name: 'Low Sodium', description: 'Reduced sodium intake', category: 'diet' },
  { name: 'Diabetic Friendly', description: 'Low sugar and controlled carbohydrates', category: 'diet' }
];

// TheMealDB categories to seed and how many meals to pull from each
const MEAL_DB_CATEGORIES: { name: string; limit: number }[] = [
  { name: 'Chicken', limit: 6 },
  { name: 'Beef', limit: 5 },
  { name: 'Pasta', limit: 5 },
  { name: 'Seafood', limit: 5 },
  { name: 'Vegetarian', limit: 5 },
  { name: 'Vegan', limit: 4 },
  { name: 'Breakfast', limit: 4 },
  { name: 'Lamb', limit: 4 },
  { name: 'Pork', limit: 4 },
  { name: 'Dessert', limit: 4 },
];

interface MealSummary {
  idMeal: string;
  strMeal: string;
}

interface MealDetail {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags: string | null;
  strSource: string | null;
  [key: string]: any; // strIngredient1..20, strMeasure1..20
}

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse "3/4 cup", "1 tsp", "pinch of" etc into quantity + unit
function parseMeasure(measure: string): { quantity: number | null; unit: string | null } {
  const trimmed = measure.trim();
  if (!trimmed) return { quantity: null, unit: null };

  const match = trimmed.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)\s*(.*)/);
  if (match) {
    const numStr = match[1].trim();
    const rest = match[2].trim() || null;

    let quantity: number;
    if (numStr.includes(' ')) {
      const [whole, frac] = numStr.split(' ');
      const [n, d] = frac.split('/');
      quantity = parseInt(whole) + parseInt(n) / parseInt(d);
    } else if (numStr.includes('/')) {
      const [n, d] = numStr.split('/');
      quantity = parseInt(n) / parseInt(d);
    } else {
      quantity = parseFloat(numStr);
    }

    return { quantity: isNaN(quantity) ? null : quantity, unit: rest };
  }

  return { quantity: null, unit: trimmed };
}

// Get ingredient by name (case-insensitive) or create it
async function getOrCreateIngredient(name: string): Promise<number> {
  const normalized = name.trim();
  const existing = await prisma.ingredient.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } },
    select: { id: true }
  });
  if (existing) return existing.id;

  const created = await prisma.ingredient.create({
    data: { name: normalized, category: 'Other', commonUnits: [] }
  });
  return created.id;
}

// Infer dietary tags from TheMealDB category
function inferDietaryTags(category: string): string[] {
  if (category === 'Vegan') return ['vegan', 'vegetarian'];
  if (category === 'Vegetarian') return ['vegetarian'];
  return [];
}

async function seedTheMealDB(systemUserId: number): Promise<number> {
  let totalSeeded = 0;

  for (const { name: category, limit } of MEAL_DB_CATEGORIES) {
    console.log(`  Fetching category: ${category}`);

    let mealList: MealSummary[] = [];
    try {
      const listData = await fetchJSON(
        `https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`
      );
      mealList = (listData.meals || []).slice(0, limit);
    } catch (err) {
      console.warn(`  Failed to fetch category ${category}:`, err);
      continue;
    }

    for (const mealSummary of mealList) {
      await sleep(150); // be respectful of the free API

      // Skip if already seeded
      const alreadySeeded = await prisma.recipe.findFirst({
        where: { sourceUrl: `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealSummary.idMeal}` }
      });
      if (alreadySeeded) {
        console.log(`  Skipping (already exists): ${mealSummary.strMeal}`);
        continue;
      }

      let meal: MealDetail;
      try {
        const detail = await fetchJSON(
          `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealSummary.idMeal}`
        );
        meal = detail.meals[0];
      } catch (err) {
        console.warn(`  Failed to fetch meal ${mealSummary.idMeal}:`, err);
        continue;
      }

      // Parse ingredients (TheMealDB stores them as strIngredient1..20)
      const recipeIngredientData: {
        ingredientId: number;
        quantity: number | null;
        unit: string | null;
        optional: boolean;
        substitutions: string[];
      }[] = [];

      for (let i = 1; i <= 20; i++) {
        const ingredientName = meal[`strIngredient${i}`]?.trim();
        const measure = meal[`strMeasure${i}`]?.trim();
        if (!ingredientName) break;

        try {
          const ingredientId = await getOrCreateIngredient(ingredientName);
          const { quantity, unit } = parseMeasure(measure || '');
          recipeIngredientData.push({
            ingredientId,
            quantity,
            unit,
            optional: false,
            substitutions: []
          });
        } catch (err) {
          console.warn(`  Skipping ingredient "${ingredientName}":`, err);
        }
      }

      // Parse tags
      const tags = meal.strTags
        ? meal.strTags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
        : [];

      const cuisineTypes = meal.strArea && meal.strArea !== 'Unknown' ? [meal.strArea] : [];
      const dietaryTags = inferDietaryTags(category);

      try {
        await prisma.recipe.create({
          data: {
            title: meal.strMeal,
            description: `A ${category.toLowerCase()} recipe from ${meal.strArea || 'around the world'}.`,
            instructions: meal.strInstructions,
            sourceUrl: `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`,
            sourceName: 'TheMealDB',
            images: meal.strMealThumb ? [meal.strMealThumb] : [],
            cuisineTypes,
            tags,
            dietaryTags,
            allergens: [],
            servings: 4,
            isPublic: true,
            createdBy: systemUserId,
            recipeIngredients: {
              create: recipeIngredientData
            }
          }
        });

        console.log(`  Seeded: ${meal.strMeal} (${recipeIngredientData.length} ingredients)`);
        totalSeeded++;
      } catch (err) {
        console.warn(`  Failed to create recipe "${meal.strMeal}":`, err);
      }
    }
  }

  return totalSeeded;
}

async function main() {
  console.log('Starting database seed...');

  // Upsert ingredients (safe to run multiple times)
  console.log('Upserting ingredients...');
  for (const ingredient of commonIngredients) {
    await prisma.ingredient.upsert({
      where: { name: ingredient.name },
      update: { category: ingredient.category, commonUnits: ingredient.commonUnits },
      create: ingredient
    });
  }
  console.log(`  ${commonIngredients.length} ingredients upserted`);

  // Upsert dietary restrictions
  console.log('Upserting dietary restrictions...');
  for (const restriction of dietaryRestrictions) {
    await prisma.dietaryRestriction.upsert({
      where: { name: restriction.name },
      update: {},
      create: restriction
    });
  }
  console.log(`  ${dietaryRestrictions.length} dietary restrictions upserted`);

  // Create or find system user (owns all seeded recipes)
  console.log('Ensuring system user exists...');
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@amugonna.internal' },
    update: {},
    create: {
      email: 'system@amugonna.internal',
      password: 'seed-user-no-login',
      firstName: 'Amugonna',
      lastName: 'System'
    }
  });
  console.log(`  System user ID: ${systemUser.id}`);

  // Seed TheMealDB recipes
  console.log('Seeding recipes from TheMealDB...');
  try {
    const count = await seedTheMealDB(systemUser.id);
    console.log(`  ${count} new recipes seeded from TheMealDB`);
  } catch (err) {
    console.error('TheMealDB seeding failed:', err);
    console.log('Continuing without recipe seed (network may be unavailable)');
  }

  console.log('\nDatabase seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
