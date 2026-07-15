import { Request, Response } from 'express';
import { FearEventService } from '../services/FearEventService';

export class FearEventController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const fe = await FearEventService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(fe);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const fes = await FearEventService.getAll(req.params.studyId, req.userId!);
      res.json(fes);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const fe = await FearEventService.update(req.params.id, req.body, req.userId!);
      res.json(fe);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await FearEventService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}
