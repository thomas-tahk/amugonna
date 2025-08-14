import express from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/ingredients - Search ingredients
router.get('/', async (req, res) => {
  try {
    const { search, category, limit = '20' } = req.query;
    
    const searchConditions: any = {};
    
    if (search && typeof search === 'string') {
      searchConditions.name = {
        contains: search,
        mode: 'insensitive' // Case-insensitive search
      };
    }
    
    if (category && typeof category === 'string') {
      searchConditions.category = category;
    }

    const ingredients = await prisma.ingredient.findMany({
      where: searchConditions,
      take: parseInt(limit as string),
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        category: true,
        commonUnits: true,
        nutritionalInfo: true
      }
    });

    res.json({
      success: true,
      data: {
        ingredients,
        total: ingredients.length
      }
    });

  } catch (error) {
    console.error('Ingredient search error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during ingredient search'
    });
  }
});

// GET /api/ingredients/categories - Get all ingredient categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.ingredient.findMany({
      where: {
        category: {
          not: null
        }
      },
      select: {
        category: true
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc'
      }
    });

    const categoryList = categories
      .map(item => item.category)
      .filter(Boolean) // Remove any null values
      .sort();

    res.json({
      success: true,
      data: {
        categories: categoryList
      }
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching categories'
    });
  }
});

// GET /api/ingredients/user - Get user's ingredients (protected)
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const userIngredients = await prisma.userIngredient.findMany({
      where: { userId },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            category: true,
            commonUnits: true
          }
        }
      },
      orderBy: {
        addedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: {
        ingredients: userIngredients
      }
    });

  } catch (error) {
    console.error('User ingredients fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user ingredients'
    });
  }
});

// POST /api/ingredients/user - Add ingredient to user's pantry (protected)
router.post('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { ingredientId, quantity, unit, expirationDate } = req.body;

    // Validation
    if (!ingredientId) {
      return res.status(400).json({
        success: false,
        message: 'Ingredient ID is required'
      });
    }

    // Check if ingredient exists
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: parseInt(ingredientId) }
    });

    if (!ingredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found'
      });
    }

    // Check if user already has this ingredient
    const existingUserIngredient = await prisma.userIngredient.findUnique({
      where: {
        userId_ingredientId: {
          userId,
          ingredientId: parseInt(ingredientId)
        }
      }
    });

    let userIngredient;

    if (existingUserIngredient) {
      // Update existing ingredient
      userIngredient = await prisma.userIngredient.update({
        where: {
          id: existingUserIngredient.id
        },
        data: {
          quantity: quantity ? parseFloat(quantity) : existingUserIngredient.quantity,
          unit: unit || existingUserIngredient.unit,
          expirationDate: expirationDate ? new Date(expirationDate) : existingUserIngredient.expirationDate,
          addedAt: new Date() // Update timestamp
        },
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
      });
    } else {
      // Create new user ingredient
      userIngredient = await prisma.userIngredient.create({
        data: {
          userId,
          ingredientId: parseInt(ingredientId),
          quantity: quantity ? parseFloat(quantity) : null,
          unit: unit || null,
          expirationDate: expirationDate ? new Date(expirationDate) : null
        },
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
      });
    }

    res.status(201).json({
      success: true,
      message: existingUserIngredient ? 'Ingredient updated in your pantry' : 'Ingredient added to your pantry',
      data: {
        userIngredient
      }
    });

  } catch (error) {
    console.error('Add user ingredient error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while adding ingredient'
    });
  }
});

// PUT /api/ingredients/user/:id - Update user ingredient (protected)
router.put('/user/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const userIngredientId = parseInt(req.params.id);
    const { quantity, unit, expirationDate } = req.body;

    // Check if the user ingredient exists and belongs to the user
    const existingUserIngredient = await prisma.userIngredient.findFirst({
      where: {
        id: userIngredientId,
        userId
      }
    });

    if (!existingUserIngredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found in your pantry'
      });
    }

    const updatedUserIngredient = await prisma.userIngredient.update({
      where: { id: userIngredientId },
      data: {
        ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
        ...(unit !== undefined && { unit }),
        ...(expirationDate !== undefined && { 
          expirationDate: expirationDate ? new Date(expirationDate) : null 
        })
      },
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
    });

    res.json({
      success: true,
      message: 'Ingredient updated successfully',
      data: {
        userIngredient: updatedUserIngredient
      }
    });

  } catch (error) {
    console.error('Update user ingredient error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating ingredient'
    });
  }
});

// DELETE /api/ingredients/user/:id - Remove ingredient from user's pantry (protected)
router.delete('/user/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const userIngredientId = parseInt(req.params.id);

    // Check if the user ingredient exists and belongs to the user
    const existingUserIngredient = await prisma.userIngredient.findFirst({
      where: {
        id: userIngredientId,
        userId
      }
    });

    if (!existingUserIngredient) {
      return res.status(404).json({
        success: false,
        message: 'Ingredient not found in your pantry'
      });
    }

    await prisma.userIngredient.delete({
      where: { id: userIngredientId }
    });

    res.json({
      success: true,
      message: 'Ingredient removed from your pantry'
    });

  } catch (error) {
    console.error('Delete user ingredient error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while removing ingredient'
    });
  }
});

export default router;