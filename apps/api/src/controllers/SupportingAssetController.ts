import { Request, Response } from 'express';
import { SupportingAssetService } from '../services/SupportingAssetService';

export class SupportingAssetController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const sa = await SupportingAssetService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(sa);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const sas = await SupportingAssetService.getAll(req.params.studyId, req.userId!);
      res.json(sas);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const sa = await SupportingAssetService.update(req.params.id, req.body, req.userId!);
      res.json(sa);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await SupportingAssetService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}
