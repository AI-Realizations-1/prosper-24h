import { Router } from 'express';
import { StudyController } from '../controllers/StudyController';
import { ExportController } from '../controllers/ExportController';
import { AuditLogController } from '../controllers/AuditLogController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// CRUD de base
router.post('/', authMiddleware, StudyController.create);
router.get('/', authMiddleware, StudyController.list);
router.get('/:id', authMiddleware, StudyController.get);
router.patch('/:id', authMiddleware, StudyController.update);
router.delete('/:id', authMiddleware, StudyController.archive);

// FT-01 : Duplication
router.post('/:id/duplicate', authMiddleware, StudyController.duplicate);

// FT-02 : Gestion des membres
router.get('/:id/members', authMiddleware, StudyController.getMembers);
router.post('/:id/members', authMiddleware, StudyController.addMember);
router.delete('/:id/members/:memberId', authMiddleware, StudyController.removeMember);

// FT-03 : Synthèse
router.get('/:id/summary', authMiddleware, StudyController.getSummary);

// FT-04 : Cohérence
router.get('/:id/coherence', authMiddleware, StudyController.checkCoherence);

// FT-05 : Import JSON
router.post('/import', authMiddleware, StudyController.importStudy);

// FT-06/07 : Export PDF / Excel
router.get('/:studyId/export/pdf', authMiddleware, ExportController.exportPdf);
router.get('/:studyId/export/excel', authMiddleware, ExportController.exportExcel);

// FT (journal)
router.get('/:studyId/audit-log', authMiddleware, AuditLogController.getByStudy);

export default router;
