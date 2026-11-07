import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { generateToken } from '../src/lib/auth.js';

afterEach(() => { delete process.env.PERSONAL_ACCESS_EMAIL; });
describe('optional personal deployment access', () => {
 it('rejects registration for other email addresses before database access', async () => {
  process.env.PERSONAL_ACCESS_EMAIL='owner@amugonna.test';
  const response=await request(app).post('/api/auth/register').send({email:'other@amugonna.test',password:'Test-only1!',firstName:'Other'});
  expect(response.status).toBe(403);
 });
 it('rejects an existing token for a non-owner when access is restricted', async () => {
  process.env.PERSONAL_ACCESS_EMAIL='owner@amugonna.test';
  const token=generateToken({userId:999,email:'other@amugonna.test'});
  const response=await request(app).get('/api/preferences').set('Authorization',`Bearer ${token}`);
  expect(response.status).toBe(403);
 });
});
