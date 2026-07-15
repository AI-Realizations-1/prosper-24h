import { useState } from 'react';
import { useOperationalScenarios } from '../hooks/useOperationalScenarios';
import { useStrategicScenarios } from '../hooks/useStrategicScenarios';
import { useSupportingAssets } from '../hooks/useSupportingAssets';

type Tab = 'scenarios' | 'synthesis';

const LEVEL_LABELS: Record<number, string> = {
  1: '1 — Minimal',
  2: '2 — Significatif',
  3: '3 — Fort',
  4: '4 — Maximal',
};

const LEVEL_COLORS: Record<number, string> = {
  1: '#d4edda',
  2: '#fff3cd',
  3: '#ffd6a5',
  4: '#f8d7da',
};

export function A4Form({ studyId }: { studyId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('scenarios');

  const { scenarios: opScenarios, create: createOS, remove: removeOS } = useOperationalScenarios(studyId);
  const { scenarios: stratScenarios } = useStrategicScenarios(studyId);
  const { supportingAssets } = useSupportingAssets(studyId);

  // Formulaire création
  const [selectedStratId, setSelectedStratId] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [techLikelihood, setTechLikelihood] = useState(1);
  const [description, setDescription] = useState('');
  const [creationError, setCreationError] = useState('');

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError('');
    if (!selectedStratId) {
      setCreationError('Sélectionnez un scénario stratégique source.');
      return;
    }
    const res = await createOS({
      strategicScenarioId: selectedStratId,
      description: description || undefined,
      technicalLikelihood: techLikelihood,
      supportingAssetIds: selectedAssetIds,
    });
    if (res.ok) {
      setSelectedStratId('');
      setSelectedAssetIds([]);
      setTechLikelihood(1);
      setDescription('');
    } else {
      setCreationError('Erreur lors de la création du scénario opérationnel.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {(['scenarios', 'synthesis'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab ? '#007bff' : '#eee',
              color: activeTab === tab ? 'white' : 'black',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            {tab === 'scenarios' ? 'Scénarios opérationnels' : 'Synthèse'}
          </button>
        ))}
      </div>

      {activeTab === 'scenarios' && (
        <div>
          <h3>Scénarios opérationnels</h3>

          {stratScenarios.length === 0 && (
            <p style={{ color: 'orange' }}>
              ⚠️ Aucun scénario stratégique disponible. Complétez d'abord l'Atelier 3.
            </p>
          )}

          <form onSubmit={handleCreate} style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px' }}>
            <label>
              Scénario stratégique source :
              <select
                value={selectedStratId}
                onChange={(e) => setSelectedStratId(e.target.value)}
                required
                style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%' }}
              >
                <option value="">— Choisir —</option>
                {stratScenarios.map((ss) => (
                  <option key={ss.id} value={ss.id}>
                    {ss.pair.riskSource.name} → {ss.pair.targetObjective.description.substring(0, 50)} (vrais. {ss.likelihood}/4)
                  </option>
                ))}
              </select>
            </label>

            <label>
              Vraisemblance technique :
              <select
                value={techLikelihood}
                onChange={(e) => setTechLikelihood(Number(e.target.value))}
                style={{ marginLeft: '8px', padding: '6px' }}
              >
                {[1, 2, 3, 4].map((v) => (
                  <option key={v} value={v}>{LEVEL_LABELS[v]}</option>
                ))}
              </select>
            </label>

            <div>
              <p style={{ margin: '0 0 6px', fontWeight: 'bold' }}>Biens supports impliqués :</p>
              {supportingAssets.length === 0 ? (
                <p style={{ color: '#999', fontSize: '13px' }}>Aucun bien support disponible (définissez-les dans l'Atelier 1).</p>
              ) : (
                (supportingAssets as Array<{ id: string; name: string; type: string }>).map((sa) => (
                  <label key={sa.id} style={{ display: 'block', marginBottom: '4px' }}>
                    <input
                      type="checkbox"
                      checked={selectedAssetIds.includes(sa.id)}
                      onChange={() => toggleAsset(sa.id)}
                      style={{ marginRight: '6px' }}
                    />
                    {sa.name} <span style={{ color: '#888', fontSize: '12px' }}>({sa.type})</span>
                  </label>
                ))
              )}
            </div>

            <label>
              Description du chemin d'attaque (optionnel) :
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: exploitation de la vulnérabilité CVE-XXXX sur le composant Y..."
                style={{ display: 'block', marginTop: '4px', padding: '6px', width: '100%', height: '80px' }}
              />
            </label>

            {creationError && <p style={{ color: 'red', margin: 0 }}>{creationError}</p>}

            <button type="submit" style={{ padding: '8px 16px', alignSelf: 'flex-start' }}>
              + Créer scénario opérationnel
            </button>
          </form>

          {opScenarios.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun scénario opérationnel créé.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Scénario stratégique source</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Biens supports</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Vrais. tech.</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd' }}></th>
                </tr>
              </thead>
              <tbody>
                {opScenarios.map((os) => (
                  <tr key={os.id}>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {os.strategicScenario.pair.riskSource.name} → {os.strategicScenario.pair.targetObjective.description.substring(0, 40)}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                      {os.supportingAssets.map((a) => a.supportingAsset.name).join(', ') || '—'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: LEVEL_COLORS[os.technicalLikelihood] }}>
                      {os.technicalLikelihood}/4
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px', maxWidth: '200px' }}>
                      {os.description?.substring(0, 80) || '—'}
                    </td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                      <button
                        onClick={() => removeOS(os.id)}
                        style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'synthesis' && (
        <div>
          <h3>Synthèse — Matrice vraisemblance</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            Croisement vraisemblance stratégique (scénario source) × vraisemblance technique (scénario opérationnel).
          </p>

          {opScenarios.length === 0 ? (
            <p style={{ color: '#999' }}>Aucun scénario opérationnel à afficher.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Scénario opérationnel</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Vrais. strat.</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Vrais. tech.</th>
                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>Niveau global</th>
                </tr>
              </thead>
              <tbody>
                {opScenarios.map((os) => {
                  const stratLikelihood = os.strategicScenario.likelihood;
                  const globalLevel = Math.max(stratLikelihood, os.technicalLikelihood);
                  return (
                    <tr key={os.id}>
                      <td style={{ padding: '8px', border: '1px solid #ddd', fontSize: '13px' }}>
                        {os.strategicScenario.pair.riskSource.name} → {os.strategicScenario.fearEvent.description.substring(0, 50)}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: LEVEL_COLORS[stratLikelihood] }}>
                        {stratLikelihood}/4
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', background: LEVEL_COLORS[os.technicalLikelihood] }}>
                        {os.technicalLikelihood}/4
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', background: LEVEL_COLORS[globalLevel] }}>
                        {globalLevel}/4
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
