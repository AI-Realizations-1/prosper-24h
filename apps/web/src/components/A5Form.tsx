import { useState } from 'react';
import { useRisks } from '../hooks/useRisks';
import { useSecurityMeasures } from '../hooks/useSecurityMeasures';
import { useOperationalScenarios } from '../hooks/useOperationalScenarios';

type Tab = 'risks' | 'measures' | 'plan' | 'synthesis';

const TREATMENT_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  REDUCTION: 'Réduction',
  ACCEPTANCE: 'Acceptation',
  TRANSFER: 'Transfert',
  REFUSAL: 'Refus',
};
const TREATMENT_OPTIONS = ['PENDING', 'REDUCTION', 'ACCEPTANCE', 'TRANSFER', 'REFUSAL'];
const PRIORITY_LABELS: Record<number, string> = { 1: 'Haute', 2: 'Moyenne', 3: 'Basse' };
const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planifiée', IN_PROGRESS: 'En cours', IMPLEMENTED: 'Implémentée', VERIFIED: 'Vérifiée',
};
const STATUS_OPTIONS = ['PLANNED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED'];
const TYPE_LABELS: Record<string, string> = {
  PREVENTIVE: 'Préventive', DETECTIVE: 'Détective', CORRECTIVE: 'Corrective',
};
const LEVEL_COLORS: Record<number, string> = {
  1: '#d4edda', 2: '#fff3cd', 3: '#ffd6a5', 4: '#f8d7da',
};

