import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RecipeGenerationRequest {
  ingredients: string[];
  dietaryRestrictions?: string[];
  cuisine?: string;
  servings?: number;
  maxPrepTime?: number;
}

export interface GeneratedRecipe {
  title: string;
  description: string;
  instructions: string[];
  ingredients: {
    name: string;
    amount: string;
    unit: string;
    optional?: boolean;
  }[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  tags: string[];
  nutritionalInfo: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
    fiber?: string;
  };
}

export class AIRecipeGenerator {
  async generateRecipe(request: RecipeGenerationRequest): Promise<GeneratedRecipe> {
    const prompt = this.buildPrompt(request);

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef and nutritionist. Generate practical, delicious recipes based on available ingredients. Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const recipe = JSON.parse(content) as GeneratedRecipe;
      return this.validateAndCleanRecipe(recipe);

    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // Fallback to a template recipe if AI fails
      return this.generateFallbackRecipe(request);
    }
  }

  private buildPrompt(request: RecipeGenerationRequest): string {
    const { ingredients, dietaryRestrictions = [], cuisine, servings = 4, maxPrepTime } = request;

    let prompt = `Generate a recipe using these available ingredients: ${ingredients.join(', ')}.

Requirements:
- Servings: ${servings}
${maxPrepTime ? `- Maximum prep time: ${maxPrepTime} minutes` : ''}
${dietaryRestrictions.length > 0 ? `- Dietary restrictions: ${dietaryRestrictions.join(', ')}` : ''}
${cuisine ? `- Cuisine style: ${cuisine}` : ''}

Instructions:
1. Use as many of the provided ingredients as possible
2. You may suggest additional common pantry ingredients (salt, pepper, oil, etc.)
3. Make it practical and delicious
4. Include accurate nutritional estimates

Return JSON in this exact format:
{
  "title": "Recipe Name",
  "description": "Brief appetizing description (1-2 sentences)",
  "instructions": ["step 1", "step 2", "step 3", ...],
  "ingredients": [
    {"name": "ingredient name", "amount": "1", "unit": "cup", "optional": false}
  ],
  "prepTime": 15,
  "cookTime": 25,
  "servings": ${servings},
  "difficulty": "easy",
  "cuisine": "cuisine type or null",
  "tags": ["tag1", "tag2"],
  "nutritionalInfo": {
    "calories": 350,
    "protein": "25g",
    "carbs": "30g",
    "fat": "15g",
    "fiber": "5g"
  }
}`;

    return prompt;
  }

  private validateAndCleanRecipe(recipe: GeneratedRecipe): GeneratedRecipe {
    // Ensure all required fields exist with defaults
    return {
      title: recipe.title || 'Generated Recipe',
      description: recipe.description || 'A delicious recipe made with your ingredients',
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : ['Mix ingredients and cook as desired'],
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      prepTime: Number(recipe.prepTime) || 15,
      cookTime: Number(recipe.cookTime) || 20,
      servings: Number(recipe.servings) || 4,
      difficulty: ['easy', 'medium', 'hard'].includes(recipe.difficulty) ? recipe.difficulty : 'easy',
      cuisine: recipe.cuisine || null,
      tags: Array.isArray(recipe.tags) ? recipe.tags : [],
      nutritionalInfo: {
        calories: Number(recipe.nutritionalInfo?.calories) || 300,
        protein: recipe.nutritionalInfo?.protein || '20g',
        carbs: recipe.nutritionalInfo?.carbs || '25g',
        fat: recipe.nutritionalInfo?.fat || '12g',
        fiber: recipe.nutritionalInfo?.fiber || '3g',
      }
    };
  }

  private generateFallbackRecipe(request: RecipeGenerationRequest): GeneratedRecipe {
    const { ingredients, servings = 4 } = request;
    
    return {
      title: `Simple ${ingredients[0] || 'Ingredient'} Recipe`,
      description: `A quick and easy recipe using ${ingredients.slice(0, 3).join(', ')}.`,
      instructions: [
        'Prepare all ingredients by washing and chopping as needed.',
        'Heat a pan or pot over medium heat.',
        'Add your main ingredients and cook according to their requirements.',
        'Season with salt and pepper to taste.',
        'Serve hot and enjoy!'
      ],
      ingredients: ingredients.map(ingredient => ({
        name: ingredient,
        amount: '1',
        unit: 'portion',
        optional: false
      })),
      prepTime: 10,
      cookTime: 15,
      servings,
      difficulty: 'easy' as const,
      cuisine: 'fusion',
      tags: ['quick', 'easy', 'homemade'],
      nutritionalInfo: {
        calories: 250,
        protein: '15g',
        carbs: '20g',
        fat: '10g',
        fiber: '3g',
      }
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });
      return true;
    } catch (error) {
      console.error('OpenAI connection test failed:', error);
      return false;
    }
  }
}

export const aiRecipeGenerator = new AIRecipeGenerator();