import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/database.js';
import { generateToken } from '../src/lib/auth.js';

const createdUsers: number[] = [];
afterAll(async () => {
 if (createdUsers.length) {
  await prisma.favoriteRecipe.deleteMany({where:{userId:{in:createdUsers}}});
  await prisma.recipe.deleteMany({where:{createdBy:{in:createdUsers}}});
  await prisma.user.deleteMany({where:{id:{in:createdUsers}}});
 }
 await prisma.$disconnect();
});
describe.skipIf(process.env.TEST_DB_ENABLED !== '1')('personal favorites and notes', () => {
 let mine: string, other: string, recipeId: number, privateId: number;
 beforeAll(async () => {
  const email = `collection-${Date.now()}@amugonna.test`;
  const a = await prisma.user.create({data:{email,password:'test-only'}});
  const b = await prisma.user.create({data:{email:`other-${email}`,password:'test-only'}});
  createdUsers.push(a.id,b.id);
  mine = `Bearer ${generateToken({userId:a.id,email:a.email})}`;
  other = `Bearer ${generateToken({userId:b.id,email:b.email})}`;
  const recipe = await prisma.recipe.create({data:{title:'Public recipe',instructions:'Cook. Serve.',createdBy:a.id,isPublic:true,attribution:'Collection test fixture',personalNotes:'Owner private note'}});
  recipeId = recipe.id;
  privateId = (await prisma.recipe.create({data:{title:'Private recipe',instructions:'Cook.',createdBy:a.id}})).id;
 });
 it('finds a favorited public recipe in another user library', async () => {
  await request(app).post(`/api/recipes/${recipeId}/favorite`).set('Authorization',other).expect(200);
  const list=await request(app).get('/api/recipes?collection=favorites').set('Authorization',other).expect(200);
  expect(list.body.data.recipes.map((r:{id:number})=>r.id)).toContain(recipeId);
  expect(list.body.data.recipes.find((r:{id:number})=>r.id===recipeId).isFavorite).toBe(true);
 });
 it('does not expose owner personal notes on public recipes', async () => {
  const detail=await request(app).get(`/api/recipes/${recipeId}`).set('Authorization',other).expect(200);
  expect(detail.body.data.recipe.personalNotes).toBeNull();
 });
 it('saves viewer-specific notes without changing owner notes', async () => {
  await request(app).put(`/api/recipes/${recipeId}/notes`).set('Authorization',other).send({personalNotes:'Use less salt'}).expect(200);
  const detail=await request(app).get(`/api/recipes/${recipeId}`).set('Authorization',other).expect(200);
  expect(detail.body.data.recipe.personalNotes).toBe('Use less salt');
  const owner=await request(app).get(`/api/recipes/${recipeId}`).set('Authorization',mine).expect(200);
  expect(owner.body.data.recipe.personalNotes).toBe('Owner private note');
 });
 it('cannot write notes to another user private recipe', async () => {
  await request(app).put(`/api/recipes/${privateId}/notes`).set('Authorization',other).send({personalNotes:'No'}).expect(404);
 });
});
