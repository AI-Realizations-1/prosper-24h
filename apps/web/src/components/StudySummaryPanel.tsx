import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStudySummary } from '../hooks/useStudySummary';
import { useCoherence } from '../hooks/useCoherence';
import { useAuditLog } from '../hooks/useAuditLog';

interface Props {
  studyId: string;
}

type Tab = 'summary' | 'coherence' | 'logs' | 'exports';

export function StudySummaryPanel({ studyId }: Props) {
  const [tab, setTab] = useState<Tab>('summary');
  const { accessToken } = useAuth();
  const { summary, loading: sLoading } = useStudySummary(studyId);
  const { result: coherence, loading: cLoading, refresh: refreshCoherence } = useCoherence(studyId);
  const { logs, loading: lLoading } = useAuditLog(studyId);

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '6px 14px',
    cursor: 'pointer',
    fontWeight: tab === t ? 600 : 400,
    background: 'none',
    border: 'none',
    borderBottom: `2px solid ${tab === t ? '#1a56db' : 'transparent'}`,
  });

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 6, marginTop: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', background: '#fafafa', padding: '0 8px' }}>
        <button style={tabStyle('summary')} onClick={() => setTab('summary')}>Synthèse</button>
        <button style={tabStyle('coherence')} onClick={() => setTab('coherence')}>Cohérence</button>
        <button style={tabStyle('logs')} onClick={() => setTab('logs')}>Journal</button>
        <button style={tabStyle('exports')} onClick={() => setTab('exports')}>Exports</button>
      </div>

      <div style={{ padding: 16 }}>
        {/* Synthèse */}
        {tab === 'summary' && (
          sLoading ? <p>Chargement…</p> : summary ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { label: 'Valeurs métier', val: summary.atelier1.businessValues },
                { label: 'Biens supports', val: summary.atelier1.supportingAssets },
                { label: 'Événements redoutés', val: summary.atelier1.fearEvents },
                { label: 'Socle sécurité', val: summary.atelier1.securityBaselines },
                { label: 'Sources de risque', val: summary.atelier2.riskSources },
                { label: 'Objectifs visés', val: summary.atelier2.targetObjectives },
                { label: 'Couples SR/OV', val: summary.atelier2.pairs },
                { label: 'Parties prenantes', val: summary.atelier3.stakeholders },
                { label: 'Scén. stratégiques', val: summary.atelier3.strategicScenarios },
                { label: 'Scén. opérationnels', val: summary.atelier4.operationalScenarios },
                { label: 'Risques', val: summary.atelier5.risks },
                { label: 'En attente', val: summary.atelier5.pendingRisks },
                { label: 'Critiques (≥3)', val: summary.atelier5.criticalRisks },
                { label: 'Mesures sécurité', val: summary.atelier5.securityMeasures },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: '#f4f6fa', borderRadius: 6, padding: '10px 14px' }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{val}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
                </div>
              ))}
            </div>
          ) : <p>Aucune donnée</p>
        )}

        {/* Cohérence */}
        {tab === 'coherence' && (
          cLoading ? <p>Vérification…</p> : coherence ? (
            <div>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 12,
                  background: coherence.coherent ? '#d1fae5' : '#fee2e2',
                  color: coherence.coherent ? '#065f46' : '#991b1b',
                  fontWeight: 600,
                }}>
                  {coherence.coherent ? 'Cohérent' : `${coherence.warnings.length} avertissement(s)`}
                </span>
                <button onClick={refreshCoherence} style={{ fontSize: 12, cursor: 'pointer', padding: '4px 10px' }}>
                  Actualiser
                </button>
              </div>
              {coherence.warnings.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {coherence.warnings.map((w, i) => (
                    <li key={i} style={{ marginBottom: 4, color: '#b45309' }}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : <p>Impossible de charger les résultats</p>
        )}

        {/* Journal */}
        {tab === 'logs' && (
          lLoading ? <p>Chargement…</p> : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {logs.length === 0 ? <p style={{ color: '#888' }}>Aucune entrée dans le journal</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f0f4ff' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Utilisateur</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Action</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Cible</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                          {new Date(log.createdAt).toLocaleString('fr-FR')}
                        </td>
                        <td style={{ padding: '5px 8px' }}>{log.user.email}</td>
                        <td style={{ padding: '5px 8px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{log.action}</span>
                        </td>
                        <td style={{ padding: '5px 8px' }}>{log.target}</td>
                        <td style={{ padding: '5px 8px', color: '#555' }}>{log.details ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        )}

        {/* Exports */}
        {tab === 'exports' && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              style={{
                padding: '10px 20px', background: '#ef4444', color: 'white',
                borderRadius: 6, border: 'none', fontWeight: 600, cursor: 'pointer',
              }}
              onClick={async () => {
                const res = await fetch(`/api/studies/${studyId}/export/pdf`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `etude-${studyId}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              Télécharger PDF
            </button>
            <button
              style={{
                padding: '10px 20px', background: '#16a34a', color: 'white',
                borderRadius: 6, border: 'none', fontWeight: 600, cursor: 'pointer',
              }}
              onClick={async () => {
                const res = await fetch(`/api/studies/${studyId}/export/excel`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `etude-${studyId}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              Télécharger Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
