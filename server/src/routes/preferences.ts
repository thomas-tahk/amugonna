import express from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { ALLERGENS } from '../lib/exclusions.js';
import { canonicalize } from '../lib/ingredients/index.js';

const router = express.Router();
const select = { avoidedAllergens: true, excludedIngredients: true, reviewedIngredients: true };

router.get('/', authenticateToken, async (req, res) => {
  try {
    const preferences = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId }, select });
    res.json({ success: true, data: { ...preferences, allergens: ALLERGENS } });
  } catch {
    res.status(500).json({ success: false, message: 'Could not load foods to avoid' });
  }
});

function validList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 100 && value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 100);
}

router.put('/', authenticateToken, async (req, res) => {
  const { avoidedAllergens, excludedIngredients } = req.body ?? {};
  const hasReviewedIngredients = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'reviewedIngredients');
  const reviewedIngredients = req.body?.reviewedIngredients;
  if (!validList(avoidedAllergens) || !validList(excludedIngredients) ||
      avoidedAllergens.some(item => !Object.keys(ALLERGENS).includes(item)) ||
      hasReviewedIngredients && !validList(reviewedIngredients)) {
    return res.status(400).json({ success: false, message: 'Choose listed allergens and enter ingredients separated by commas' });
  }
  try {
    const preferences = await prisma.user.update({
      where: { id: req.user!.userId }, select,
      data: {
        avoidedAllergens: [...new Set(avoidedAllergens)],
        excludedIngredients: [...new Set(excludedIngredients.map(canonicalize))],
        ...(hasReviewedIngredients ? { reviewedIngredients: [...new Set((reviewedIngredients as string[]).map(canonicalize))] } : {}),
      },
    });
    res.json({ success: true, data: { ...preferences, allergens: ALLERGENS } });
  } catch {
    res.status(500).json({ success: false, message: 'Could not save foods to avoid' });
  }
});

export default router;
