import { Request, Response } from 'express';
import { StrategicScenarioService } from '../services/StrategicScenarioService';

export class StrategicScenarioController {
  static async create(req: Request, res: Response) {
    try {
      const result = await StrategicScenarioService.create(req.params.studyId, req.body, req.userId!);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const result = await StrategicScenarioService.getAll(req.params.studyId, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  }

  static async updateLikelihood(req: Request, res: Response) {
    try {
      const result = await StrategicScenarioService.updateLikelihood(req.params.id, req.body, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async addStakeholder(req: Request, res: Response) {
    try {
      const result = await StrategicScenarioService.addStakeholder(req.params.id, req.body.stakeholderId, req.userId!);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async removeStakeholder(req: Request, res: Response) {
    try {
      const result = await StrategicScenarioService.removeStakeholder(req.params.id, req.params.stakeholderId, req.userId!);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await StrategicScenarioService.delete(req.params.id, req.userId!);
      res.status(204).send();
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
