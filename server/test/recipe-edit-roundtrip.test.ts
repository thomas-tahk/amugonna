import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/database.js';
import { generateToken } from '../src/lib/auth.js';

let userId:number|undefined;
afterAll(async()=>{if(userId){await prisma.recipeIngredient.deleteMany({where:{recipe:{createdBy:userId}}});await prisma.recipe.deleteMany({where:{createdBy:userId}});await prisma.user.delete({where:{id:userId}});}await prisma.$disconnect();});
describe.skipIf(process.env.TEST_DB_ENABLED!=='1')('import edit source roundtrip',()=>{
 it('keeps source quantities and allergen evidence after changing only the title',async()=>{
  const email=`roundtrip-${Date.now()}@amugonna.test`;
  const user=await prisma.user.create({data:{email,password:'test-only',avoidedAllergens:['milk']}});userId=user.id;
  const auth=`Bearer ${generateToken({userId,email})}`;
  const saved=await request(app).post('/api/recipe-imports').set('Authorization',auth).send({draft:{title:'Source rice',koreanTitle:'밥',description:'',ingredients:['½ cup rice','1 cup tomato with milk'],instructions:'Cook rice.\nAdd tomatoes.',sourceUrl:'',sourceName:'Personal test',cuisineTypes:[],prepTime:null,cookTime:10,servings:2}}).expect(201);
  const recipeId=saved.body.data.recipe.id;
  const before=await request(app).get(`/api/recipes/${recipeId}`).set('Authorization',auth).expect(200);
  await request(app).put(`/api/recipes/${recipeId}`).set('Authorization',auth).send({title:'Renamed rice',koreanTitle:'고친 밥',ingredients:before.body.data.recipe.recipeIngredients.map((ri:{ingredientId:number})=>({ingredientId:ri.ingredientId}))}).expect(200);
  const after=await request(app).get(`/api/recipes/${recipeId}`).set('Authorization',auth).expect(200);
  expect(after.body.data.recipe.koreanTitle).toBe('고친 밥');
  expect(after.body.data.recipe.recipeIngredients.map((ri:{rawText:string})=>ri.rawText)).toContain('1 cup tomato with milk');
  expect(after.body.data.recipe.recipeIngredients.map((ri:{measure:string})=>ri.measure)).toContain('½ cup');
  expect(after.body.data.recipe.ingredientReview.blocked).toContain('1 cup tomato with milk');
 });
});
