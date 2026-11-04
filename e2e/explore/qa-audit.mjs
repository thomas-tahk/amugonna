// API-level audit: parse messy phrases, then for several pantries list every Cook-now/one-away recipe with
// its ingredient statuses so swaps/false "have" can be eyeballed.
const API = 'http://localhost:3201/api';
const j = async (p, o = {}, t) => (await fetch(API + p, { ...o, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) } })).json();
const em = `audit-${Date.now()}@example.com`;
const reg = await j('/auth/register', { method: 'POST', body: JSON.stringify({ email: em, password: 'Sup3rSecret!pw', firstName: 'A', lastName: 'B' }) });
const token = reg.data?.token ?? reg.token;
const phrases = ['leftover rice', 'cooked rice', 'chicken thighs', 'boneless skinless chicken thighs', 'frozen peas', 'half an onion', '2 eggs', 'a dozen eggs', 'some garlic', 'garlic cloves', 'whole milk', 'skim milk', 'unsalted butter', 'parmesan cheese', 'grated parmesan', 'low sodium soy sauce', 'tinned tomatoes', 'passata', 'spring onions', 'scallions', 'coriander', 'baby spinach', 'minced beef', 'mince', 'bell peppers', 'capsicum', 'red onion', 'coconut oil', 'olive oil', 'oat milk', 'almond milk', 'peanut butter', 'butternut squash', 'leftover chicken', 'rotisserie chicken', 'eggz', 'chiken', 'tofu', 'EGGS!!', '  milk  ', 'half a lemon', 'a bit of cream', 'cheese', 'bread', 'stale bread', 'pasta', 'spaghetti', 'penne', 'basmati rice', 'jasmine rice', 'brown rice'];
const out = await j('/ingredients/user/parse', { method: 'POST', body: JSON.stringify({ text: phrases.join('\n') }) }, token);
for (const i of out.data.items) console.log(i.known ? 'known' : 'NEW  ', JSON.stringify(i.input), '->', i.name);
