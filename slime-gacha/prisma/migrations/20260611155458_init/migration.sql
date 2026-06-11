-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "souls" INTEGER NOT NULL DEFAULT 150,
    "highScore" INTEGER NOT NULL DEFAULT 0,
    "totalGamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "ownedCharacters" TEXT[],
    "lastGachaPull" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
