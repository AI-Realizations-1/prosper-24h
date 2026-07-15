-- CreateEnum
CREATE TYPE "PairRelevance" AS ENUM ('PENDING', 'RETAINED', 'EXCLUDED');

-- CreateTable
CREATE TABLE "risk_sources" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_objectives" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_source_objective_pairs" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "riskSourceId" TEXT NOT NULL,
    "targetObjectiveId" TEXT NOT NULL,
    "relevance" "PairRelevance" NOT NULL DEFAULT 'PENDING',
    "justification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_source_objective_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "risk_sources_studyId_idx" ON "risk_sources"("studyId");

-- CreateIndex
CREATE INDEX "target_objectives_studyId_idx" ON "target_objectives"("studyId");

-- CreateIndex
CREATE INDEX "risk_source_objective_pairs_studyId_idx" ON "risk_source_objective_pairs"("studyId");

-- CreateIndex
CREATE UNIQUE INDEX "risk_source_objective_pairs_studyId_riskSourceId_targetObje_key" ON "risk_source_objective_pairs"("studyId", "riskSourceId", "targetObjectiveId");

-- AddForeignKey
ALTER TABLE "risk_sources" ADD CONSTRAINT "risk_sources_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_objectives" ADD CONSTRAINT "target_objectives_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_source_objective_pairs" ADD CONSTRAINT "risk_source_objective_pairs_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_source_objective_pairs" ADD CONSTRAINT "risk_source_objective_pairs_riskSourceId_fkey" FOREIGN KEY ("riskSourceId") REFERENCES "risk_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_source_objective_pairs" ADD CONSTRAINT "risk_source_objective_pairs_targetObjectiveId_fkey" FOREIGN KEY ("targetObjectiveId") REFERENCES "target_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
