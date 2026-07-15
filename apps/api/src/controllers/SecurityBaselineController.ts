import { Request, Response } from 'express';
import { SecurityBaselineService } from '../services/SecurityBaselineService';

export class SecurityBaselineController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const sb = await SecurityBaselineService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(sb);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const sbs = await SecurityBaselineService.getAll(req.params.studyId, req.userId!);
      res.json(sbs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const sb = await SecurityBaselineService.update(req.params.id, req.body, req.userId!);
      res.json(sb);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await SecurityBaselineService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}
