-- CreateTable
CREATE TABLE "operational_scenarios" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "strategicScenarioId" TEXT NOT NULL,
    "description" TEXT,
    "technicalLikelihood" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_scenario_supporting_assets" (
    "operationalScenarioId" TEXT NOT NULL,
    "supportingAssetId" TEXT NOT NULL,

    CONSTRAINT "operational_scenario_supporting_assets_pkey" PRIMARY KEY ("operationalScenarioId","supportingAssetId")
);

-- CreateIndex
CREATE INDEX "operational_scenarios_studyId_idx" ON "operational_scenarios"("studyId");

-- CreateIndex
CREATE INDEX "operational_scenarios_strategicScenarioId_idx" ON "operational_scenarios"("strategicScenarioId");

-- AddForeignKey
ALTER TABLE "operational_scenarios" ADD CONSTRAINT "operational_scenarios_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_scenarios" ADD CONSTRAINT "operational_scenarios_strategicScenarioId_fkey" FOREIGN KEY ("strategicScenarioId") REFERENCES "strategic_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_scenario_supporting_assets" ADD CONSTRAINT "operational_scenario_supporting_assets_operationalScenario_fkey" FOREIGN KEY ("operationalScenarioId") REFERENCES "operational_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_scenario_supporting_assets" ADD CONSTRAINT "operational_scenario_supporting_assets_supportingAssetId_fkey" FOREIGN KEY ("supportingAssetId") REFERENCES "supporting_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
