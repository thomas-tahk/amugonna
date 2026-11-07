ALTER TABLE "users" ADD COLUMN "avoided_allergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN "excluded_ingredients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
