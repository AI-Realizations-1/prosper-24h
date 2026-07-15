import { Request, Response } from 'express';
import { AuditLogService } from '../services/AuditLogService';

export class AuditLogController {
  static async getByStudy(req: Request, res: Response): Promise<void> {
    try {
      const logs = await AuditLogService.getByStudy(req.params.studyId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}
