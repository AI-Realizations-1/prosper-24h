-- CreateEnum
CREATE TYPE "TreatmentDecision" AS ENUM ('PENDING', 'REDUCTION', 'ACCEPTANCE', 'TRANSFER', 'REFUSAL');

-- CreateEnum
CREATE TYPE "MeasureStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED');

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "operationalScenarioId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "treatmentDecision" "TreatmentDecision" NOT NULL DEFAULT 'PENDING',
    "residualLevel" INTEGER,
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_measures" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "status" "MeasureStatus" NOT NULL DEFAULT 'PLANNED',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_measures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "risks_operationalScenarioId_key" ON "risks"("operationalScenarioId");

-- CreateIndex
CREATE INDEX "risks_studyId_idx" ON "risks"("studyId");

-- CreateIndex
CREATE INDEX "security_measures_studyId_idx" ON "security_measures"("studyId");

-- CreateIndex
CREATE INDEX "security_measures_riskId_idx" ON "security_measures"("riskId");

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_operationalScenarioId_fkey" FOREIGN KEY ("operationalScenarioId") REFERENCES "operational_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_measures" ADD CONSTRAINT "security_measures_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_measures" ADD CONSTRAINT "security_measures_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
