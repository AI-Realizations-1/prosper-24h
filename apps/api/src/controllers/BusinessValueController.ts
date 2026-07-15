import { Request, Response } from 'express';
import { BusinessValueService } from '../services/BusinessValueService';

export class BusinessValueController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const bv = await BusinessValueService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(bv);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const bvs = await BusinessValueService.getAll(req.params.studyId, req.userId!);
      res.json(bvs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const bv = await BusinessValueService.update(req.params.id, req.body, req.userId!);
      res.json(bv);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await BusinessValueService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}
