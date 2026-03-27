import express from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/recipes - Get user's recipes (protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereCondition: any = {
      createdBy: userId
    };

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

// GET /api/recipes/suggestions - Pantry-matched recipe suggestions (protected)
// NOTE: must be defined before /:id to avoid "suggestions" being parsed as an ID
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Get user's pantry ingredient IDs
    const pantryItems = await prisma.userIngredient.findMany({
      where: { userId },
      select: { ingredientId: true }
    });
    const pantryIngredientIds = new Set(pantryItems.map(p => p.ingredientId));

    // Get all recipes accessible to the user (own + public)
    const recipes = await prisma.recipe.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { isPublic: true }
        ]
      },
      include: {
        recipeIngredients: {
          select: {
            ingredientId: true,
            optional: true,
            quantity: true,
            unit: true,
            ingredient: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        },
        favoriteRecipes: {
          where: { userId },
          select: { id: true }
        }
      }
    });

    // Score each recipe by pantry coverage
    const scored = recipes.map(recipe => {
      const required = recipe.recipeIngredients.filter(ri => !ri.optional);
      const optional = recipe.recipeIngredients.filter(ri => ri.optional);

      const matchedRequired = required.filter(ri => pantryIngredientIds.has(ri.ingredientId)).length;
      const totalRequired = required.length;

      // Recipes with no ingredients score 100 (e.g. "boil water")
      const score = totalRequired === 0 ? 100 : Math.round((matchedRequired / totalRequired) * 100);

      const missingIngredients = required
        .filter(ri => !pantryIngredientIds.has(ri.ingredientId))
        .map(ri => ri.ingredient);

      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        cuisineTypes: recipe.cuisineTypes,
        tags: recipe.tags,
        dietaryTags: recipe.dietaryTags,
        allergens: recipe.allergens,
        images: recipe.images,
        isFavorite: recipe.favoriteRecipes.length > 0,
        matchScore: score,
        matchedIngredients: matchedRequired,
        totalIngredients: totalRequired,
        missingIngredients,
        hasOptionalIngredients: optional.length > 0
      };
    });

    // Tier the results and exclude very poor matches
    const canMakeNow = scored
      .filter(r => r.matchScore >= 90)
      .sort((a, b) => b.matchScore - a.matchScore);

    const almostThere = scored
      .filter(r => r.matchScore >= 70 && r.matchScore < 90)
      .sort((a, b) => b.matchScore - a.matchScore);

    const aspirational = scored
      .filter(r => r.matchScore >= 50 && r.matchScore < 70)
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      data: {
        pantrySize: pantryIngredientIds.size,
        suggestions: {
          canMakeNow,
          almostThere,
          aspirational
        }
      }
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suggestions'
    });
  }
});

