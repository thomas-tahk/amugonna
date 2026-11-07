// Curated links only. Recipe text is fetched into an editable preview, never bundled here.
export const KOREAN_SOURCES = [
  { title: 'LA Galbi', korean: 'LA 갈비', category: 'Main dishes', note: 'Cross-cut short-rib version; source explains the cut and marinade.', path: 'la-galbi-gui-grilled-la-style-short-ribs/' },
  { title: 'Sundubu Gyeran Guk', korean: '순두부 계란국', category: 'Soups & stews', note: 'Soft-tofu and egg soup; distinct from a spicy sundubu stew.', path: 'sundubu-gyeran-guk-soft-tofu-and-egg-soup/' },
  { title: 'Kimbap', korean: '김밥', category: 'Rice & noodles', note: 'Seaweed rice rolls; review this author’s filling choices.', path: 'gimbapkimbap-korean-dried-seaweed-rolls/' },
  { title: 'Kimchi Jjim', korean: '김치찜', category: 'Main dishes', note: 'Braised kimchi; a different preparation from kimchi jjigae.', path: 'kimchi-jjim-braised-kimchi/' },
  { title: 'Kkakdugi', korean: '깍두기', category: 'Sides', note: 'Cubed radish kimchi; read the source’s fermentation guidance.', path: 'kkakdugi-cubed-radish-kimchi/' },
  { title: 'Gochu Doenjang Muchim', korean: '고추 된장무침', category: 'Sides', note: 'Green chili peppers dressed with soybean paste.', path: 'gochu-doenjang-muchim/' },
  { title: 'Kimchi Kongnamul Guk', korean: '김치 콩나물국', category: 'Soups & stews', note: 'Soybean-sprout soup with kimchi.', path: 'kimchi-kongnamul-guk-soybean-sprout/' },
  { title: 'Manduguk', korean: '만둣국', category: 'Soups & stews', note: 'Dumpling soup; review the dumpling fillings and broth.', path: 'manduguk-korean-dumpling-soup/' },
  { title: 'Kimchi Jjigae', korean: '김치찌개', category: 'Soups & stews', note: 'Hyosun’s kimchi-stew version; other proteins and broths exist.', path: 'kimchi-jjigae-kimchi-stew/' },
  { title: 'Jajangmyeon', korean: '짜장면', category: 'Rice & noodles', note: 'Korean-Chinese black-bean-sauce noodles.', path: 'jajangmyeon-noodles-in-black-bean-sauce/' },
  { title: 'Bibimbap', korean: '비빔밥', category: 'Rice & noodles', note: 'Mixed rice with toppings; this is one version, not every regional style.', path: 'bibimbap/' },
  { title: 'Japchae', korean: '잡채', category: 'Rice & noodles', note: 'Stir-fried glass noodles; source specifies its beef and vegetable version.', path: 'japchae-korean-stir-fried-starch/' },
  { title: 'Gungjung Tteokbokki', korean: '궁중 떡볶이', category: 'Main dishes', note: 'Royal-court-style rice cakes; distinct from the spicy red-sauce style.', path: 'gungjung-tteokbokki-and-lunar-new-year/' },
  { title: 'Watercress Namul', korean: '물냉이 나물', category: 'Sides', note: 'A seasoned-green side dish using watercress.', path: 'watercress-namul/' },
  { title: 'Hobak Jeon', korean: '호박전', category: 'Sides', note: 'Zucchini slices in egg batter; distinct from a shredded zucchini pancake.', path: 'hobak-jeon-pan-fried-zucchini-in-egg-batter/' },
  { title: 'Korean Potato Salad', korean: '감자 샐러드', category: 'Sides', note: 'Review the source’s mix-ins and dressing before importing.', path: 'korean-potato-salad/' },
].map(recipe => ({ ...recipe, source: 'Korean Bapsang · Hyosun', url: `https://www.koreanbapsang.com/${recipe.path}` }));
