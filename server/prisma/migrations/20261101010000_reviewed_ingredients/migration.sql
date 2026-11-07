ALTER TABLE "users" ADD COLUMN "reviewed_ingredients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
