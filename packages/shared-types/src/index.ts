// Étude EBIOS RM
export interface Study {
  id: string;
  name: string;
  description: string;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
}

// Atelier 1
export interface BusinessValue { id: string; studyId: string; name: string; description: string; }
export interface SupportingAsset { id: string; studyId: string; name: string; type: string; businessValueIds: string[]; }
export interface FearEvent { id: string; studyId: string; businessValueId: string; description: string; gravity: 1|2|3|4; }
export interface SecurityBaseline { id: string; studyId: string; referential: string; compliance: 'compliant'|'partial'|'non_compliant'; gap?: string; }

// Atelier 2
export interface RiskSource { id: string; studyId: string; name: string; category: string; }
export interface TargetObjective { id: string; studyId: string; description: string; }
export interface RiskSourceObjectivePair { id: string; studyId: string; riskSourceId: string; targetObjectiveId: string; relevance: 'retained'|'excluded'; justification?: string; }

// Atelier 3
export interface Stakeholder { id: string; studyId: string; name: string; category: string; dependencyLevel: 1|2|3|4; threatLevel: 1|2|3|4; }
export interface StrategicScenario { id: string; studyId: string; pairId: string; fearEventId: string; likelihood: 1|2|3|4; stakeholderIds: string[]; }

// Atelier 4
export interface OperationalScenario { id: string; studyId: string; strategicScenarioId: string; modeOperatoire: string; supportingAssetIds: string[]; technicalLikelihood: 1|2|3|4; }

// Atelier 5
export interface Risk { id: string; studyId: string; operationalScenarioId: string; gravity: 1|2|3|4; likelihood: 1|2|3|4; level: 1|2|3|4; treatment: 'reduce'|'transfer'|'avoid'|'accept'; residualLevel?: 1|2|3|4; }
export interface SecurityMeasure { id: string; studyId: string; riskId: string; description: string; owner: string; dueDate?: Date; status: 'planned'|'in_progress'|'done'; }

// Gestion transverse
export type UserRole = 'pilot' | 'contributor' | 'validator' | 'reader';
export interface StudyUser { studyId: string; userId: string; role: UserRole; }
export interface AuditLogEntry { id: string; studyId: string; userId: string; action: string; target: string; timestamp: Date; }
