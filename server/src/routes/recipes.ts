import express from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiRecipeGenerator, RecipeGenerationRequest } from '../services/aiRecipeGenerator.js';

const router = express.Router();

// POST /api/recipes/generate - Generate AI recipe from ingredients (protected)
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { ingredientIds, dietaryRestrictions, cuisine, servings, maxPrepTime } = req.body;

    // Validation
    if (!ingredientIds || !Array.isArray(ingredientIds) || ingredientIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one ingredient'
      });
    }

    // Get ingredient names from IDs
    const ingredients = await prisma.ingredient.findMany({
      where: {
        id: {
          in: ingredientIds.map((id: string) => parseInt(id))
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid ingredients found'
      });
    }

    // Get user's dietary restrictions if not provided
    let userRestrictions: string[] = dietaryRestrictions || [];
    if (userRestrictions.length === 0) {
      const userDietaryRestrictions = await prisma.userDietaryRestriction.findMany({
        where: { userId },
        include: {
          restriction: true
        }
      });
      userRestrictions = userDietaryRestrictions.map(ur => ur.restriction.name);
    }

    // Prepare AI generation request
    const generationRequest: RecipeGenerationRequest = {
      ingredients: ingredients.map(ing => ing.name),
      dietaryRestrictions: userRestrictions,
      cuisine,
      servings: servings ? parseInt(servings) : undefined,
      maxPrepTime: maxPrepTime ? parseInt(maxPrepTime) : undefined
    };

    // Generate recipe with AI
    const generatedRecipe = await aiRecipeGenerator.generateRecipe(generationRequest);

    // Store recipe in database
    const recipe = await prisma.recipe.create({
      data: {
        title: generatedRecipe.title,
        description: generatedRecipe.description,
        instructions: generatedRecipe.instructions.join('\n\n'),
        prepTime: generatedRecipe.prepTime,
        cookTime: generatedRecipe.cookTime,
        servings: generatedRecipe.servings,
        createdBy: userId,
        isAiGenerated: true,
        aiPrompt: `Ingredients: ${generationRequest.ingredients.join(', ')}; Restrictions: ${generationRequest.dietaryRestrictions?.join(', ') || 'None'}`,
        nutritionalInfo: generatedRecipe.nutritionalInfo,
        difficulty: generatedRecipe.difficulty,
        cuisine: generatedRecipe.cuisine,
        tags: generatedRecipe.tags
      }
    });

    // Create recipe ingredients
    for (const recipeIngredient of generatedRecipe.ingredients) {
      // Try to find existing ingredient or create new one
      let ingredient = await prisma.ingredient.findFirst({
        where: {
          name: {
            equals: recipeIngredient.name,
            mode: 'insensitive'
          }
        }
      });

      if (!ingredient) {
        ingredient = await prisma.ingredient.create({
          data: {
            name: recipeIngredient.name,
            category: 'other',
            commonUnits: [recipeIngredient.unit || 'piece']
          }
        });
      }

      await prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId: ingredient.id,
          quantity: parseFloat(recipeIngredient.amount) || null,
          unit: recipeIngredient.unit || null,
          optional: recipeIngredient.optional || false,
          substitutions: []
        }
      });
    }

    // Fetch the complete recipe with ingredients
    const completeRecipe = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        recipeIngredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Recipe generated successfully!',
      data: {
        recipe: completeRecipe
      }
    });

  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recipe. Please try again.'
    });
  }
});

// GET /api/recipes - Get user's recipes (protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { page = '1', limit = '10', aiGenerated } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereCondition: any = {
      createdBy: userId
    };

    if (aiGenerated !== undefined) {
      whereCondition.isAiGenerated = aiGenerated === 'true';
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where: whereCondition,
        include: {
          recipeIngredients: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  category: true
                }
              }
            }
          },
          _count: {
            select: {
              favoriteRecipes: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limitNum
      }),
      prisma.recipe.count({
        where: whereCondition
      })
    ]);

    res.json({
      success: true,
      data: {
        recipes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Recipes fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipes'
    });
  }
});

// GET /api/recipes/:id - Get specific recipe (protected)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const recipeId = parseInt(req.params.id);

    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        createdBy: userId
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        recipeIngredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                category: true,
                commonUnits: true
              }
            }
          }
        },
        favoriteRecipes: {
          where: {
            userId
          }
        }
      }
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    res.json({
      success: true,
      data: {
        recipe: {
          ...recipe,
          isFavorite: recipe.favoriteRecipes.length > 0
        }
      }
    });

  } catch (error) {
    console.error('Recipe fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipe'
    });
  }
});

// POST /api/recipes/:id/favorite - Toggle recipe favorite (protected)
router.post('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const recipeId = parseInt(req.params.id);

    // Check if recipe exists and belongs to user
    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        createdBy: userId
      }
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Check if already favorited
    const existingFavorite = await prisma.favoriteRecipe.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId
        }
      }
    });

    let isFavorite: boolean;

    if (existingFavorite) {
      // Remove from favorites
      await prisma.favoriteRecipe.delete({
        where: {
          id: existingFavorite.id
        }
      });
      isFavorite = false;
    } else {
      // Add to favorites
      await prisma.favoriteRecipe.create({
        data: {
          userId,
          recipeId
        }
      });
      isFavorite = true;
    }

    res.json({
      success: true,
      message: isFavorite ? 'Recipe added to favorites' : 'Recipe removed from favorites',
      data: {
        isFavorite
      }
    });

  } catch (error) {
    console.error('Favorite toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favorite status'
    });
  }
});

// DELETE /api/recipes/:id - Delete recipe (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const recipeId = parseInt(req.params.id);

    // Check if recipe exists and belongs to user
    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        createdBy: userId
      }
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Delete related records first
    await prisma.$transaction([
      prisma.favoriteRecipe.deleteMany({
        where: { recipeId }
      }),
      prisma.recipeIngredient.deleteMany({
        where: { recipeId }
      }),
      prisma.recipeDietaryTag.deleteMany({
        where: { recipeId }
      }),
      prisma.recipe.delete({
        where: { id: recipeId }
      })
    ]);

    res.json({
      success: true,
      message: 'Recipe deleted successfully'
    });

  } catch (error) {
    console.error('Recipe deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete recipe'
    });
  }
});

export default router;