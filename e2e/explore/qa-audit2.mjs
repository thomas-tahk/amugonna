// For several pantries, print every Cook-now recipe with ingredient statuses (to spot false "have").
const API = 'http://localhost:3201/api';
const j = async (p, o = {}, t) => (await fetch(API + p, { ...o, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) } })).json();
const pantries = {
  messy: ['eggs', 'onion', 'garlic', 'cooked rice', 'chicken thighs', 'spinach', 'parmesan', 'milk', 'butter', 'frozen peas', 'soy sauce'],
  dairyOnly: ['milk', 'butter', 'cheese', 'yogurt'],
  veg: ['carrot', 'potato', 'onion', 'celery', 'tomato'],
  pasta: ['pasta', 'chopped tomatoes', 'garlic', 'parmesan', 'cream'],
  one: ['eggs'],
};
for (const [name, items] of Object.entries(pantries)) {
  const em = `audit-${name}-${Date.now()}@example.com`;
  const reg = await j('/auth/register', { method: 'POST', body: JSON.stringify({ email: em, password: 'Sup3rSecret!pw', firstName: 'A', lastName: 'B' }) });
  const t = reg.data?.token ?? reg.token;
  await j('/ingredients/user/bulk', { method: 'POST', body: JSON.stringify({ add: items }) }, t);
  const s = (await j('/recipes/suggestions', {}, t)).data;
  console.log(`\n=== ${name} [${items.join(', ')}] pantry=${s.pantrySize} cookNow=${s.cookNow.length} one=${s.oneAway.length} two=${s.twoAway.length}`);
  for (const r of s.cookNow) {
    const d = (await j('/recipes/' + r.id, {}, t)).data.recipe;
    console.log(`- ${r.title}: ` + d.ingredients.map((i) => `${i.name}${i.optional ? '?' : ''}[${i.status}${i.using ? ':' + i.using : ''}]`).join(', '));
  }
}