// POST /api/recipes - Create a new recipe (protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const {
      title,
      description,
      instructions,
      ingredients = [],
      prepTime,
      cookTime,
      servings = 4,
      cuisineTypes = [],
      tags = [],
      dietaryTags = [],
      allergens = [],
      difficulty,
      sourceUrl,
      sourceName,
      isPublic = false
    } = req.body;

    if (!title || !instructions) {
      return res.status(400).json({
        success: false,
        message: 'Title and instructions are required'
      });
    }

    // Validate that all provided ingredient IDs exist
    if (ingredients.length > 0) {
      const ingredientIds = ingredients.map((i: any) => parseInt(i.ingredientId));
      const found = await prisma.ingredient.findMany({
        where: { id: { in: ingredientIds } },
        select: { id: true }
      });
      if (found.length !== ingredientIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more ingredient IDs are invalid'
        });
      }
    }

    const recipe = await prisma.recipe.create({
      data: {
        title,
        description: description || null,
        instructions,
        prepTime: prepTime != null ? parseInt(prepTime) : null,
        cookTime: cookTime != null ? parseInt(cookTime) : null,
        servings: servings ? parseInt(servings) : 4,
        cuisineTypes,
        tags,
        dietaryTags,
        allergens,
        difficulty: difficulty || null,
        sourceUrl: sourceUrl || null,
        sourceName: sourceName || null,
        isPublic,
        createdBy: userId,
        recipeIngredients: {
          create: ingredients.map((i: any) => ({
            ingredientId: parseInt(i.ingredientId),
            quantity: i.quantity != null ? parseFloat(i.quantity) : null,
            unit: i.unit || null,
            optional: i.optional || false,
            substitutions: i.substitutions || [],
            preparationNote: i.preparationNote || null
          }))
        }
      },
      include: {
        recipeIngredients: {
          include: {
            ingredient: {
              select: { id: true, name: true, category: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Recipe created successfully',
      data: { recipe }
    });

  } catch (error) {
    console.error('Recipe creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create recipe'
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
        OR: [
          { createdBy: userId },
          { isPublic: true }
        ]
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
          where: { userId }
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

// PUT /api/recipes/:id - Update a recipe (protected, owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const recipeId = parseInt(req.params.id);
    const {
      title,
      description,
      instructions,
      ingredients,
      prepTime,
      cookTime,
      servings,
      cuisineTypes,
      tags,
      dietaryTags,
      allergens,
      difficulty,
      sourceUrl,
      sourceName,
      isPublic,
      personalNotes,
      modifications,
      rating
    } = req.body;

    const existing = await prisma.recipe.findFirst({
      where: { id: recipeId, createdBy: userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Build update payload from only the fields that were sent
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (prepTime !== undefined) updateData.prepTime = prepTime != null ? parseInt(prepTime) : null;
    if (cookTime !== undefined) updateData.cookTime = cookTime != null ? parseInt(cookTime) : null;
    if (servings !== undefined) updateData.servings = parseInt(servings);
    if (cuisineTypes !== undefined) updateData.cuisineTypes = cuisineTypes;
    if (tags !== undefined) updateData.tags = tags;
    if (dietaryTags !== undefined) updateData.dietaryTags = dietaryTags;
    if (allergens !== undefined) updateData.allergens = allergens;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl;
    if (sourceName !== undefined) updateData.sourceName = sourceName;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (personalNotes !== undefined) updateData.personalNotes = personalNotes;
    if (modifications !== undefined) updateData.modifications = modifications;
    if (rating !== undefined) updateData.rating = rating != null ? parseInt(rating) : null;

    const recipe = await prisma.$transaction(async (tx) => {
      // If ingredients are provided, replace all existing ones
      if (ingredients !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId } });
        updateData.recipeIngredients = {
          create: ingredients.map((i: any) => ({
            ingredientId: parseInt(i.ingredientId),
            quantity: i.quantity != null ? parseFloat(i.quantity) : null,
            unit: i.unit || null,
            optional: i.optional || false,
            substitutions: i.substitutions || [],
            preparationNote: i.preparationNote || null
          }))
        };
      }

      return tx.recipe.update({
        where: { id: recipeId },
        data: updateData,
        include: {
          recipeIngredients: {
            include: {
              ingredient: {
                select: { id: true, name: true, category: true }
              }
            }
          }
        }
      });
    });

    res.json({
      success: true,
      message: 'Recipe updated successfully',
      data: { recipe }
    });

  } catch (error) {
    console.error('Recipe update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update recipe'
    });
  }
});

// POST /api/recipes/:id/favorite - Toggle recipe favorite (protected)
router.post('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const recipeId = parseInt(req.params.id);

    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        OR: [
          { createdBy: userId },
          { isPublic: true }
        ]
      }
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    const existingFavorite = await prisma.favoriteRecipe.findUnique({
      where: {
        userId_recipeId: { userId, recipeId }
      }
    });

    let isFavorite: boolean;

    if (existingFavorite) {
      await prisma.favoriteRecipe.delete({ where: { id: existingFavorite.id } });
      isFavorite = false;
    } else {
      await prisma.favoriteRecipe.create({ data: { userId, recipeId } });
      isFavorite = true;
    }

    res.json({
      success: true,
      message: isFavorite ? 'Recipe added to favorites' : 'Recipe removed from favorites',
      data: { isFavorite }
    });

  } catch (error) {
    console.error('Favorite toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favorite status'
    });
  }
});

// DELETE /api/recipes/:id - Delete recipe (protected, owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const recipeId = parseInt(req.params.id);

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, createdBy: userId }
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    await prisma.$transaction([
      prisma.favoriteRecipe.deleteMany({ where: { recipeId } }),
      prisma.recipeIngredient.deleteMany({ where: { recipeId } }),
      prisma.recipeDietaryTag.deleteMany({ where: { recipeId } }),
      prisma.recipe.delete({ where: { id: recipeId } })
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
