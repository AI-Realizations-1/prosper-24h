-- CreateTable
CREATE TABLE "stakeholders" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dependencyLevel" INTEGER NOT NULL,
    "threatLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stakeholders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_scenarios" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "fearEventId" TEXT NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_scenario_stakeholders" (
    "scenarioId" TEXT NOT NULL,
    "stakeholderId" TEXT NOT NULL,

    CONSTRAINT "strategic_scenario_stakeholders_pkey" PRIMARY KEY ("scenarioId","stakeholderId")
);

-- CreateIndex
CREATE INDEX "stakeholders_studyId_idx" ON "stakeholders"("studyId");

-- CreateIndex
CREATE INDEX "strategic_scenarios_studyId_idx" ON "strategic_scenarios"("studyId");

-- AddForeignKey
ALTER TABLE "stakeholders" ADD CONSTRAINT "stakeholders_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_scenarios" ADD CONSTRAINT "strategic_scenarios_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_scenarios" ADD CONSTRAINT "strategic_scenarios_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "risk_source_objective_pairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_scenarios" ADD CONSTRAINT "strategic_scenarios_fearEventId_fkey" FOREIGN KEY ("fearEventId") REFERENCES "fear_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_scenario_stakeholders" ADD CONSTRAINT "strategic_scenario_stakeholders_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "strategic_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_scenario_stakeholders" ADD CONSTRAINT "strategic_scenario_stakeholders_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "stakeholders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
