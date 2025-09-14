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
  
  // Grains & Carbs
  { name: 'Rice', category: 'Grains', commonUnits: ['cups', 'pounds'] },
  { name: 'Pasta', category: 'Grains', commonUnits: ['cups', 'ounces', 'pounds'] },
  { name: 'Bread', category: 'Grains', commonUnits: ['slices', 'loaves'] },
  { name: 'Quinoa', category: 'Grains', commonUnits: ['cups', 'ounces'] },
  { name: 'Potatoes', category: 'Grains', commonUnits: ['pieces', 'pounds', 'cups'] },
  
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
  
  // Canned/Packaged
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

async function main() {
  console.log('Starting database seed...');

  // Clear existing data in correct order to avoid foreign key constraints
  console.log('Clearing existing data...');
  await prisma.favoriteRecipe.deleteMany();
  await prisma.recipeDietaryTag.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.userIngredient.deleteMany();
  await prisma.userDietaryRestriction.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.dietaryRestriction.deleteMany();

  // Seed ingredients
  console.log('Seeding ingredients...');
  for (const ingredient of commonIngredients) {
    await prisma.ingredient.create({
      data: ingredient
    });
  }

  // Seed dietary restrictions
  console.log('Seeding dietary restrictions...');
  for (const restriction of dietaryRestrictions) {
    await prisma.dietaryRestriction.create({
      data: restriction
    });
  }

  console.log('Database seed completed successfully!');
  console.log(`Created ${commonIngredients.length} ingredients`);
  console.log(`Created ${dietaryRestrictions.length} dietary restrictions`);
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });