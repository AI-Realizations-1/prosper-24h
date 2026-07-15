import { Request, Response } from 'express';
import { StakeholderService } from '../services/StakeholderService';

export class StakeholderController {
  static async create(req: Request, res: Response) {
    try {
      const result = await StakeholderService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const result = await StakeholderService.getAll(req.params.studyId, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const result = await StakeholderService.update(req.params.id, req.body, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await StakeholderService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
