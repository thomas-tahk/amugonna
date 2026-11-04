-- Recipe base: canonical ingredients (+ family/staple/common/order), recipe attribution and import identity.
-- Way back (manual, nothing else depends on it yet):
--   ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_parent_id_fkey";
--   DROP INDEX "recipes_external_source_external_id_key", "recipe_ingredients_ingredient_id_idx",
--     "recipe_ingredients_recipe_id_idx", "ingredients_parent_id_idx", "ingredients_canonical_key";
--   ALTER TABLE "recipes" DROP COLUMN "area", DROP COLUMN "attribution", DROP COLUMN "category",
--     DROP COLUMN "external_id", DROP COLUMN "external_source", DROP COLUMN "image_url", DROP COLUMN "license";
--   ALTER TABLE "recipe_ingredients" DROP COLUMN "measure", DROP COLUMN "raw_text";
--   ALTER TABLE "ingredients" DROP COLUMN "canonical", DROP COLUMN "is_common", DROP COLUMN "is_staple",
--     DROP COLUMN "parent_id", DROP COLUMN "sort_order";

-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "canonical" TEXT,
ADD COLUMN     "is_common" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_staple" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "sort_order" INTEGER;

-- AlterTable
ALTER TABLE "recipe_ingredients" ADD COLUMN     "measure" TEXT,
ADD COLUMN     "raw_text" TEXT;

-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "area" TEXT,
ADD COLUMN     "attribution" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "external_source" TEXT,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "license" TEXT;

-- Backfill canonical for rows that existed before this migration (lower(name); the
-- lowest id keeps it, any case-only duplicate gets "-<id>" so the unique index can be built).
UPDATE "ingredients" i SET "canonical" = lower(i."name")
WHERE i."id" = (SELECT min(j."id") FROM "ingredients" j WHERE lower(j."name") = lower(i."name"));
UPDATE "ingredients" SET "canonical" = lower("name") || '-' || "id" WHERE "canonical" IS NULL;
ALTER TABLE "ingredients" ALTER COLUMN "canonical" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_canonical_key" ON "ingredients"("canonical");

-- CreateIndex
CREATE INDEX "ingredients_parent_id_idx" ON "ingredients"("parent_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredient_id_idx" ON "recipe_ingredients"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_external_source_external_id_key" ON "recipes"("external_source", "external_id");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

