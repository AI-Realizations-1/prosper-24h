import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { PassThrough } from 'stream';

const prisma = new PrismaClient();

async function loadFullStudy(studyId: string) {
  return prisma.study.findUniqueOrThrow({
    where: { id: studyId },
    include: {
      owner: { select: { email: true } },
      businessValues: true,
      supportingAssets: true,
      fearEvents: true,
      securityBaselines: true,
      riskSources: true,
      targetObjectives: true,
      riskSourceObjectivePairs: true,
      stakeholders: true,
      strategicScenarios: true,
      operationalScenarios: {
        include: {
          risk: { include: { securityMeasures: true } },
        },
      },
    },
  });
}

export class ExportService {
  // ─── FT-06 : Export PDF ───────────────────────────────────────────
  static async exportPdf(studyId: string): Promise<Buffer> {
    const study = await loadFullStudy(studyId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      const stream = new PassThrough();

      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      doc.pipe(stream);

      // Titre
      doc.fontSize(20).text(`Étude EBIOS RM — ${study.name}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Portée : ${study.scope}`);
      if (study.description) doc.text(`Description : ${study.description}`);
      doc.text(`Statut : ${study.status}`);
      doc.text(`Propriétaire : ${study.owner.email}`);
      doc.text(`Exporté le : ${new Date().toLocaleDateString('fr-FR')}`);
      doc.moveDown();

      // A1 : Valeurs métier
      doc.fontSize(14).text('Atelier 1 — Cadrage et socle de sécurité');
      doc.fontSize(11).text(`Valeurs métier (${study.businessValues.length})`);
      study.businessValues.forEach((bv) => {
        doc.fontSize(10).text(`• ${bv.name}${bv.description ? ' — ' + bv.description : ''}`);
      });
      doc.fontSize(11).text(`Biens supports (${study.supportingAssets.length})`);
      study.supportingAssets.forEach((sa) => {
        doc.fontSize(10).text(`• ${sa.name} [${sa.type}]`);
      });
      doc.fontSize(11).text(`Événements redoutés (${study.fearEvents.length})`);
      study.fearEvents.forEach((fe) => {
        doc.fontSize(10).text(`• ${fe.description} (gravité ${fe.gravity})`);
      });
      doc.fontSize(11).text(`Socle de sécurité (${study.securityBaselines.length})`);
      study.securityBaselines.forEach((sb) => {
        doc.fontSize(10).text(`• ${sb.referential} — ${sb.compliance}${sb.gap ? ' | Écart : ' + sb.gap : ''}`);
      });
      doc.moveDown();

      // A2 : Sources de risque
      doc.fontSize(14).text('Atelier 2 — Sources de risque');
      study.riskSources.forEach((rs) => {
        doc.fontSize(10).text(`• ${rs.name} [${rs.category}]${rs.description ? ' — ' + rs.description : ''}`);
      });
      doc.fontSize(11).text(`Objectifs visés (${study.targetObjectives.length})`);
      study.targetObjectives.forEach((to) => {
        doc.fontSize(10).text(`• ${to.description}`);
      });
      doc.fontSize(11).text(`Couples SR/OV (${study.riskSourceObjectivePairs.length})`);
      study.riskSourceObjectivePairs.forEach((pair) => {
        doc.fontSize(10).text(`• ${pair.riskSourceId.slice(-6)} ↔ ${pair.targetObjectiveId.slice(-6)} — ${pair.relevance}`);
      });
      doc.moveDown();

      // A3 : Scénarios stratégiques
      doc.fontSize(14).text('Atelier 3 — Scénarios stratégiques');
      study.stakeholders.forEach((st) => {
        doc.fontSize(10).text(`• ${st.name} [${st.category}] — dépendance ${st.dependencyLevel} / menace ${st.threatLevel}`);
      });
      doc.fontSize(11).text(`Scénarios stratégiques (${study.strategicScenarios.length})`);
      study.strategicScenarios.forEach((ss) => {
        doc.fontSize(10).text(`• Scénario #${ss.id.slice(-6)} — vraisemblance ${ss.likelihood}`);
      });
      doc.moveDown();

      // A4 : Scénarios opérationnels
      doc.fontSize(14).text('Atelier 4 — Scénarios opérationnels');
      study.operationalScenarios.forEach((os) => {
        doc.fontSize(10).text(`• #${os.id.slice(-6)}${os.description ? ' — ' + os.description : ''} (vraisemblance technique ${os.technicalLikelihood})`);
      });
      doc.moveDown();

      // A5 : Risques et mesures
      doc.fontSize(14).text('Atelier 5 — Traitement du risque');
      study.operationalScenarios.forEach((os) => {
        if (!os.risk) return;
        const r = os.risk;
        doc.fontSize(10).text(`Risque #${r.id.slice(-6)} — niveau ${r.level} — ${r.treatmentDecision}${r.residualLevel ? ' (résiduel ' + r.residualLevel + ')' : ''}`);
        r.securityMeasures.forEach((sm) => {
          doc.fontSize(9).text(`  ↳ ${sm.name} [${sm.type}] — ${sm.status} (priorité ${sm.priority})`);
        });
      });

      doc.end();
    });
  }

  // ─── FT-07 : Export Excel ─────────────────────────────────────────
  static async exportExcel(studyId: string): Promise<Buffer> {
    const study = await loadFullStudy(studyId);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Prosper EBIOS RM';
    wb.created = new Date();

    // Feuille Résumé
    const wsInfo = wb.addWorksheet('Résumé');
    wsInfo.addRow(['Champ', 'Valeur']);
    wsInfo.addRow(['Nom', study.name]);
    wsInfo.addRow(['Portée', study.scope]);
    wsInfo.addRow(['Statut', study.status]);
    wsInfo.addRow(['Propriétaire', study.owner.email]);
    wsInfo.addRow(['Exporté le', new Date().toLocaleDateString('fr-FR')]);

    // A1 — Valeurs métier
    const wsBV = wb.addWorksheet('A1-Valeurs métier');
    wsBV.addRow(['ID', 'Nom', 'Description']);
    study.businessValues.forEach((bv) => wsBV.addRow([bv.id, bv.name, bv.description ?? '']));

    // A1 — Biens supports
    const wsSA = wb.addWorksheet('A1-Biens supports');
    wsSA.addRow(['ID', 'Nom', 'Type']);
    study.supportingAssets.forEach((sa) => wsSA.addRow([sa.id, sa.name, sa.type]));

    // A1 — Événements redoutés
    const wsFE = wb.addWorksheet('A1-Événements redoutés');
    wsFE.addRow(['ID', 'Description', 'Gravité', 'BV ID']);
    study.fearEvents.forEach((fe) => wsFE.addRow([fe.id, fe.description, fe.gravity, fe.businessValueId]));

    // A1 — Socle sécurité
    const wsSB = wb.addWorksheet('A1-Socle sécurité');
    wsSB.addRow(['ID', 'Référentiel', 'Conformité', 'Écart']);
    study.securityBaselines.forEach((sb) => wsSB.addRow([sb.id, sb.referential, sb.compliance, sb.gap ?? '']));

    // A2 — Sources de risque
    const wsRS = wb.addWorksheet('A2-Sources de risque');
    wsRS.addRow(['ID', 'Nom', 'Catégorie', 'Description']);
    study.riskSources.forEach((rs) => wsRS.addRow([rs.id, rs.name, rs.category, rs.description ?? '']));

    // A2 — Objectifs visés
    const wsTO = wb.addWorksheet('A2-Objectifs visés');
    wsTO.addRow(['ID', 'Description']);
    study.targetObjectives.forEach((to) => wsTO.addRow([to.id, to.description]));

    // A3 — Parties prenantes
    const wsST = wb.addWorksheet('A3-Parties prenantes');
    wsST.addRow(['ID', 'Nom', 'Catégorie', 'Dépendance', 'Menace']);
    study.stakeholders.forEach((st) => wsST.addRow([st.id, st.name, st.category, st.dependencyLevel, st.threatLevel]));

    // A3 — Scénarios stratégiques
    const wsSS = wb.addWorksheet('A3-Scénarios stratégiques');
    wsSS.addRow(['ID', 'Couple SR/OV', 'Événement redouté', 'Vraisemblance']);
    study.strategicScenarios.forEach((ss) => wsSS.addRow([ss.id, ss.pairId, ss.fearEventId, ss.likelihood]));

    // A4 — Scénarios opérationnels
    const wsOS = wb.addWorksheet('A4-Scénarios opérationnels');
    wsOS.addRow(['ID', 'Scénario stratégique', 'Description', 'Vraisemblance technique']);
    study.operationalScenarios.forEach((os) =>
      wsOS.addRow([os.id, os.strategicScenarioId, os.description ?? '', os.technicalLikelihood])
    );

    // A5 — Risques
    const wsRisk = wb.addWorksheet('A5-Risques');
    wsRisk.addRow(['ID', 'Scénario opérationnel', 'Niveau', 'Décision', 'Niveau résiduel', 'Justification']);
    study.operationalScenarios.forEach((os) => {
      if (!os.risk) return;
      const r = os.risk;
      wsRisk.addRow([r.id, os.id, r.level, r.treatmentDecision, r.residualLevel ?? '', r.justification ?? '']);
    });

    // A5 — Mesures de sécurité
    const wsSM = wb.addWorksheet('A5-Mesures sécurité');
    wsSM.addRow(['ID', 'Risque ID', 'Nom', 'Type', 'Priorité', 'Statut', 'Échéance']);
    study.operationalScenarios.forEach((os) => {
      if (!os.risk) return;
      os.risk.securityMeasures.forEach((sm) => {
        wsSM.addRow([sm.id, os.risk!.id, sm.name, sm.type, sm.priority, sm.status, sm.dueDate?.toISOString().split('T')[0] ?? '']);
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