export function A5Form({ studyId }: { studyId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('risks');
  const { risks, create: createRisk, update: updateRisk, remove: removeRisk } = useRisks(studyId);
  const { measures, create: createMeasure, update: updateMeasure, remove: removeMeasure } = useSecurityMeasures(studyId);
  const { scenarios: opScenarios } = useOperationalScenarios(studyId);

  // Formulaire Risque
  const [riskOsId, setRiskOsId] = useState('');
  const [riskLevel, setRiskLevel] = useState(1);
  const [riskDecision, setRiskDecision] = useState('PENDING');
  const [riskResidual, setRiskResidual] = useState('');
  const [riskJustification, setRiskJustification] = useState('');
  const [riskError, setRiskError] = useState('');

  // Formulaire Mesure
  const [mRiskId, setMRiskId] = useState('');
  const [mName, setMName] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mType, setMType] = useState('PREVENTIVE');
  const [mPriority, setMPriority] = useState(2);
  const [mStatus, setMStatus] = useState('PLANNED');
  const [mDueDate, setMDueDate] = useState('');
  const [mError, setMError] = useState('');

  const osWithoutRisk = opScenarios.filter(
    (os) => !risks.some((r) => r.operationalScenarioId === os.id)
  );
  const reductionRisks = risks.filter((r) => r.treatmentDecision === 'REDUCTION');

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setRiskError('');
    if (!riskOsId) { setRiskError('Sélectionnez un scénario opérationnel.'); return; }
    const res = await createRisk({
      operationalScenarioId: riskOsId,
      level: riskLevel,
      treatmentDecision: riskDecision,
      residualLevel: riskResidual ? Number(riskResidual) : undefined,
      justification: riskJustification || undefined,
    });
    if (res.ok) {
      setRiskOsId(''); setRiskLevel(1); setRiskDecision('PENDING');
      setRiskResidual(''); setRiskJustification('');
    } else { setRiskError('Erreur lors de la création du risque.'); }
  };

  const handleCreateMeasure = async (e: React.FormEvent) => {
    e.preventDefault();
    setMError('');
    if (!mRiskId) { setMError('Sélectionnez un risque.'); return; }
    if (!mName.trim()) { setMError('Le nom est obligatoire.'); return; }
    const res = await createMeasure({
      riskId: mRiskId, name: mName,
      description: mDescription || undefined,
      type: mType, priority: mPriority, status: mStatus,
      dueDate: mDueDate ? new Date(mDueDate).toISOString() : undefined,
    });
    if (res.ok) {
      setMRiskId(''); setMName(''); setMDescription('');
      setMType('PREVENTIVE'); setMPriority(2); setMStatus('PLANNED'); setMDueDate('');
    } else { setMError('Erreur lors de la création de la mesure.'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {([['risks', 'Risques'], ['measures', 'Mesures'], ['plan', 'Plan de traitement'], ['synthesis', 'Synthèse']] as [Tab, string][]).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px',
            background: activeTab === tab ? '#007bff' : '#eee',
            color: activeTab === tab ? 'white' : 'black',
            cursor: 'pointer', border: 'none',
          }}>{label}</button>
        ))}
      </div>

      {activeTab === 'risks' && (
        <div>
          <h3>Risques</h3>
          {opScenarios.length === 0 && (
            <p style={{ color: 'orange' }}>⚠️ Aucun scénario opérationnel. Complétez d'abord l'Atelier 4.</p>
          )}
          <form onSubmit={handleCreateRisk} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px', marginBottom: '24px' }}>
            <label>
              Scénario opérationnel :
              <select value={riskOsId} onChange={(e) => {
                setRiskOsId(e.target.value);
                const os = osWithoutRisk.find(o => o.id === e.target.value);
                if (os) setRiskLevel(os.technicalLikelihood);
              }} required style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%' }}>
                <option value="">— Choisir —</option>
                {osWithoutRisk.map((os) => (
                  <option key={os.id} value={os.id}>
                    {os.strategicScenario.pair.riskSource.name} → {os.strategicScenario.fearEvent.description.substring(0, 50)} (vrais. {os.technicalLikelihood}/4)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Niveau de risque (1-4) :
              <select value={riskLevel} onChange={(e) => setRiskLevel(Number(e.target.value))} style={{ marginLeft: '8px', padding: '6px' }}>
                {[1, 2, 3, 4].map((v) => <option key={v} value={v}>{v}/4</option>)}
              </select>
            </label>
            <label>
              Décision de traitement :
              <select value={riskDecision} onChange={(e) => setRiskDecision(e.target.value)} style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%' }}>
                {TREATMENT_OPTIONS.map((d) => <option key={d} value={d}>{TREATMENT_LABELS[d]}</option>)}
              </select>
            </label>
            {riskDecision !== 'PENDING' && (
              <label>
                Niveau résiduel (optionnel) :
                <select value={riskResidual} onChange={(e) => setRiskResidual(e.target.value)} style={{ marginLeft: '8px', padding: '6px' }}>
                  <option value="">—</option>
                  {[1, 2, 3, 4].map((v) => <option key={v} value={v}>{v}/4</option>)}
                </select>
              </label>
            )}
            <label>
              Justification (optionnel) :
              <textarea value={riskJustification} onChange={(e) => setRiskJustification(e.target.value)}
                style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%', height: '60px' }} />
            </label>
            {riskError && <p style={{ color: 'red', margin: 0 }}>{riskError}</p>}
            <button type="submit" style={{ padding: '8px 16px', alignSelf: 'flex-start' }}>+ Créer risque</button>
          </form>

          {risks.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun risque créé.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Scénario source</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Niveau</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Décision</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Résiduel</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}></th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {r.operationalScenario.strategicScenario.pair.riskSource.name} → {r.operationalScenario.strategicScenario.fearEvent.description.substring(0, 50)}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: LEVEL_COLORS[r.level] }}>{r.level}/4</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{TREATMENT_LABELS[r.treatmentDecision]}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: r.residualLevel ? LEVEL_COLORS[r.residualLevel] : 'transparent' }}>
                      {r.residualLevel ? `${r.residualLevel}/4` : '—'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <button onClick={() => removeRisk(r.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'measures' && (
        <div>
          <h3>Mesures de sécurité</h3>
          {reductionRisks.length === 0 ? (
            <p style={{ color: 'orange' }}>⚠️ Aucun risque avec décision "Réduction". Définissez d'abord des risques REDUCTION dans l'onglet Risques.</p>
          ) : (
            <form onSubmit={handleCreateMeasure} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px', marginBottom: '24px' }}>
              <label>
                Risque à traiter :
                <select value={mRiskId} onChange={(e) => setMRiskId(e.target.value)} required style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%' }}>
                  <option value="">— Choisir —</option>
                  {reductionRisks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.operationalScenario.strategicScenario.pair.riskSource.name} (niveau {r.level}/4)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nom de la mesure :
                <input type="text" value={mName} onChange={(e) => setMName(e.target.value)} required
                  style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%' }} />
              </label>
              <label>
                Description (optionnel) :
                <textarea value={mDescription} onChange={(e) => setMDescription(e.target.value)}
                  style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%', height: '60px' }} />
              </label>
              <label>
                Type :
                <select value={mType} onChange={(e) => setMType(e.target.value)} style={{ marginLeft: '8px', padding: '6px' }}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>
                Priorité :
                <select value={mPriority} onChange={(e) => setMPriority(Number(e.target.value))} style={{ marginLeft: '8px', padding: '6px' }}>
                  {[1, 2, 3].map((v) => <option key={v} value={v}>{PRIORITY_LABELS[v]}</option>)}
                </select>
              </label>
              <label>
                Statut :
                <select value={mStatus} onChange={(e) => setMStatus(e.target.value)} style={{ marginLeft: '8px', padding: '6px' }}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </label>
              <label>
                Date d'échéance (optionnel) :
                <input type="date" value={mDueDate} onChange={(e) => setMDueDate(e.target.value)} style={{ marginLeft: '8px', padding: '6px' }} />
              </label>
              {mError && <p style={{ color: 'red', margin: 0 }}>{mError}</p>}
              <button type="submit" style={{ padding: '8px 16px', alignSelf: 'flex-start' }}>+ Créer mesure</button>
            </form>
          )}

          {measures.length === 0 ? (
            <p style={{ color: '#999' }}>Aucune mesure créée.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Nom</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Type</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Priorité</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Statut</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Échéance</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}></th>
                </tr>
              </thead>
              <tbody>
                {measures.map((m) => (
                  <tr key={m.id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>{m.name}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '13px' }}>{TYPE_LABELS[m.type]}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{PRIORITY_LABELS[m.priority]}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <select value={m.status} onChange={(e) => updateMeasure(m.id, { status: e.target.value })} style={{ padding: '4px' }}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '13px' }}>
                      {m.dueDate ? new Date(m.dueDate).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <button onClick={() => removeMeasure(m.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'plan' && (
        <div>
          <h3>Plan de traitement</h3>
          {risks.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun risque à afficher.</p>
          ) : (
            TREATMENT_OPTIONS.filter((d) => risks.some((r) => r.treatmentDecision === d)).map((decision) => (
              <div key={decision} style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 8px', borderBottom: '2px solid #ddd', paddingBottom: '4px' }}>
                  {TREATMENT_LABELS[decision]} ({risks.filter((r) => r.treatmentDecision === decision).length})
                </h4>
                {risks.filter((r) => r.treatmentDecision === decision).map((r) => {
                  const riskMeasures = measures.filter((m) => m.riskId === r.id).sort((a, b) => a.priority - b.priority);
                  return (
                    <div key={r.id} style={{ border: '1px solid #eee', borderRadius: '4px', padding: '12px', marginBottom: '8px', background: LEVEL_COLORS[r.level] }}>
                      <p style={{ margin: '0 0 6px', fontWeight: 'bold', fontSize: '14px' }}>
                        {r.operationalScenario.strategicScenario.pair.riskSource.name} → {r.operationalScenario.strategicScenario.fearEvent.description.substring(0, 60)}
                        <span style={{ marginLeft: '8px', fontWeight: 'normal', fontSize: '12px' }}>
                          Niveau {r.level}/4{r.residualLevel ? ` → résiduel ${r.residualLevel}/4` : ''}
                        </span>
                      </p>
                      {r.justification && <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#555' }}>{r.justification}</p>}
                      {decision === 'REDUCTION' && (
                        riskMeasures.length === 0 ? (
                          <p style={{ color: 'orange', fontSize: '13px', margin: 0 }}>⚠️ Aucune mesure définie pour ce risque.</p>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            {riskMeasures.map((m) => (
                              <li key={m.id} style={{ fontSize: '13px', marginBottom: '4px' }}>
                                <strong>{m.name}</strong> — {TYPE_LABELS[m.type]} — Priorité {PRIORITY_LABELS[m.priority]} — {STATUS_LABELS[m.status]}
                                {m.dueDate && ` — Échéance ${new Date(m.dueDate).toLocaleDateString('fr-FR')}`}
                              </li>
                            ))}
                          </ul>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'synthesis' && (
        <div>
          <h3>Synthèse</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {[
              { label: 'Risques totaux', value: risks.length, color: '#007bff' },
              ...TREATMENT_OPTIONS.map((d) => ({
                label: TREATMENT_LABELS[d],
                value: risks.filter((r) => r.treatmentDecision === d).length,
                color: d === 'REDUCTION' ? '#dc3545' : d === 'ACCEPTANCE' ? '#ffc107' : d === 'TRANSFER' ? '#17a2b8' : d === 'REFUSAL' ? '#6c757d' : '#aaa',
              })),
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '12px 20px', border: `2px solid ${color}`, borderRadius: '6px', textAlign: 'center', minWidth: '100px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>{value}</div>
                <div style={{ fontSize: '12px', color: '#555' }}>{label}</div>
              </div>
            ))}
          </div>
          {measures.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {STATUS_OPTIONS.map((s) => (
                <div key={s} style={{ padding: '8px 16px', background: '#f0f0f0', borderRadius: '4px', fontSize: '13px' }}>
                  <strong>{measures.filter((m) => m.status === s).length}</strong> {STATUS_LABELS[s]}
                </div>
              ))}
            </div>
          )}
          {risks.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun risque à afficher.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Scénario source</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Niveau initial</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Décision</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Niveau résiduel</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {r.operationalScenario.strategicScenario.pair.riskSource.name} → {r.operationalScenario.strategicScenario.fearEvent.description.substring(0, 50)}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: LEVEL_COLORS[r.level] }}>{r.level}/4</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{TREATMENT_LABELS[r.treatmentDecision]}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: r.residualLevel ? LEVEL_COLORS[r.residualLevel] : '#f9f9f9' }}>
                      {r.residualLevel ? `${r.residualLevel}/4` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
