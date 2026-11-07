CREATE TABLE "recipe_notes" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "recipe_id" INTEGER NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "personal_notes" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recipe_notes_user_id_recipe_id_key" UNIQUE ("user_id", "recipe_id")
);
