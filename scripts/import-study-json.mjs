import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const requireFromApi = createRequire(path.resolve(__dirname, '../apps/api/package.json'));
const { config: loadEnv } = requireFromApi('dotenv');
const { PrismaClient, UserRole } = requireFromApi('@prisma/client');
const bcrypt = requireFromApi('bcrypt');

loadEnv({ path: path.resolve(__dirname, '../apps/api/.env') });

const prisma = new PrismaClient();

const fixturePath = process.argv[2] ?? path.resolve(__dirname, './fixtures/prosper-ii901-demo.json');
const ownerEmail = process.argv[3] ?? 'admin@prosper.local';
const ownerPassword = process.argv[4] ?? 'Prosper123!';

async function ensureOwner(email, password) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: UserRole.PILOT,
    },
  });
}

async function main() {
  const raw = await fs.readFile(fixturePath, 'utf8');
  const fixture = JSON.parse(raw);

  const owner = await ensureOwner(ownerEmail, ownerPassword);

  const createdStudy = await prisma.$transaction(async (tx) => {
    const study = await tx.study.create({
      data: {
        ...fixture.study,
        ownerId: owner.id,
      },
    });

    const businessValueIds = new Map();
    for (const item of fixture.businessValues) {
      const created = await tx.businessValue.create({
        data: {
          studyId: study.id,
          name: item.name,
          description: item.description,
        },
      });
      businessValueIds.set(item.key, created.id);
    }

    const supportingAssetIds = new Map();
    for (const item of fixture.supportingAssets) {
      const created = await tx.supportingAsset.create({
        data: {
          studyId: study.id,
          name: item.name,
          type: item.type,
          businessValues: {
            connect: item.businessValueKeys.map((key) => ({ id: businessValueIds.get(key) })),
          },
        },
      });
      supportingAssetIds.set(item.key, created.id);
    }

    const fearEventIds = new Map();
    for (const item of fixture.fearEvents) {
      const created = await tx.fearEvent.create({
        data: {
          studyId: study.id,
          businessValueId: businessValueIds.get(item.businessValueKey),
          description: item.description,
          gravity: item.gravity,
          supportingAssets: {
            connect: item.supportingAssetKeys.map((key) => ({ id: supportingAssetIds.get(key) })),
          },
        },
      });
      fearEventIds.set(item.key, created.id);
    }

    for (const item of fixture.securityBaselines) {
      await tx.securityBaseline.create({
        data: {
          studyId: study.id,
          referential: item.referential,
          compliance: item.compliance,
          gap: item.gap,
        },
      });
    }

    const riskSourceIds = new Map();
    for (const item of fixture.riskSources) {
      const created = await tx.riskSource.create({
        data: {
          studyId: study.id,
          name: item.name,
          category: item.category,
          description: item.description,
        },
      });
      riskSourceIds.set(item.key, created.id);
    }

    const targetObjectiveIds = new Map();
    for (const item of fixture.targetObjectives) {
      const created = await tx.targetObjective.create({
        data: {
          studyId: study.id,
          description: item.description,
        },
      });
      targetObjectiveIds.set(item.key, created.id);
    }

    const pairIds = new Map();
    for (const item of fixture.pairs) {
      const created = await tx.riskSourceObjectivePair.create({
        data: {
          studyId: study.id,
          riskSourceId: riskSourceIds.get(item.riskSourceKey),
          targetObjectiveId: targetObjectiveIds.get(item.targetObjectiveKey),
          relevance: item.relevance,
          justification: item.justification,
        },
      });
      pairIds.set(item.key, created.id);
    }

    const stakeholderIds = new Map();
    for (const item of fixture.stakeholders) {
      const created = await tx.stakeholder.create({
        data: {
          studyId: study.id,
          name: item.name,
          category: item.category,
          dependencyLevel: item.dependencyLevel,
          threatLevel: item.threatLevel,
        },
      });
      stakeholderIds.set(item.key, created.id);
    }

    const strategicScenarioIds = new Map();
    for (const item of fixture.strategicScenarios) {
      const created = await tx.strategicScenario.create({
        data: {
          studyId: study.id,
          pairId: pairIds.get(item.pairKey),
          fearEventId: fearEventIds.get(item.fearEventKey),
          likelihood: item.likelihood,
          stakeholders: {
            create: (item.stakeholderKeys ?? []).map((key) => ({ stakeholderId: stakeholderIds.get(key) })),
          },
        },
      });
      strategicScenarioIds.set(item.key, created.id);
    }

    const operationalScenarioIds = new Map();
    for (const item of fixture.operationalScenarios) {
      const created = await tx.operationalScenario.create({
        data: {
          studyId: study.id,
          strategicScenarioId: strategicScenarioIds.get(item.strategicScenarioKey),
          description: item.description,
          technicalLikelihood: item.technicalLikelihood,
          supportingAssets: {
            create: item.supportingAssetKeys.map((key) => ({ supportingAssetId: supportingAssetIds.get(key) })),
          },
        },
      });
      operationalScenarioIds.set(item.key, created.id);
    }

    const riskIds = new Map();
    for (const item of fixture.risks) {
      const created = await tx.risk.create({
        data: {
          studyId: study.id,
          operationalScenarioId: operationalScenarioIds.get(item.operationalScenarioKey),
          level: item.level,
          treatmentDecision: item.treatmentDecision,
          residualLevel: item.residualLevel,
          justification: item.justification,
        },
      });
      riskIds.set(item.key, created.id);
    }

    for (const item of fixture.securityMeasures) {
      await tx.securityMeasure.create({
        data: {
          studyId: study.id,
          riskId: riskIds.get(item.riskKey),
          name: item.name,
          description: item.description,
          type: item.type,
          priority: item.priority,
          status: item.status,
          dueDate: item.dueDate ? new Date(item.dueDate) : null,
        },
      });
    }

    await tx.auditLogEntry.create({
      data: {
        studyId: study.id,
        userId: owner.id,
        action: 'IMPORT',
        target: 'Study',
        targetId: study.id,
        details: `Import complet depuis ${path.basename(fixturePath)}`,
      },
    });

    return study;
  });

  const summary = {
    studyId: createdStudy.id,
    name: createdStudy.name,
    owner: owner.email,
    businessValues: fixture.businessValues.length,
    supportingAssets: fixture.supportingAssets.length,
    fearEvents: fixture.fearEvents.length,
    securityBaselines: fixture.securityBaselines.length,
    riskSources: fixture.riskSources.length,
    targetObjectives: fixture.targetObjectives.length,
    pairs: fixture.pairs.length,
    stakeholders: fixture.stakeholders.length,
    strategicScenarios: fixture.strategicScenarios.length,
    operationalScenarios: fixture.operationalScenarios.length,
    risks: fixture.risks.length,
    securityMeasures: fixture.securityMeasures.length,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });