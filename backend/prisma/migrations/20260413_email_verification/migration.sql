-- Ajout des champs de vérification email
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifyToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verifyExpires" TIMESTAMP(3);
ALTER TABLE "User" ALTER COLUMN "isActive" SET DEFAULT false;

-- Créer un index unique sur verifyToken
CREATE UNIQUE INDEX IF NOT EXISTS "User_verifyToken_key" ON "User"("verifyToken");

-- Activer tous les comptes existants (migration sans rupture)
UPDATE "User" SET "isActive" = true, "emailVerified" = true WHERE "isActive" = false OR "emailVerified" = false;
