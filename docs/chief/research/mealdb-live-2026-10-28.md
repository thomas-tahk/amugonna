# TheMealDB live import — measured 2026-10-28

Source: GitHub Actions run of `.github/workflows/mealdb-live.yml` on branch `m1-live-probe`
(https://github.com/thomas-tahk/amugonna/actions/runs/40678402574). Production seed (vocabulary + 21 starter recipes, no test fixture) + full TheMealDB import via the free test key. Nothing from TheMealDB is committed; this page holds only counts and ingredient *names*.

## Size
- **790 TheMealDB recipes** fetched (a..z, 0 failures) + 21 starter recipes = 811.
- 8,336 recipe ingredient lines; **7,478 (89.7%) link to a vocabulary ingredient** before the vocabulary pass.
- 453 distinct ingredient names not in the vocabulary (long tail; most appear once).

## Reference pantries (before the vocabulary pass)
| pantry | items | cook now | 1 away | 2 away |
|---|---|---|---|---|
| BASIC (eggs, rice, onion, garlic, chicken breast, pasta, chopped tomatoes, cheddar) | 8 | 0 | 13 | 25 |
| BASIC_PLUS (+ butter, milk, flour, sugar, lemon, potato, carrot, bread) | 16 | 8 | 48 | 71 |
| STOCKED (+ 18 more: peppers, spinach, mushroom, ground beef, bacon, parmesan, soy, ginger, stock, beans, coconut milk, spices, honey, yogurt, cream, green onion) | 34 | 22 | 68 | 109 |

Reading: a bare 8-item pantry finds nothing cookable now in 811 recipes (each needs butter/milk/flour/herbs etc.), but plenty that are 1 away. A normal kitchen (BASIC_PLUS) gets 8 now / 48 one away; a stocked one 22 / 68. "1 ingredient away" is doing real work and should stay prominent.

## Top names missing from the vocabulary (count = recipe lines)
24 sesame seed oil · 9 bean sprout · 9 egg plant · 9 hotsauce · 8 dulce de leche · 8 harissa spice · 8 squid · 7 almond extract · 7 brandy · 7 challot · 7 golden caster sugar · 7 lard · 7 orange blossom water · 7 sherry vinegar · 6 beef brisket · 6 coconut cream · 6 dried apricot · 6 fish stock · 6 marjoram · 6 shortening · 6 star anise · 6 tamarind paste · 5 blackberry · 5 custard · 5 digestive biscuit · 5 english mustard · 5 ground cardomom · 5 ground nut oil · 5 gruyere · 5 mascarpone · 5 paella rice · 5 palm sugar · 5 sauerkraut · 5 starch · 5 swede · 4 all purpose seasoning · 4 beef fillet · 4 brown lentil · 4 caraway seed · 4 celeriac · 4 celery salt · 4 clam · 4 crusty bread · 4 dried fruit · 4 filo pastry · 4 galangal · 4 mussel · 4 prune · 4 rose water · 4 salt cod · 4 semolina · 4 suet · 4 vanilla sugar · 3 apricot · 3 black pudding · 3 braeburn apple · 3 breadfruit · 3 chimichurri sauce · 3 cilantro leaf · 3 codfish bulljaw · 3 corned beef · 3 currant · 3 ghee · 3 ginger paste · 3 jersey royal potato · 3 lamb loin chop · 3 lamb stock · 3 lime leaf · 3 makrut lime leaf · 3 mirin · 3 onion salt · 3 oyster mushroom · 3 plantain · 3 pretzel · 3 raspberry jam · 3 red pepper paste · 3 red potato · 3 rice flour · 3 rye bread · 3 sake · 3 sichuan pepper · 3 soya bean · 3 sushi rice · 3 tapioca · 3 water chestnut

Seen twice: almond essence, apricot jam, bamboo shoot, banana leaf, barbeque sauce, beef shin, brie, brown rice noodle, buckwheat, cacao, callaloo, candied peel, cassava, chicken liver, chinese broccoli, chinese five spice powder, christma pudding, clotted cream, coco sugar, conch, daikon radish, dark rum, dried cranberry, duck leg, duck sauce, fig, frozen seafood mix, fruit mix, garlic sauce, gelatine leaf, ginger cordial, ginger garlic paste, glace cherry, goat meat, goose fat, gouda cheese, grand marnier, ground sugar, hispi cabbage, horseradish, hummus, italian fennel sausage, jamaican curry powder, jamon iberico, jerusalem artichoke, kaffir lime leaf, lamb kidney, linguine pasta, marzipan, meringue nest, mexican cheese, mincemeat, miniature marshmallow, mixed peel, monterey jack cheese, oxtail, pecorino, pickle juice, poppy seed, pork back rib, pork tenderloin, potato starch, pul biber, red chilli powder, rhubarb, rice paper sheet, rice stick noodle, rice wine, romano pepper, rye flour, sardine, savoy cabbage, sazon goya, seasoning, semolina flour, sesame seed burger bun, stir fry vegetable, summer savoury, sweet smoked paprika, udon noodle, vegetable millk, vermicelli pasta, vermicelli rice noodle, wheat flour, white chocolate chip.

Also seen once (selection worth mapping): gruyere cheese, pinto bean, refried bean, rigatoni, farfalle, bowtie pasta, paneer, pomegranate, cranberry, smoky paprika, hot smoked paprika, mixed spice, mackerel, monkfish, lobster, oyster, sea bass fillet, red snapper, herring, hake, kielbasa, lamb shank, chuck roast, beef tenderloin, beef flank steak, ciabatta, english muffin, phyllo dough, ready rolled shortcrust pastry, gochujang, shaoxing wine, ras el hanout, cream of tartar, custard powder, fenugreek, juniper berry, habanero pepper, ancho chilli, queso fresco, manchego, stilton cheese, emmentaler cheese, pumpkin puree, pineapple juice, bulgur wheat, black eyed pea, borlotti bean, mung bean sprout, chickpea flour, grits, plum sauce, shrimp paste, seafood stock, chicken bouillon powder, beef stock concentrate, hot beef stock.

Observed matcher behaviour worth keeping in mind: canned/chopped tomatoes do not satisfy fresh "tomato" (Shakshouka, tacos show "Need: tomato"); ground beef does not satisfy "beef" cuts (Bistek). Both were deliberate review decisions (#3).
