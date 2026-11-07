import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { generateToken } from '../src/lib/auth.js';
import { prisma } from '../src/lib/database.js';
import { parseRecipeJsonLd, validateRecipeDraft } from '../src/lib/personal-import/parse.js';
import { publicAddresses } from '../src/lib/personal-import/fetch-recipe.js';

const auth = `Bearer ${generateToken({ userId: 987654, email: 'import-test@example.test' })}`;

afterAll(async () => {
  await prisma.$disconnect();
});

describe('recipe import preview', () => {
  it('parses pasted ingredient and instruction sections into an editable draft', async () => {
    const response = await request(app)
      .post('/api/recipe-imports/preview')
      .set('Authorization', auth)
      .send({ text: 'Tomato Pasta\n\nIngredients\n- 2 cups tomatoes\n- 1 tbsp olive oil\n\nInstructions\n1. Chop tomatoes.\n2. Cook with oil.' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        draft: {
          title: 'Tomato Pasta',
          ingredients: ['2 cups tomatoes', '1 tbsp olive oil'],
          instructions: 'Chop tomatoes.\nCook with oil.',
          servings: 4,
        },
      },
    });
  });

  it('rejects missing or conflicting preview inputs', async () => {
    const missing = await request(app).post('/api/recipe-imports/preview').set('Authorization', auth).send({});
    const conflicting = await request(app).post('/api/recipe-imports/preview').set('Authorization', auth).send({
      text: 'Recipe text', url: 'https://example.test/recipe',
    });
    expect(missing.status).toBe(400);
    expect(conflicting.status).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/recipe-imports/preview').send({ text: 'Ingredients\n- rice' });
    expect(response.status).toBe(401);
  });

  it('blocks loopback URL imports before making a request', async () => {
    const response = await request(app)
      .post('/api/recipe-imports/preview')
      .set('Authorization', auth)
      .send({ url: 'http://127.0.0.1/recipe' });
    expect(response.status).toBe(422);
    expect(response.body.message).toContain('Private network');
  });

  it('blocks reserved IPv6 URL literals', async () => {
    const response = await request(app)
      .post('/api/recipe-imports/preview')
      .set('Authorization', auth)
      .send({ url: 'https://[2001:0db8::1]/recipe' });
    expect(response.status).toBe(422);
    expect(response.body.message).toContain('Private network');
  });
});

describe('recipe import save validation', () => {
  it('rejects incomplete drafts before writing', async () => {
    const response = await request(app)
      .post('/api/recipe-imports')
      .set('Authorization', auth)
      .send({ draft: { title: 'Only a title' } });
    expect(response.status).toBe(400);
  });

  it.skipIf(process.env.TEST_DB_ENABLED !== '1')('saves imports privately with original ingredient wording', async () => {
    const email = `recipe-import-${Date.now()}@example.test`;
    const user = await prisma.user.create({ data: { email, password: 'unused-test-hash' }, select: { id: true } });
    const authorization = `Bearer ${generateToken({ userId: user.id, email })}`;
    let recipeId: number | undefined;
    try {
      const response = await request(app).post('/api/recipe-imports').set('Authorization', authorization).send({ draft: {
        title: 'Imported Rice', koreanTitle: '재스민 밥', description: '', ingredients: ['1 cup jasmine rice'], instructions: 'Rinse.\nCook.',
        sourceUrl: '', sourceName: '', cuisineTypes: [], prepTime: null, cookTime: 20, servings: 2,
      } });
      expect(response.status).toBe(201);
      recipeId = response.body.data.recipe.id;
      const saved = await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId }, include: { recipeIngredients: true } });
      expect(saved).toMatchObject({ createdBy: user.id, isPublic: false, cookTime: 20, servings: 2, koreanTitle: '재스민 밥' });
      expect(saved.recipeIngredients[0]).toMatchObject({ rawText: '1 cup jasmine rice', measure: '1 cup' });
      const otherUserResponse = await request(app).get(`/api/recipes/${recipeId}`).set('Authorization', `Bearer ${generateToken({ userId: user.id + 1, email: 'another@example.test' })}`);
      expect(otherUserResponse.status).toBe(404);
    } finally {
      if (recipeId) {
        await prisma.recipeIngredient.deleteMany({ where: { recipeId } });
        await prisma.recipe.delete({ where: { id: recipeId } });
      }
      await prisma.user.delete({ where: { id: user.id } });
    }
  }, 30_000);
});

describe('recipe import parsers', () => {
  it('reads Recipe JSON-LD in a graph, including section steps and entities', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@graph': [{
        '@type': 'Recipe', name: 'Kimchi &amp; Rice', recipeIngredient: ['1 cup rice &amp; water'],
        recipeInstructions: [{ '@type': 'HowToSection', itemListElement: [
          { '@type': 'HowToStep', text: 'Cook &amp; stir.' }, { '@type': 'HowToStep', text: 'Serve.' },
        ] }],
      }],
    })}</script>`;
    expect(parseRecipeJsonLd(html, 'https://recipes.example/kimchi')).toMatchObject({
      title: 'Kimchi & Rice', ingredients: ['1 cup rice & water'], instructions: 'Cook & stir.\nServe.', sourceName: 'recipes.example',
    });
  });

  it('validates a complete draft and rejects invalid source protocols', () => {
    const draft = {
      title: 'Rice', description: '', ingredients: ['1 cup rice'], instructions: 'Cook.', sourceUrl: 'javascript:alert(1)',
      sourceName: '', cuisineTypes: [], prepTime: null, cookTime: null, servings: 4,
    };
    expect(validateRecipeDraft(draft)).toBeNull();
    expect(validateRecipeDraft({ ...draft, sourceUrl: '', koreanTitle: '볶음밥' })).toMatchObject({ title: 'Rice', koreanTitle: '볶음밥', ingredients: ['1 cup rice'] });
    expect(validateRecipeDraft({ ...draft, sourceUrl: '', koreanTitle: 42 })).toBeNull();
    expect(validateRecipeDraft({ ...draft, sourceUrl: '', instructions: '' })).toBeNull();
    expect(validateRecipeDraft({ ...draft, sourceUrl: '', koreanTitle: '가'.repeat(201) })).toBeNull();
    expect(validateRecipeDraft({ ...draft, sourceUrl: '', ingredients: ['---'] })).toBeNull();
  });

  it('leaves malformed numeric HTML entities intact instead of throwing', () => {
    const html = '<script type="application/ld+json">{"@type":"Recipe","name":"Rice &#99999999999;","recipeIngredient":["rice"],"recipeInstructions":[{"@type":"HowToStep","text":"Cook"}]}</script>';
    expect(() => parseRecipeJsonLd(html, 'https://recipes.example/rice')).not.toThrow();
    expect(parseRecipeJsonLd(html, 'https://recipes.example/rice')?.title).toContain('&#99999999999;');
  });

  it('rejects a public hostname resolving to a private address', async () => {
    await expect(publicAddresses('https://recipes.example', async () => [{ address: '10.0.0.8', family: 4 }]))
      .rejects.toThrow('Private network');
  });
});
