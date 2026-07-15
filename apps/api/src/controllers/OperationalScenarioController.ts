import { Request, Response } from 'express';
import { OperationalScenarioService } from '../services/OperationalScenarioService';

export class OperationalScenarioController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const result = await OperationalScenarioService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const result = await OperationalScenarioService.getAll(req.params.studyId, req.userId!);
      res.json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const result = await OperationalScenarioService.update(req.params.id, req.body, req.userId!);
      res.json(result);
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      await OperationalScenarioService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  }
}
