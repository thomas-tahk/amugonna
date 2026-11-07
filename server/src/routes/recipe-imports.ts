import express from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { fetchRecipeDraft } from '../lib/personal-import/fetch-recipe.js';
import { parsePastedRecipe, validateRecipeDraft } from '../lib/personal-import/parse.js';
import { savePrivateRecipe } from '../lib/personal-import/save.js';

const router = express.Router();

router.post('/preview', authenticateToken, async (req, res) => {
  const { url, text } = req.body ?? {};
  if ((typeof url === 'string') === (typeof text === 'string')) return res.status(400).json({ success: false, message: 'Provide either a URL or pasted text' });
  try {
    let draft;
    if (typeof url === 'string') {
      if (!url.trim() || url.length > 2048) return res.status(400).json({ success: false, message: 'Enter a valid recipe URL' });
      draft = await fetchRecipeDraft(url.trim());
    } else {
      if (!text.trim() || text.length > 20_000) return res.status(400).json({ success: false, message: 'Paste recipe text up to 20,000 characters' });
      draft = parsePastedRecipe(text);
    }
    const warnings: string[] = [];
    if (!draft.title) warnings.push('Add a recipe title before saving.');
    if (!draft.ingredients.length) warnings.push('Review and add ingredient lines before saving.');
    if (!draft.instructions) warnings.push('Review and add instructions before saving.');
    return res.json({ success: true, data: { draft, warnings } });
  } catch (error) {
    return res.status(422).json({ success: false, message: error instanceof Error ? error.message : 'Recipe could not be imported' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const draft = validateRecipeDraft(req.body?.draft);
  if (!draft) return res.status(400).json({ success: false, message: 'Recipe draft is invalid' });
  try {
    const recipeId = await savePrivateRecipe(prisma, req.user!.userId, draft);
    return res.status(201).json({ success: true, data: { recipe: { id: recipeId } } });
  } catch (error) {
    console.error('Private recipe import save error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save private recipe' });
  }
});

export default router;
