import express from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { CATEGORIES, suggest } from '../lib/ingredients/index.js';
import {
  MAX_PARSE_LENGTH,
  PantryInputError,
  applyBulk,
  loadPantry,
  parsePantryText,
  validateBulk,
} from '../lib/pantry/index.js';

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
            canonical: true,
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

// GET /api/ingredients/common - quick-pick grid + assumed staples (public)
router.get('/common', async (_req, res) => {
  try {
    const rows = await prisma.ingredient.findMany({
      where: { OR: [{ isCommon: true }, { isStaple: true }] },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, canonical: true, category: true, isCommon: true, isStaple: true, parentId: true }
    });
    const item = (r: (typeof rows)[number]) => ({ id: r.id, name: r.name, canonical: r.canonical });
    const groups = CATEGORIES
      .map((category) => ({ category: category as string, items: rows.filter((r) => r.isCommon && r.category === category).map(item) }))
      .filter((g) => g.items.length > 0);
    // oil children are staples too, but the client shows one "cooking oil" entry
    const staples = rows.filter((r) => r.isStaple && r.parentId === null).map(item);
    res.json({ success: true, data: { groups, staples } });
  } catch (error) {
    console.error('Common ingredients error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching common ingredients' });
  }
});

// GET /api/ingredients/suggest?q=&limit=8 - type-ahead (public)
router.get('/suggest', async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    const rawLimit = parseInt(String(req.query.limit ?? '8'), 10);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 8, 1), 20);
    if (!q) return res.json({ success: true, data: { items: [] } });

    const hits = suggest(q, limit);
    const rows = hits.length
      ? await prisma.ingredient.findMany({
          where: { canonical: { in: hits.map((h) => h.canonical) } },
          select: { id: true, name: true, canonical: true, category: true }
        })
      : [];
    const byCanonical = new Map(rows.map((r) => [r.canonical, r]));
    const items = hits.flatMap((h) => {
      const r = byCanonical.get(h.canonical);
      return r ? [r] : [];
    });

    if (items.length < limit) {
      // DB-only ingredients (user-created / imported) come after the vocabulary hits
      const taken = new Set(items.map((i) => i.id));
      const extra = await prisma.ingredient.findMany({
        where: {
          id: { notIn: [...taken] },
          OR: [{ name: { contains: q, mode: 'insensitive' } }, { canonical: { contains: q, mode: 'insensitive' } }]
        },
        orderBy: { name: 'asc' },
        take: limit - items.length,
        select: { id: true, name: true, canonical: true, category: true }
      });
      items.push(...extra);
    }

    res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('Ingredient suggest error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during ingredient suggestions' });
  }
});

// POST /api/ingredients/user/bulk - add/remove many pantry items at once (protected)
router.post('/user/bulk', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const change = validateBulk(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const resolved = await applyBulk(tx, userId, change);
      return { resolved, ingredients: await loadPantry(tx, userId) };
    });
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof PantryInputError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Bulk pantry error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while updating pantry' });
  }
});

// POST /api/ingredients/user/parse - split free text into items to confirm; saves nothing (protected)
router.post('/user/parse', authenticateToken, async (req, res) => {
  const text = req.body?.text;
  if (typeof text !== 'string' || text.trim().length === 0 || text.length > MAX_PARSE_LENGTH) {
    return res.status(400).json({ success: false, message: `text must be a string of 1-${MAX_PARSE_LENGTH} characters` });
  }
  try {
    const pieces = parsePantryText(text);
    // unknown text may still match a DB-only ingredient created earlier
    const rows = await prisma.ingredient.findMany({
      where: { canonical: { in: pieces.map((p) => p.canonical) } },
      select: { id: true, canonical: true }
    });
    const idByCanonical = new Map(rows.map((r) => [r.canonical, r.id]));
    const items = pieces.map((p) => ({ ...p, ingredientId: idByCanonical.get(p.canonical) ?? null }));
    res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('Parse pantry text error:', error);
    res.status(500).json({ success: false, message: 'Internal server error while parsing ingredients' });
  }
});

export default router;
