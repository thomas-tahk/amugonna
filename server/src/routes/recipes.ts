import express from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { splitSteps } from '../lib/recipes/index.js';
import { satisfies } from '../lib/ingredients/index.js';
import { displayName, getRecipesFor, invalidateRecipeIndex, matchRecipes, mergeIngredients } from '../lib/matching/index.js';
import { allowedPantry, assessIngredients } from '../lib/exclusions.js';

const router = express.Router();

// GET /api/recipes - Get user's recipes (protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const whereCondition = req.query.collection === 'favorites'
      ? { AND: [{ OR: [{ isPublic: true }, { createdBy: userId }] }, { favoriteRecipes: { some: { userId } } }] }
      : { createdBy: userId };

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where: whereCondition,
        include: {
          favoriteRecipes: { where: { userId }, select: { id: true } },
          recipeNotes: { where: { userId }, select: { personalNotes: true } },
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
        recipes: recipes.map(recipe => ({ ...recipe, isFavorite: recipe.favoriteRecipes.length > 0,
          personalNotes: recipe.recipeNotes[0]?.personalNotes ?? (recipe.createdBy === userId ? recipe.personalNotes : null) })),
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

    const pantryItems = await prisma.userIngredient.findMany({
      where: { userId },
      select: { ingredient: { select: { canonical: true } } }
    });
    const preferences = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avoidedAllergens: true, excludedIngredients: true, reviewedIngredients: true } });
    const pantry = [...new Set(pantryItems.map(p => p.ingredient.canonical))];

    const recipes = await getRecipesFor(userId);
    const reviewed = recipes.map(recipe => ({ recipe, ...assessIngredients(recipe.ingredients.flatMap(i => i.rawText ? [i.name, i.rawText] : [i.name]), preferences) }));
    const eligible = reviewed.filter(r => !r.blocked.length && !r.uncertain.length).map(r => r.recipe);
    const { cookNow, oneAway, twoAway } = matchRecipes(allowedPantry(pantry, preferences), eligible);

    res.json({
      success: true,
      data: {
        pantrySize: pantry.length,
        totalRecipes: recipes.length,
        exclusionsActive: preferences.avoidedAllergens.length + preferences.excludedIngredients.length > 0,
        excludedCount: reviewed.filter(r => r.blocked.length > 0).length,
        reviewCount: reviewed.filter(r => !r.blocked.length && r.uncertain.length > 0).length,
        cookNow,
        oneAway,
        twoAway
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
      koreanTitle,
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
    if (koreanTitle != null && (typeof koreanTitle !== 'string' || koreanTitle.length > 200)) {
      return res.status(400).json({ success: false, message: 'Korean title must be text under 200 characters' });
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
        koreanTitle: typeof koreanTitle === 'string' ? koreanTitle.trim() || null : null,
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
            rawText: typeof i.rawText === 'string' ? i.rawText : null,
            measure: typeof i.measure === 'string' ? i.measure : null,
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

    invalidateRecipeIndex();
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
    const recipeId = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!Number.isInteger(recipeId) || recipeId > 2147483647) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

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
          orderBy: { id: 'asc' },
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                category: true,
                canonical: true,
                commonUnits: true
              }
            }
          }
        },
        favoriteRecipes: {
          where: { userId }
        },
        recipeNotes: { where: { userId }, select: { personalNotes: true } }
      }
    });

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    const pantryItems = await prisma.userIngredient.findMany({
      where: { userId },
      select: { ingredient: { select: { canonical: true } } }
    });
    const preferences = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avoidedAllergens: true, excludedIngredients: true, reviewedIngredients: true } });
    const pantry = allowedPantry(pantryItems.map(p => p.ingredient.canonical), preferences);
    const ingredientReview = assessIngredients(recipe.recipeIngredients.flatMap(ri => ri.rawText ? [ri.ingredient.name, ri.rawText] : [ri.ingredient.name]), preferences);

    const ingredients = mergeIngredients(
      recipe.recipeIngredients.map(ri => ({
        canonical: ri.ingredient.canonical,
        name: displayName(ri.ingredient.canonical, ri.ingredient.name),
        measure: ri.measure ?? ([ri.quantity?.toString(), ri.unit].filter(Boolean).join(' ') || null),
        optional: ri.optional
      }))
    ).map(ing => {
      const r = satisfies(pantry, ing.canonical);
      return {
        ...ing,
        sourceText: recipe.recipeIngredients.filter(ri => ri.ingredient.canonical === ing.canonical).map(ri => ri.rawText).filter(Boolean).join(' + ') || null,
        status: r.status,
        ...(r.status === 'swap' && r.using ? { using: displayName(r.using, r.using) } : {})
      };
    });

    res.json({
      success: true,
      data: {
        recipe: {
          ...recipe,
          personalNotes: recipe.recipeNotes[0]?.personalNotes ?? (recipe.createdBy === userId ? recipe.personalNotes : null),
          ingredientReview,
          steps: splitSteps(recipe.instructions),
          ingredients,
          isFavorite: recipe.favoriteRecipes.length > 0,
          isOwner: recipe.createdBy === userId
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

router.put('/:id/notes', authenticateToken, async (req, res) => {
  const recipeId = /^\d+$/.test(req.params.id) ? Number(req.params.id) : 0;
  const personalNotes = req.body.personalNotes;
  if (typeof personalNotes !== 'string' || personalNotes.length > 20000) {
    return res.status(400).json({ success: false, message: 'Notes must be text under 20,000 characters' });
  }
  if (!recipeId || recipeId > 2147483647) return res.status(404).json({ success: false, message: 'Recipe not found' });
  try {
    const userId = req.user!.userId;
    const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, OR: [{ createdBy: userId }, { isPublic: true }] }, select: { id: true } });
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' });
    await prisma.recipeNote.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      create: { userId, recipeId, personalNotes }, update: { personalNotes },
    });
    res.json({ success: true, data: { personalNotes } });
  } catch {
    res.status(500).json({ success: false, message: 'Could not save your notes' });
  }
});

// PUT /api/recipes/:id - Update a recipe (protected, owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const recipeId = parseInt(req.params.id);
    const {
      title,
      koreanTitle,
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
      where: { id: recipeId, createdBy: userId },
      include: { recipeIngredients: true }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }
    if (koreanTitle != null && (typeof koreanTitle !== 'string' || koreanTitle.length > 200)) {
      return res.status(400).json({ success: false, message: 'Korean title must be text under 200 characters' });
    }

    // Build update payload from only the fields that were sent
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (koreanTitle !== undefined) updateData.koreanTitle = koreanTitle?.trim() || null;
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
            rawText: i.rawText === undefined ? existing.recipeIngredients.find(ri => ri.ingredientId === parseInt(i.ingredientId))?.rawText ?? null : i.rawText,
            measure: i.measure === undefined ? existing.recipeIngredients.find(ri => ri.ingredientId === parseInt(i.ingredientId))?.measure ?? null : i.measure,
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

    if (typeof personalNotes === 'string') {
      await prisma.recipeNote.upsert({ where: { userId_recipeId: { userId, recipeId } },
        create: { userId, recipeId, personalNotes }, update: { personalNotes } });
    }

    invalidateRecipeIndex();
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

    invalidateRecipeIndex();
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
