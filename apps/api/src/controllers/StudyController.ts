import { Request, Response } from 'express';
import { StudyService } from '../services/StudyService';

export class StudyController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const study = await StudyService.createStudy(req.body, req.userId!);
      res.status(201).json(study);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const studies = await StudyService.listStudies(req.userId!);
      res.json(studies);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async get(req: Request, res: Response): Promise<void> {
    try {
      const study = await StudyService.getStudy(req.params.id, req.userId!);
      res.json(study);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const study = await StudyService.updateStudy(req.params.id, req.body, req.userId!);
      res.json(study);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async archive(req: Request, res: Response): Promise<void> {
    try {
      const study = await StudyService.archiveStudy(req.params.id, req.userId!);
      res.json(study);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async duplicate(req: Request, res: Response): Promise<void> {
    try {
      const study = await StudyService.duplicateStudy(req.params.id, req.userId!);
      res.status(201).json(study);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async getMembers(req: Request, res: Response): Promise<void> {
    try {
      const members = await StudyService.getMembers(req.params.id, req.userId!);
      res.json(members);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async addMember(req: Request, res: Response): Promise<void> {
    try {
      const { email, role } = req.body;
      const member = await StudyService.addMember(req.params.id, req.userId!, email, role ?? 'VIEWER');
      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async removeMember(req: Request, res: Response): Promise<void> {
    try {
      await StudyService.removeMember(req.params.id, req.userId!, req.params.memberId);
      res.status(204).end();
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await StudyService.getSummary(req.params.id, req.userId!);
      res.json(summary);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async checkCoherence(req: Request, res: Response): Promise<void> {
    try {
      const result = await StudyService.checkCoherence(req.params.id, req.userId!);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async importStudy(req: Request, res: Response): Promise<void> {
    try {
      const study = await StudyService.importStudy(req.body, req.userId!);
      res.status(201).json(study);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}
