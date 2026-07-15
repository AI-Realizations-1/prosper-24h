import { Request, Response } from 'express';
import { ExportService } from '../services/ExportService';
import { AuditLogService } from '../services/AuditLogService';

export class ExportController {
  static async exportPdf(req: Request, res: Response): Promise<void> {
    try {
      const buf = await ExportService.exportPdf(req.params.studyId);
      await AuditLogService.log({
        studyId: req.params.studyId,
        userId: req.userId!,
        action: 'EXPORT',
        target: 'Study',
        targetId: req.params.studyId,
        details: 'Export PDF',
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="prosper-${req.params.studyId}.pdf"`);
      res.send(buf);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async exportExcel(req: Request, res: Response): Promise<void> {
    try {
      const buf = await ExportService.exportExcel(req.params.studyId);
      await AuditLogService.log({
        studyId: req.params.studyId,
        userId: req.userId!,
        action: 'EXPORT',
        target: 'Study',
        targetId: req.params.studyId,
        details: 'Export Excel',
      });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="prosper-${req.params.studyId}.xlsx"`);
      res.send(buf);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}
