import { useEffect, useState } from 'react';
import { useRiskSources } from '../hooks/useRiskSources';
import { useTargetObjectives } from '../hooks/useTargetObjectives';
import { useRiskSourceObjectivePairs, type PairRelevance } from '../hooks/useRiskSourceObjectivePairs';

interface Props {
  studyId: string;
}

type Tab = 'sources' | 'objectives' | 'pairs';

export default function A2Form({ studyId }: Props) {
  const [tab, setTab] = useState<Tab>('sources');

  const { riskSources, loading: rsLoading, error: rsError, fetchAll: fetchRS, create: createRS, remove: removeRS } = useRiskSources(studyId);
  const { targetObjectives, loading: toLoading, error: toError, fetchAll: fetchTO, create: createTO, remove: removeTO } = useTargetObjectives(studyId);
  const { pairs, loading: pLoading, error: pError, fetchAll: fetchPairs, create: createPair, updateRelevance, remove: removePair } = useRiskSourceObjectivePairs(studyId);

  useEffect(() => { fetchRS(); fetchTO(); fetchPairs(); }, [fetchRS, fetchTO, fetchPairs]);

  const [rsName, setRsName] = useState('');
  const [rsCategory, setRsCategory] = useState('');
  const [rsDesc, setRsDesc] = useState('');
  const [toDesc, setToDesc] = useState('');
  const [pairError, setPairError] = useState<string | null>(null);

  const handleCreateRS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsName.trim() || !rsCategory.trim()) return;
    await createRS({ name: rsName.trim(), category: rsCategory.trim(), description: rsDesc.trim() || undefined });
    setRsName(''); setRsCategory(''); setRsDesc('');
  };

  const handleCreateTO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toDesc.trim()) return;
    await createTO({ description: toDesc.trim() });
    setToDesc('');
  };

  const handleCreatePair = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairError(null);
    const rsId = (document.getElementById('pair-rs') as HTMLSelectElement)?.value;
    const toId = (document.getElementById('pair-to') as HTMLSelectElement)?.value;
    if (!rsId || !toId) { setPairError('Sélectionnez une source et un objectif.'); return; }
    try {
      await createPair({ riskSourceId: rsId, targetObjectiveId: toId });
    } catch (err: any) {
      setPairError(err.message);
    }
  };

  const relevanceLabel: Record<PairRelevance, string> = {
    PENDING: 'En attente',
    RETAINED: 'Retenu',
    EXCLUDED: 'Exclu',
  };

  const relevanceClass: Record<PairRelevance, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    RETAINED: 'bg-green-100 text-green-800',
    EXCLUDED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Atelier 2 — Sources de risque &amp; Objectifs visés</h2>

      <div className="flex gap-2 border-b pb-2">
        {(['sources', 'objectives', 'pairs'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-t text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {t === 'sources' ? 'Sources de risque' : t === 'objectives' ? 'Objectifs visés' : 'Couples SR/OV'}
          </button>
        ))}
      </div>

      {/* ======= TAB: Sources de risque ======= */}
      {tab === 'sources' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateRS} className="flex flex-col gap-2 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold">Nouvelle source de risque</h3>
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Nom *"
              value={rsName}
              onChange={(e) => setRsName(e.target.value)}
              required
            />
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Catégorie *"
              value={rsCategory}
              onChange={(e) => setRsCategory(e.target.value)}
              required
            />
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Description (optionnel)"
              value={rsDesc}
              onChange={(e) => setRsDesc(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm self-start">Ajouter</button>
          </form>
          {rsLoading && <p className="text-sm text-gray-500">Chargement...</p>}
          {rsError && <p className="text-sm text-red-600">{rsError}</p>}
          <ul className="space-y-2">
            {riskSources.map((rs) => (
              <li key={rs.id} className="flex items-center justify-between border rounded px-3 py-2 bg-white">
                <div>
                  <span className="font-medium">{rs.name}</span>
                  <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1 rounded">{rs.category}</span>
                  {rs.description && <p className="text-xs text-gray-500 mt-0.5">{rs.description}</p>}
                </div>
                <button onClick={() => removeRS(rs.id)} className="text-red-500 hover:text-red-700 text-sm ml-4">Supprimer</button>
              </li>
            ))}
            {riskSources.length === 0 && !rsLoading && <li className="text-sm text-gray-400">Aucune source de risque.</li>}
          </ul>
        </div>
      )}

      {/* ======= TAB: Objectifs visés ======= */}
      {tab === 'objectives' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateTO} className="flex flex-col gap-2 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold">Nouvel objectif visé</h3>
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Description *"
              value={toDesc}
              onChange={(e) => setToDesc(e.target.value)}
              required
            />
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm self-start">Ajouter</button>
          </form>
          {toLoading && <p className="text-sm text-gray-500">Chargement...</p>}
          {toError && <p className="text-sm text-red-600">{toError}</p>}
          <ul className="space-y-2">
            {targetObjectives.map((to) => (
              <li key={to.id} className="flex items-center justify-between border rounded px-3 py-2 bg-white">
                <span className="text-sm">{to.description}</span>
                <button onClick={() => removeTO(to.id)} className="text-red-500 hover:text-red-700 text-sm ml-4">Supprimer</button>
              </li>
            ))}
            {targetObjectives.length === 0 && !toLoading && <li className="text-sm text-gray-400">Aucun objectif visé.</li>}
          </ul>
        </div>
      )}

      {/* ======= TAB: Couples SR/OV ======= */}
      {tab === 'pairs' && (
        <div className="space-y-4">
          <form onSubmit={handleCreatePair} className="flex flex-col gap-2 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold">Nouveau couple SR/OV</h3>
            <select id="pair-rs" className="border rounded px-2 py-1 text-sm">
              <option value="">-- Source de risque --</option>
              {riskSources.map((rs) => (
                <option key={rs.id} value={rs.id}>{rs.name} ({rs.category})</option>
              ))}
            </select>
            <select id="pair-to" className="border rounded px-2 py-1 text-sm">
              <option value="">-- Objectif visé --</option>
              {targetObjectives.map((to) => (
                <option key={to.id} value={to.id}>{to.description}</option>
              ))}
            </select>
            {pairError && <p className="text-sm text-red-600">{pairError}</p>}
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm self-start">Créer le couple</button>
          </form>
          {pLoading && <p className="text-sm text-gray-500">Chargement...</p>}
          {pError && <p className="text-sm text-red-600">{pError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border px-2 py-1">Source de risque</th>
                  <th className="border px-2 py-1">Objectif visé</th>
                  <th className="border px-2 py-1">Pertinence</th>
                  <th className="border px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{p.riskSource.name} <span className="text-xs text-gray-400">({p.riskSource.category})</span></td>
                    <td className="border px-2 py-1">{p.targetObjective.description}</td>
                    <td className="border px-2 py-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${relevanceClass[p.relevance]}`}>
                        {relevanceLabel[p.relevance]}
                      </span>
                    </td>
                    <td className="border px-2 py-1 space-x-1">
                      <button onClick={() => updateRelevance(p.id, 'RETAINED')} className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-1 rounded">Retenir</button>
                      <button onClick={() => updateRelevance(p.id, 'EXCLUDED')} className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-1 rounded">Exclure</button>
                      <button onClick={() => updateRelevance(p.id, 'PENDING')} className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-1 rounded">Pend.</button>
                      <button onClick={() => removePair(p.id)} className="text-xs text-red-500 hover:text-red-700 ml-2">✕</button>
                    </td>
                  </tr>
                ))}
                {pairs.length === 0 && !pLoading && (
                  <tr><td colSpan={4} className="border px-2 py-2 text-center text-gray-400">Aucun couple défini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
