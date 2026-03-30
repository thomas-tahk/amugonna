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
  { name: 'Potatoes', category: 'Vegetables', commonUnits: ['pieces', 'pounds', 'cups'] },
  // Grains
  { name: 'Rice', category: 'Grains', commonUnits: ['cups', 'pounds'] },
  { name: 'Pasta', category: 'Grains', commonUnits: ['cups', 'ounces', 'pounds'] },
  { name: 'Bread', category: 'Grains', commonUnits: ['slices', 'loaves'] },
  { name: 'Quinoa', category: 'Grains', commonUnits: ['cups', 'ounces'] },
  // Dairy
  { name: 'Milk', category: 'Dairy', commonUnits: ['cups', 'ounces', 'gallons'] },
  { name: 'Cheese', category: 'Dairy', commonUnits: ['cups', 'ounces', 'slices'] },
  { name: 'Butter', category: 'Dairy', commonUnits: ['tablespoons', 'sticks', 'cups'] },
  { name: 'Greek Yogurt', category: 'Dairy', commonUnits: ['cups', 'ounces'] },
  // Pantry
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
  { name: 'Black Beans', category: 'Canned Goods', commonUnits: ['cans', 'cups'] },
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
  { name: 'Diabetic Friendly', description: 'Low sugar and controlled carbohydrates', category: 'diet' },
];

// ─── Static recipe dataset ────────────────────────────────────────────────────
// Ingredients use the exact names from commonIngredients above where possible
// so pantry matching works from day one.

interface StaticIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  optional?: boolean;
}

interface StaticRecipe {
  title: string;
  description: string;
  instructions: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  cuisineTypes: string[];
  tags: string[];
  dietaryTags: string[];
  allergens: string[];
  ingredients: StaticIngredient[];
}

