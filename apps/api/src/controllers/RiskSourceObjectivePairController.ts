import { Request, Response } from 'express';
import { RiskSourceObjectivePairService } from '../services/RiskSourceObjectivePairService';

export class RiskSourceObjectivePairController {
  static async create(req: Request, res: Response) {
    try {
      const result = await RiskSourceObjectivePairService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const result = await RiskSourceObjectivePairService.getAll(req.params.studyId, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }

  static async getRetained(req: Request, res: Response) {
    try {
      const result = await RiskSourceObjectivePairService.getRetained(req.params.studyId, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }

  static async updateRelevance(req: Request, res: Response) {
    try {
      const result = await RiskSourceObjectivePairService.updateRelevance(req.params.id, req.body, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await RiskSourceObjectivePairService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
