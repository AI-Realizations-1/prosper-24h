import { Request, Response } from 'express';
import { TargetObjectiveService } from '../services/TargetObjectiveService';

export class TargetObjectiveController {
  static async create(req: Request, res: Response) {
    try {
      const result = await TargetObjectiveService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const result = await TargetObjectiveService.getAll(req.params.studyId, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const result = await TargetObjectiveService.update(req.params.id, req.body, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await TargetObjectiveService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
