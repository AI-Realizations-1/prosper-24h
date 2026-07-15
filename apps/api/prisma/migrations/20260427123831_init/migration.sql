-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PILOT', 'CONTRIBUTOR', 'VALIDATOR', 'READER');

-- CreateEnum
CREATE TYPE "StudyStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'PARTIAL', 'NON_COMPLIANT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL,
    "status" "StudyStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "studies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_values" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supporting_assets" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supporting_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fear_events" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "businessValueId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "gravity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fear_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_baselines" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "referential" TEXT NOT NULL,
    "compliance" "ComplianceStatus" NOT NULL DEFAULT 'PARTIAL',
    "gap" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_users" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BusinessValueToSupportingAsset" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_FearEventToSupportingAsset" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "studies_ownerId_idx" ON "studies"("ownerId");

-- CreateIndex
CREATE INDEX "business_values_studyId_idx" ON "business_values"("studyId");

-- CreateIndex
CREATE INDEX "supporting_assets_studyId_idx" ON "supporting_assets"("studyId");

-- CreateIndex
CREATE INDEX "fear_events_studyId_idx" ON "fear_events"("studyId");

-- CreateIndex
CREATE INDEX "fear_events_businessValueId_idx" ON "fear_events"("businessValueId");

-- CreateIndex
CREATE INDEX "security_baselines_studyId_idx" ON "security_baselines"("studyId");

-- CreateIndex
CREATE INDEX "study_users_userId_idx" ON "study_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "study_users_studyId_userId_key" ON "study_users"("studyId", "userId");

-- CreateIndex
CREATE INDEX "audit_logs_studyId_idx" ON "audit_logs"("studyId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "_BusinessValueToSupportingAsset_AB_unique" ON "_BusinessValueToSupportingAsset"("A", "B");

-- CreateIndex
CREATE INDEX "_BusinessValueToSupportingAsset_B_index" ON "_BusinessValueToSupportingAsset"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FearEventToSupportingAsset_AB_unique" ON "_FearEventToSupportingAsset"("A", "B");

-- CreateIndex
CREATE INDEX "_FearEventToSupportingAsset_B_index" ON "_FearEventToSupportingAsset"("B");

-- AddForeignKey
ALTER TABLE "studies" ADD CONSTRAINT "studies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_values" ADD CONSTRAINT "business_values_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supporting_assets" ADD CONSTRAINT "supporting_assets_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fear_events" ADD CONSTRAINT "fear_events_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fear_events" ADD CONSTRAINT "fear_events_businessValueId_fkey" FOREIGN KEY ("businessValueId") REFERENCES "business_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_baselines" ADD CONSTRAINT "security_baselines_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_users" ADD CONSTRAINT "study_users_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_users" ADD CONSTRAINT "study_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessValueToSupportingAsset" ADD CONSTRAINT "_BusinessValueToSupportingAsset_A_fkey" FOREIGN KEY ("A") REFERENCES "business_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BusinessValueToSupportingAsset" ADD CONSTRAINT "_BusinessValueToSupportingAsset_B_fkey" FOREIGN KEY ("B") REFERENCES "supporting_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FearEventToSupportingAsset" ADD CONSTRAINT "_FearEventToSupportingAsset_A_fkey" FOREIGN KEY ("A") REFERENCES "fear_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FearEventToSupportingAsset" ADD CONSTRAINT "_FearEventToSupportingAsset_B_fkey" FOREIGN KEY ("B") REFERENCES "supporting_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
