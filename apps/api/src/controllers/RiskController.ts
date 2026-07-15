import { Request, Response } from 'express';
import { RiskService } from '../services/RiskService';

export class RiskController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await RiskService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const result = await RiskService.getAll(req.params.studyId, req.userId!);
      res.json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const result = await RiskService.update(req.params.id, req.body, req.userId!);
      res.json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await RiskService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }
}