const staticRecipes: StaticRecipe[] = [
  {
    title: 'Chicken Stir Fry',
    description: 'Quick and colourful stir fry with chicken and vegetables in a savoury sauce.',
    instructions: `Cut the Chicken Breast into thin strips and season with Salt and Black Pepper.
Heat Olive Oil in a large wok or frying pan over high heat.
Add the chicken and cook for 4–5 minutes until golden. Remove and set aside.
Add more Olive Oil to the pan. Stir fry the Garlic for 30 seconds until fragrant.
Add Bell Peppers and Broccoli. Stir fry for 3–4 minutes until just tender.
Return the chicken to the pan. Pour in the soy sauce and stir to coat everything.
Cook for another 1–2 minutes. Serve immediately over Rice.`,
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['Asian'],
    tags: ['quick', 'weeknight', 'stir fry'],
    dietaryTags: ['dairy-free'],
    allergens: ['soy'],
    ingredients: [
      { name: 'Chicken Breast', quantity: 1.5, unit: 'pounds' },
      { name: 'Bell Peppers', quantity: 2, unit: 'pieces' },
      { name: 'Broccoli', quantity: 2, unit: 'cups' },
      { name: 'Garlic', quantity: 3, unit: 'cloves' },
      { name: 'Olive Oil', quantity: 2, unit: 'tablespoons' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
      { name: 'Soy Sauce', quantity: 3, unit: 'tablespoons' },
      { name: 'Rice', quantity: 2, unit: 'cups' },
    ],
  },
  {
    title: 'Spaghetti Bolognese',
    description: 'Classic Italian meat sauce simmered low and slow for deep, rich flavour.',
    instructions: `Heat Olive Oil in a large saucepan over medium heat.
Add finely diced Onion and Carrots. Cook for 5–7 minutes until softened.
Add minced Garlic and cook for 1 minute.
Add Ground Beef, breaking it up with a spoon. Brown for 6–8 minutes.
Pour in Canned Tomatoes. Season with Salt, Black Pepper, and a pinch of Sugar.
Simmer uncovered for 20–25 minutes, stirring occasionally, until sauce thickens.
Cook Pasta according to package instructions. Drain, reserving a cup of pasta water.
Toss pasta with the sauce, adding pasta water to loosen if needed.
Serve with grated Cheese.`,
    prepTime: 10,
    cookTime: 35,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['Italian'],
    tags: ['classic', 'pasta', 'meat sauce'],
    dietaryTags: [],
    allergens: ['gluten'],
    ingredients: [
      { name: 'Ground Beef', quantity: 1, unit: 'pounds' },
      { name: 'Pasta', quantity: 12, unit: 'ounces' },
      { name: 'Canned Tomatoes', quantity: 1, unit: 'cans' },
      { name: 'Onion', quantity: 1, unit: 'pieces' },
      { name: 'Carrots', quantity: 1, unit: 'pieces' },
      { name: 'Garlic', quantity: 3, unit: 'cloves' },
      { name: 'Olive Oil', quantity: 2, unit: 'tablespoons' },
      { name: 'Salt', quantity: 1, unit: 'teaspoons' },
      { name: 'Black Pepper', quantity: 0.5, unit: 'teaspoons' },
      { name: 'Sugar', quantity: 1, unit: 'teaspoons' },
      { name: 'Cheese', quantity: null, unit: 'to taste', optional: true },
    ],
  },
  {
    title: 'Chicken Noodle Soup',
    description: 'Comforting homemade chicken soup — the cure for everything.',
    instructions: `Place Chicken Breast in a large pot with Chicken Broth and enough water to cover.
Bring to a boil, then reduce to a gentle simmer. Skim any foam from the surface.
Add diced Onion, sliced Carrots, and minced Garlic. Season with Salt and Black Pepper.
Simmer for 20 minutes until chicken is cooked through.
Remove chicken, shred with two forks, and return to the pot.
Add Pasta (or egg noodles) and cook for 8–10 minutes until tender.
Taste, adjust seasoning, and serve hot.`,
    prepTime: 10,
    cookTime: 35,
    servings: 6,
    difficulty: 'easy',
    cuisineTypes: ['American'],
    tags: ['soup', 'comfort food', 'winter'],
    dietaryTags: ['dairy-free'],
    allergens: ['gluten'],
    ingredients: [
      { name: 'Chicken Breast', quantity: 1, unit: 'pounds' },
      { name: 'Chicken Broth', quantity: 6, unit: 'cups' },
      { name: 'Carrots', quantity: 2, unit: 'pieces' },
      { name: 'Onion', quantity: 1, unit: 'pieces' },
      { name: 'Garlic', quantity: 2, unit: 'cloves' },
      { name: 'Pasta', quantity: 2, unit: 'cups' },
      { name: 'Salt', quantity: 1, unit: 'teaspoons' },
      { name: 'Black Pepper', quantity: 0.5, unit: 'teaspoons' },
    ],
  },
  {
    title: 'Vegetable Coconut Curry',
    description: 'Fragrant, creamy vegan curry packed with vegetables.',
    instructions: `Heat Olive Oil in a large pot over medium heat.
Fry diced Onion for 5 minutes until soft. Add minced Garlic and cook for 1 minute.
Add Cumin and Paprika, stirring for 30 seconds to bloom the spices.
Add diced Potatoes and Carrots. Stir to coat with the spices.
Pour in Canned Tomatoes and Coconut Milk. Season with Salt.
Bring to a boil, then simmer for 20 minutes until potatoes are tender.
Stir in fresh Spinach and cook for 2 minutes until wilted.
Serve over Rice with a squeeze of Lemon.`,
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['Indian'],
    tags: ['vegan', 'curry', 'weeknight'],
    dietaryTags: ['vegan', 'vegetarian', 'dairy-free', 'gluten-free'],
    allergens: [],
    ingredients: [
      { name: 'Potatoes', quantity: 3, unit: 'pieces' },
      { name: 'Carrots', quantity: 2, unit: 'pieces' },
      { name: 'Spinach', quantity: 2, unit: 'cups' },
      { name: 'Onion', quantity: 1, unit: 'pieces' },
      { name: 'Garlic', quantity: 3, unit: 'cloves' },
      { name: 'Canned Tomatoes', quantity: 1, unit: 'cans' },
      { name: 'Coconut Milk', quantity: 1, unit: 'cans' },
      { name: 'Cumin', quantity: 1.5, unit: 'teaspoons' },
      { name: 'Paprika', quantity: 1, unit: 'teaspoons' },
      { name: 'Olive Oil', quantity: 2, unit: 'tablespoons' },
      { name: 'Salt', quantity: 1, unit: 'teaspoons' },
      { name: 'Rice', quantity: 2, unit: 'cups' },
      { name: 'Lemons', quantity: 0.5, unit: 'pieces', optional: true },
    ],
  },
  {
    title: 'Mushroom Risotto',
    description: 'Creamy, restaurant-quality risotto made at home.',
    instructions: `Heat Chicken Broth in a saucepan and keep warm on low heat.
In a separate wide pan, melt Butter with Olive Oil over medium heat.
Sauté diced Onion for 4 minutes. Add sliced Mushrooms and cook for 5 minutes.
Add minced Garlic and cook for 1 minute.
Add Rice and stir for 2 minutes to coat with the butter.
Add a ladleful of warm broth and stir until absorbed. Repeat, adding broth one ladle at a time, stirring constantly. This takes about 18–20 minutes total.
When rice is creamy and just tender, remove from heat.
Stir in grated Cheese and a knob of Butter. Season with Salt and Black Pepper.
Rest for 2 minutes, then serve immediately.`,
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    difficulty: 'medium',
    cuisineTypes: ['Italian'],
    tags: ['risotto', 'comfort food', 'vegetarian'],
    dietaryTags: ['vegetarian', 'gluten-free'],
    allergens: ['dairy'],
    ingredients: [
      { name: 'Rice', quantity: 1.5, unit: 'cups' },
      { name: 'Mushrooms', quantity: 3, unit: 'cups' },
      { name: 'Onion', quantity: 1, unit: 'pieces' },
      { name: 'Garlic', quantity: 2, unit: 'cloves' },
      { name: 'Chicken Broth', quantity: 4, unit: 'cups' },
      { name: 'Butter', quantity: 3, unit: 'tablespoons' },
      { name: 'Olive Oil', quantity: 1, unit: 'tablespoons' },
      { name: 'Cheese', quantity: 0.5, unit: 'cups' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
    ],
  },
  {
    title: 'Lemon Garlic Butter Salmon',
    description: 'Pan-seared salmon with a simple lemon butter sauce — on the table in 15 minutes.',
    instructions: `Pat Salmon Fillet dry with paper towels. Season both sides with Salt and Black Pepper.
Heat Olive Oil in a non-stick pan over medium-high heat until shimmering.
Place salmon skin-side up and cook for 4 minutes without moving.
Flip and cook for 3–4 more minutes until cooked through.
Reduce heat to medium-low. Push salmon to the side.
Add Butter and minced Garlic to the pan. Cook for 1 minute, swirling.
Squeeze Lemon juice over the salmon and spoon butter sauce over the top.
Serve immediately.`,
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    difficulty: 'easy',
    cuisineTypes: ['American'],
    tags: ['quick', 'healthy', 'fish'],
    dietaryTags: ['gluten-free'],
    allergens: ['fish', 'dairy'],
    ingredients: [
      { name: 'Salmon Fillet', quantity: 2, unit: 'fillets' },
      { name: 'Butter', quantity: 2, unit: 'tablespoons' },
      { name: 'Garlic', quantity: 2, unit: 'cloves' },
      { name: 'Lemons', quantity: 1, unit: 'pieces' },
      { name: 'Olive Oil', quantity: 1, unit: 'tablespoons' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
    ],
  },
  {
    title: 'Greek Yogurt Pancakes',
    description: 'Extra fluffy pancakes with a subtle tang from Greek yogurt.',
    instructions: `Whisk together All-Purpose Flour, Sugar, Baking Powder, and a pinch of Salt in a bowl.
In a separate bowl, whisk together Eggs, Greek Yogurt, and Milk until smooth.
Pour the wet ingredients into the dry and stir until just combined — lumps are fine, don't overmix.
Heat a non-stick pan over medium heat and melt a little Butter.
Pour about 1/4 cup batter per pancake. Cook until bubbles form on the surface, about 2–3 minutes.
Flip and cook for another 1–2 minutes until golden.
Serve with your favourite toppings.`,
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['American'],
    tags: ['breakfast', 'brunch', 'pancakes'],
    dietaryTags: ['vegetarian'],
    allergens: ['gluten', 'dairy', 'eggs'],
    ingredients: [
      { name: 'All-Purpose Flour', quantity: 1.5, unit: 'cups' },
      { name: 'Greek Yogurt', quantity: 1, unit: 'cups' },
      { name: 'Eggs', quantity: 2, unit: 'pieces' },
      { name: 'Milk', quantity: 0.5, unit: 'cups' },
      { name: 'Sugar', quantity: 2, unit: 'tablespoons' },
      { name: 'Baking Powder', quantity: 2, unit: 'teaspoons' },
      { name: 'Salt', quantity: 0.5, unit: 'teaspoons' },
      { name: 'Butter', quantity: 1, unit: 'tablespoons' },
    ],
  },
  {
    title: 'Black Bean Tacos',
    description: 'Simple, satisfying vegetarian tacos with spiced black beans.',
    instructions: `Drain and rinse Black Beans. Set aside.
Heat Olive Oil in a pan over medium heat.
Sauté diced Onion for 4 minutes until softened. Add minced Garlic, Cumin, and Paprika.
Cook for 1 minute until fragrant.
Add Black Beans and a splash of water. Mash about half the beans with a fork.
Season with Salt and Black Pepper. Cook for 3–4 minutes until heated through.
Warm the tortillas or Bread in a dry pan or directly over a gas flame.
Assemble tacos with bean mixture, diced Tomatoes, and any toppings you like.`,
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['Mexican'],
    tags: ['vegetarian', 'tacos', 'quick'],
    dietaryTags: ['vegetarian', 'vegan', 'dairy-free'],
    allergens: ['gluten'],
    ingredients: [
      { name: 'Black Beans', quantity: 2, unit: 'cans' },
      { name: 'Onion', quantity: 1, unit: 'pieces' },
      { name: 'Garlic', quantity: 2, unit: 'cloves' },
      { name: 'Tomatoes', quantity: 2, unit: 'pieces' },
      { name: 'Cumin', quantity: 1.5, unit: 'teaspoons' },
      { name: 'Paprika', quantity: 1, unit: 'teaspoons' },
      { name: 'Olive Oil', quantity: 1, unit: 'tablespoons' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
      { name: 'Bread', quantity: 8, unit: 'slices' },
    ],
  },
  {
    title: 'Spinach and Cheese Omelette',
    description: 'A perfectly folded omelette — a fast, protein-rich meal any time of day.',
    instructions: `Crack Eggs into a bowl, add a pinch of Salt and Black Pepper, and beat until smooth.
Melt Butter in a non-stick pan over medium heat, swirling to coat.
Pour in eggs. As the edges set, use a spatula to pull them toward the centre, letting liquid egg flow to the edges.
When the eggs are mostly set but still slightly glossy on top, add Spinach and Cheese to one half.
Fold the other half over and slide onto a plate.
Serve immediately.`,
    prepTime: 5,
    cookTime: 5,
    servings: 1,
    difficulty: 'easy',
    cuisineTypes: ['French'],
    tags: ['breakfast', 'quick', 'eggs'],
    dietaryTags: ['vegetarian', 'gluten-free'],
    allergens: ['eggs', 'dairy'],
    ingredients: [
      { name: 'Eggs', quantity: 3, unit: 'pieces' },
      { name: 'Spinach', quantity: 1, unit: 'cups' },
      { name: 'Cheese', quantity: 0.25, unit: 'cups' },
      { name: 'Butter', quantity: 1, unit: 'tablespoons' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
    ],
  },
  {
    title: 'Chicken Tikka Masala',
    description: 'Rich, aromatic tomato-cream curry — one of the most beloved dishes in the world.',
    instructions: `Cut Chicken Breast into chunks. Season with Paprika, Cumin, Salt, and Black Pepper.
Heat Olive Oil in a large pan over high heat. Brown the chicken in batches, about 3 minutes per side. Remove and set aside.
Reduce heat to medium. Add diced Onion to the same pan and cook for 5 minutes.
Add minced Garlic and cook for 1 minute.
Add Cumin and Paprika, stir for 30 seconds.
Pour in Canned Tomatoes and Coconut Milk. Stir to combine.
Return the chicken to the pan. Simmer for 15–20 minutes until sauce thickens.
Season to taste. Serve with Rice and fresh Spinach wilted into the sauce if desired.`,
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    difficulty: 'medium',
    cuisineTypes: ['Indian'],
    tags: ['curry', 'classic', 'weeknight'],
    dietaryTags: ['gluten-free', 'dairy-free'],
    allergens: [],
    ingredients: [
      { name: 'Chicken Breast', quantity: 1.5, unit: 'pounds' },
      { name: 'Canned Tomatoes', quantity: 1, unit: 'cans' },
      { name: 'Coconut Milk', quantity: 0.5, unit: 'cans' },
      { name: 'Onion', quantity: 1, unit: 'pieces' },
      { name: 'Garlic', quantity: 4, unit: 'cloves' },
      { name: 'Cumin', quantity: 2, unit: 'teaspoons' },
      { name: 'Paprika', quantity: 2, unit: 'teaspoons' },
      { name: 'Olive Oil', quantity: 2, unit: 'tablespoons' },
      { name: 'Salt', quantity: 1, unit: 'teaspoons' },
      { name: 'Black Pepper', quantity: 0.5, unit: 'teaspoons' },
      { name: 'Rice', quantity: 2, unit: 'cups' },
      { name: 'Spinach', quantity: 2, unit: 'cups', optional: true },
    ],
  },
  {
    title: 'Beef and Vegetable Tacos',
    description: 'Seasoned ground beef tacos with fresh toppings.',
    instructions: `Heat Olive Oil in a pan over medium-high heat.
Add Ground Beef and cook, breaking it up, until browned — about 6–8 minutes. Drain excess fat.
Add diced Onion and Bell Peppers. Cook for 3–4 minutes.
Add minced Garlic, Cumin, and Paprika. Stir for 1 minute.
Season with Salt and Black Pepper. Add a splash of water if it looks dry.
Simmer for 2–3 minutes.
Warm tortillas or Bread in a dry pan.
Serve the beef mixture in tortillas with diced Tomatoes and any toppings you like.`,
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['Mexican'],
    tags: ['tacos', 'beef', 'weeknight'],
    dietaryTags: ['dairy-free'],
    allergens: ['gluten'],
    ingredients: [
      { name: 'Ground Beef', quantity: 1, unit: 'pounds' },
      { name: 'Onion', quantity: 1, unit: 'pieces' },
      { name: 'Bell Peppers', quantity: 1, unit: 'pieces' },
      { name: 'Garlic', quantity: 2, unit: 'cloves' },
      { name: 'Tomatoes', quantity: 2, unit: 'pieces' },
      { name: 'Cumin', quantity: 1.5, unit: 'teaspoons' },
      { name: 'Paprika', quantity: 1, unit: 'teaspoons' },
      { name: 'Olive Oil', quantity: 1, unit: 'tablespoons' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
      { name: 'Bread', quantity: 8, unit: 'slices' },
    ],
  },
  {
    title: 'Tomato Soup',
    description: 'Smooth, velvety tomato soup — better than anything from a can.',
    instructions: `Melt Butter in a large pot over medium heat.
Add diced Onion and cook for 5 minutes until soft.
Add minced Garlic and cook for 1 minute.
Pour in Canned Tomatoes and Chicken Broth. Season with Salt and Black Pepper.
Bring to a boil, then simmer for 15 minutes.
Blend until smooth using an immersion blender (or carefully in a regular blender).
Taste and adjust seasoning. Serve with crusty Bread.`,
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['American'],
    tags: ['soup', 'comfort food', 'vegetarian'],
    dietaryTags: ['vegetarian', 'gluten-free'],
    allergens: ['dairy'],
    ingredients: [
      { name: 'Canned Tomatoes', quantity: 2, unit: 'cans' },
      { name: 'Onion', quantity: 1, unit: 'pieces' },
      { name: 'Garlic', quantity: 2, unit: 'cloves' },
      { name: 'Chicken Broth', quantity: 2, unit: 'cups' },
      { name: 'Butter', quantity: 2, unit: 'tablespoons' },
      { name: 'Salt', quantity: 1, unit: 'teaspoons' },
      { name: 'Black Pepper', quantity: 0.5, unit: 'teaspoons' },
      { name: 'Bread', quantity: 4, unit: 'slices', optional: true },
    ],
  },
  {
    title: 'Egg Fried Rice',
    description: 'Better than takeout — use leftover rice for the best results.',
    instructions: `If using freshly cooked Rice, spread it on a tray and refrigerate for at least 30 minutes.
Heat Olive Oil in a large wok or frying pan over high heat.
Add diced Onion and Carrots. Stir fry for 3 minutes.
Add minced Garlic and Bell Peppers. Cook for 2 minutes.
Push vegetables to the side. Add a little more oil and scramble Eggs in the centre.
Once eggs are just set, mix everything together.
Add cold Rice and stir fry for 3–4 minutes, breaking up clumps.
Pour in soy sauce and season with Salt and Black Pepper. Toss well and serve.`,
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['Asian'],
    tags: ['fried rice', 'quick', 'leftovers'],
    dietaryTags: ['dairy-free', 'vegetarian'],
    allergens: ['eggs', 'soy', 'gluten'],
    ingredients: [
      { name: 'Rice', quantity: 3, unit: 'cups' },
      { name: 'Eggs', quantity: 3, unit: 'pieces' },
      { name: 'Onion', quantity: 1, unit: 'pieces' },
      { name: 'Carrots', quantity: 1, unit: 'pieces' },
      { name: 'Bell Peppers', quantity: 1, unit: 'pieces' },
      { name: 'Garlic', quantity: 2, unit: 'cloves' },
      { name: 'Olive Oil', quantity: 2, unit: 'tablespoons' },
      { name: 'Soy Sauce', quantity: 2, unit: 'tablespoons' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
    ],
  },
  {
    title: 'Garlic Butter Chicken',
    description: 'Juicy pan-seared chicken breasts with an irresistible garlic butter sauce.',
    instructions: `Slice Chicken Breast in half horizontally to create thinner cutlets. Season with Salt, Black Pepper, and Garlic Powder.
Heat Olive Oil in a large skillet over medium-high heat.
Cook chicken for 4–5 minutes per side until golden and cooked through. Remove and rest.
Reduce heat to medium. Add Butter to the same pan.
Add minced Garlic and cook for 1 minute, stirring.
Add a squeeze of Lemon juice. Swirl to combine.
Return chicken to the pan and spoon sauce over the top.
Serve with your choice of sides.`,
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['American'],
    tags: ['chicken', 'quick', 'weeknight'],
    dietaryTags: ['gluten-free'],
    allergens: ['dairy'],
    ingredients: [
      { name: 'Chicken Breast', quantity: 1.5, unit: 'pounds' },
      { name: 'Butter', quantity: 3, unit: 'tablespoons' },
      { name: 'Garlic', quantity: 4, unit: 'cloves' },
      { name: 'Lemons', quantity: 0.5, unit: 'pieces' },
      { name: 'Olive Oil', quantity: 2, unit: 'tablespoons' },
      { name: 'Garlic Powder', quantity: 1, unit: 'teaspoons' },
      { name: 'Salt', quantity: 1, unit: 'teaspoons' },
      { name: 'Black Pepper', quantity: 0.5, unit: 'teaspoons' },
    ],
  },
  {
    title: 'Minestrone Soup',
    description: 'Hearty Italian vegetable soup loaded with beans and pasta.',
    instructions: `Heat Olive Oil in a large pot over medium heat.
Sauté diced Onion and Carrots for 5 minutes.
Add minced Garlic and cook for 1 minute.
Add Canned Tomatoes and Chicken Broth. Season with Salt and Black Pepper.
Bring to a boil. Add diced Potatoes and simmer for 10 minutes.
Add Black Beans and Pasta. Cook for another 8–10 minutes.
Stir in Spinach until wilted.
Adjust seasoning and serve with crusty Bread.`,
    prepTime: 15,
    cookTime: 30,
    servings: 6,
    difficulty: 'easy',
    cuisineTypes: ['Italian'],
    tags: ['soup', 'vegetarian', 'meal prep'],
    dietaryTags: ['vegetarian', 'dairy-free'],
    allergens: ['gluten'],
    ingredients: [
      { name: 'Onion', quantity: 1, unit: 'pieces' },
      { name: 'Carrots', quantity: 2, unit: 'pieces' },
      { name: 'Garlic', quantity: 3, unit: 'cloves' },
      { name: 'Canned Tomatoes', quantity: 1, unit: 'cans' },
      { name: 'Chicken Broth', quantity: 4, unit: 'cups' },
      { name: 'Potatoes', quantity: 2, unit: 'pieces' },
      { name: 'Black Beans', quantity: 1, unit: 'cans' },
      { name: 'Pasta', quantity: 1, unit: 'cups' },
      { name: 'Spinach', quantity: 2, unit: 'cups' },
      { name: 'Olive Oil', quantity: 2, unit: 'tablespoons' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
    ],
  },
  {
    title: 'Pasta Primavera',
    description: 'Fresh, vibrant pasta with seasonal vegetables in a light olive oil sauce.',
    instructions: `Cook Pasta according to package directions. Reserve 1 cup of pasta water before draining.
While pasta cooks, heat Olive Oil in a large pan over medium-high heat.
Sauté Broccoli florets for 4 minutes until tender-crisp.
Add Bell Peppers and Garlic. Cook for 2–3 more minutes.
Add halved Tomatoes and cook for 1 minute.
Toss the drained pasta into the pan with a splash of pasta water.
Season generously with Salt and Black Pepper. Toss to combine.
Top with grated Cheese and serve immediately.`,
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['Italian'],
    tags: ['pasta', 'vegetarian', 'spring'],
    dietaryTags: ['vegetarian'],
    allergens: ['gluten', 'dairy'],
    ingredients: [
      { name: 'Pasta', quantity: 12, unit: 'ounces' },
      { name: 'Broccoli', quantity: 2, unit: 'cups' },
      { name: 'Bell Peppers', quantity: 1, unit: 'pieces' },
      { name: 'Tomatoes', quantity: 2, unit: 'pieces' },
      { name: 'Garlic', quantity: 3, unit: 'cloves' },
      { name: 'Olive Oil', quantity: 3, unit: 'tablespoons' },
      { name: 'Cheese', quantity: 0.5, unit: 'cups' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
    ],
  },
  {
    title: 'Tofu Stir Fry',
    description: 'Crispy tofu with broccoli and peppers in a savoury sauce — a complete vegan meal.',
    instructions: `Press Tofu for 15 minutes, then cut into 1-inch cubes. Pat dry.
Heat Olive Oil in a large pan over high heat.
Add tofu and cook undisturbed for 3–4 minutes per side until golden and crispy. Remove and set aside.
Add a little more oil. Stir fry Broccoli and Bell Peppers for 4 minutes.
Add minced Garlic and cook for 30 seconds.
Return tofu to the pan. Pour over soy sauce and toss to coat.
Season with Salt and Black Pepper. Serve over Rice.`,
    prepTime: 20,
    cookTime: 15,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['Asian'],
    tags: ['vegan', 'stir fry', 'tofu'],
    dietaryTags: ['vegan', 'vegetarian', 'dairy-free'],
    allergens: ['soy'],
    ingredients: [
      { name: 'Tofu', quantity: 14, unit: 'ounces' },
      { name: 'Broccoli', quantity: 2, unit: 'cups' },
      { name: 'Bell Peppers', quantity: 2, unit: 'pieces' },
      { name: 'Garlic', quantity: 3, unit: 'cloves' },
      { name: 'Olive Oil', quantity: 3, unit: 'tablespoons' },
      { name: 'Soy Sauce', quantity: 3, unit: 'tablespoons' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
      { name: 'Rice', quantity: 2, unit: 'cups' },
    ],
  },
  {
    title: 'Apple Crumble',
    description: 'Warm baked apples under a buttery oat-free crumble — simple and deeply satisfying.',
    instructions: `Preheat oven to 375°F (190°C).
Peel, core, and slice Apples. Toss with 2 tablespoons Sugar and a pinch of Salt.
Spread apples in a baking dish.
Mix All-Purpose Flour with the remaining Sugar and a pinch of Salt.
Rub cold Butter into the flour mixture until it resembles coarse breadcrumbs.
Spread the crumble evenly over the apples.
Bake for 35–40 minutes until the topping is golden and apples are bubbling.
Serve warm with Greek Yogurt or Milk.`,
    prepTime: 15,
    cookTime: 40,
    servings: 6,
    difficulty: 'easy',
    cuisineTypes: ['British'],
    tags: ['dessert', 'baking', 'autumn'],
    dietaryTags: ['vegetarian'],
    allergens: ['gluten', 'dairy'],
    ingredients: [
      { name: 'Apples', quantity: 6, unit: 'pieces' },
      { name: 'All-Purpose Flour', quantity: 1, unit: 'cups' },
      { name: 'Sugar', quantity: 0.5, unit: 'cups' },
      { name: 'Butter', quantity: 0.5, unit: 'cups' },
      { name: 'Salt', quantity: 0.25, unit: 'teaspoons' },
      { name: 'Greek Yogurt', quantity: null, unit: 'to serve', optional: true },
    ],
  },
  {
    title: 'Banana Pancakes',
    description: 'Two-ingredient banana pancakes — naturally sweet, gluten-free, and ready in minutes.',
    instructions: `Mash ripe Bananas in a bowl until very smooth — no large lumps.
Crack in Eggs and mix well. Batter will be thin and loose.
Heat a non-stick pan over medium heat. Add a small amount of Butter.
Pour small rounds of batter (about 2 tablespoons each). Cook for 2 minutes.
Flip carefully — these are more delicate than regular pancakes — and cook for 1 minute.
Serve immediately. They don't keep well so eat straight away.`,
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    difficulty: 'easy',
    cuisineTypes: ['American'],
    tags: ['breakfast', 'gluten-free', 'quick', 'healthy'],
    dietaryTags: ['vegetarian', 'gluten-free', 'dairy-free'],
    allergens: ['eggs'],
    ingredients: [
      { name: 'Bananas', quantity: 2, unit: 'pieces' },
      { name: 'Eggs', quantity: 2, unit: 'pieces' },
      { name: 'Butter', quantity: 1, unit: 'teaspoons' },
    ],
  },
  {
    title: 'Quinoa Buddha Bowl',
    description: 'Nourishing grain bowl with roasted vegetables and a simple dressing.',
    instructions: `Cook Quinoa according to package directions (usually 1 cup quinoa to 2 cups water, 15 minutes).
While quinoa cooks, dice Carrots and Bell Peppers. Toss with Olive Oil, Salt, and Black Pepper.
Roast vegetables at 400°F (200°C) for 20–25 minutes until caramelised.
Wilt Spinach in a dry pan for 1–2 minutes.
Drain and rinse Black Beans.
Assemble bowls: base of quinoa, then vegetables, beans, and spinach.
Drizzle with Olive Oil and a squeeze of Lemon. Season to taste.`,
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    difficulty: 'easy',
    cuisineTypes: ['American'],
    tags: ['healthy', 'vegan', 'meal prep', 'bowls'],
    dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'],
    allergens: [],
    ingredients: [
      { name: 'Quinoa', quantity: 1.5, unit: 'cups' },
      { name: 'Carrots', quantity: 2, unit: 'pieces' },
      { name: 'Bell Peppers', quantity: 1, unit: 'pieces' },
      { name: 'Spinach', quantity: 2, unit: 'cups' },
      { name: 'Black Beans', quantity: 1, unit: 'cans' },
      { name: 'Olive Oil', quantity: 3, unit: 'tablespoons' },
      { name: 'Lemons', quantity: 1, unit: 'pieces' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
    ],
  },
  {
    title: 'Scrambled Eggs on Toast',
    description: 'Soft, creamy scrambled eggs — the kind that take longer to make but are worth it.',
    instructions: `Crack Eggs into a cold, non-stick pan. Add Butter. Don't whisk yet.
Place pan on medium-low heat. Begin stirring with a spatula as the butter melts.
Stir constantly, moving the pan off heat every 30 seconds or so to control the temperature.
Season with Salt and Black Pepper when curds begin to form.
Remove from heat while eggs still look slightly underdone — they'll continue cooking.
Toast Bread. Pile eggs on top and serve immediately.`,
    prepTime: 2,
    cookTime: 8,
    servings: 2,
    difficulty: 'easy',
    cuisineTypes: ['British'],
    tags: ['breakfast', 'quick', 'eggs'],
    dietaryTags: ['vegetarian'],
    allergens: ['eggs', 'dairy', 'gluten'],
    ingredients: [
      { name: 'Eggs', quantity: 4, unit: 'pieces' },
      { name: 'Butter', quantity: 1, unit: 'tablespoons' },
      { name: 'Bread', quantity: 2, unit: 'slices' },
      { name: 'Salt', quantity: null, unit: 'to taste' },
      { name: 'Black Pepper', quantity: null, unit: 'to taste' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateIngredient(name: string): Promise<number> {
  const normalized = name.trim();
  const existing = await prisma.ingredient.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.ingredient.create({
    data: { name: normalized, category: 'Other', commonUnits: [] },
  });
  return created.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting database seed...');

  // Upsert ingredients
  console.log('Upserting ingredients...');
  for (const ingredient of commonIngredients) {
    await prisma.ingredient.upsert({
      where: { name: ingredient.name },
      update: { category: ingredient.category, commonUnits: ingredient.commonUnits },
      create: ingredient,
    });
  }
  console.log(`  ${commonIngredients.length} ingredients upserted`);

  // Upsert dietary restrictions
  console.log('Upserting dietary restrictions...');
  for (const restriction of dietaryRestrictions) {
    await prisma.dietaryRestriction.upsert({
      where: { name: restriction.name },
      update: {},
      create: restriction,
    });
  }
  console.log(`  ${dietaryRestrictions.length} dietary restrictions upserted`);

  // Create/find system user
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@amugonna.internal' },
    update: {},
    create: {
      email: 'system@amugonna.internal',
      password: 'seed-user-no-login',
      firstName: 'Amugonna',
      lastName: 'System',
    },
  });
  console.log(`System user ID: ${systemUser.id}`);

  // Seed static recipes (skip already-existing ones by title)
  console.log(`Seeding ${staticRecipes.length} recipes...`);
  let created = 0;
  let skipped = 0;

  for (const recipe of staticRecipes) {
    const existing = await prisma.recipe.findFirst({
      where: { title: recipe.title, createdBy: systemUser.id },
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Resolve ingredient IDs
    const resolvedIngredients = await Promise.all(
      recipe.ingredients.map(async (ing) => ({
        ingredientId: await getOrCreateIngredient(ing.name),
        quantity: ing.quantity,
        unit: ing.unit,
        optional: ing.optional ?? false,
        substitutions: [],
      }))
    );

    await prisma.recipe.create({
      data: {
        title: recipe.title,
        description: recipe.description,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        cuisineTypes: recipe.cuisineTypes,
        tags: recipe.tags,
        dietaryTags: recipe.dietaryTags,
        allergens: recipe.allergens,
        isPublic: true,
        sourceName: 'Amugonna',
        createdBy: systemUser.id,
        recipeIngredients: {
          create: resolvedIngredients,
        },
      },
    });

    console.log(`  + ${recipe.title}`);
    created++;
  }

  console.log(`\nDone: ${created} recipes created, ${skipped} already existed`);
  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
