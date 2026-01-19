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