import { useEffect, useState } from 'react';
import { useStakeholders } from '../hooks/useStakeholders';
import { useStrategicScenarios } from '../hooks/useStrategicScenarios';
import { useRiskSourceObjectivePairs } from '../hooks/useRiskSourceObjectivePairs';
import { useFearEvents } from '../hooks/useFearEvents';

interface Props {
  studyId: string;
}

type Tab = 'stakeholders' | 'scenarios' | 'synthesis';

export default function A3Form({ studyId }: Props) {
  const [tab, setTab] = useState<Tab>('stakeholders');

  const { stakeholders, loading: shLoading, error: shError, fetchAll: fetchSH, create: createSH, remove: removeSH } = useStakeholders(studyId);
  const { scenarios, loading: ssLoading, error: ssError, fetchAll: fetchSS, create: createSS, updateLikelihood, remove: removeSS } = useStrategicScenarios(studyId);
  const { pairs: retainedPairs, loading: pairsLoading, fetchAll: fetchPairs } = useRiskSourceObjectivePairs(studyId);
  const { fearEvents, loading: feLoading, fetchAll: fetchFE } = useFearEvents(studyId);

  useEffect(() => {
    fetchSH();
    fetchSS();
    fetchPairs();
    fetchFE();
  }, [fetchSH, fetchSS, fetchPairs, fetchFE]);

  const [shName, setShName] = useState('');
  const [shCategory, setShCategory] = useState('');
  const [shDependency, setShDependency] = useState(1);
  const [shThreat, setShThreat] = useState(1);
  const [creationError, setCreationError] = useState<string | null>(null);

  const handleCreateSH = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shName.trim() || !shCategory.trim()) return;
    await createSH({ name: shName.trim(), category: shCategory.trim(), dependencyLevel: shDependency, threatLevel: shThreat });
    setShName('');
    setShCategory('');
    setShDependency(1);
    setShThreat(1);
  };

  const handleCreateSS = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError(null);
    const pairId = (document.getElementById('ss-pair') as HTMLSelectElement)?.value;
    const feId = (document.getElementById('ss-fe') as HTMLSelectElement)?.value;
    const likelihood = parseInt((document.getElementById('ss-likelihood') as HTMLSelectElement)?.value || '1');
    if (!pairId || !feId) {
      setCreationError('Sélectionnez un couple SR/OV et un événement redouté.');
      return;
    }
    try {
      await createSS({ pairId, fearEventId: feId, likelihood });
    } catch (err: any) {
      setCreationError(err.message);
    }
  };

  const likelihoodColor = (likelihood: number) => {
    if (likelihood === 1) return 'bg-green-100 text-green-800';
    if (likelihood === 2) return 'bg-yellow-100 text-yellow-800';
    if (likelihood === 3) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const retained = retainedPairs.filter((p) => p.relevance === 'RETAINED');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Atelier 3 — Scénarios stratégiques</h2>

      <div className="flex gap-2 border-b pb-2">
        {(['stakeholders', 'scenarios', 'synthesis'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-t text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {t === 'stakeholders' ? 'Parties prenantes' : t === 'scenarios' ? 'Scénarios' : 'Synthèse'}
          </button>
        ))}
      </div>

      {/* TAB: Parties prenantes */}
      {tab === 'stakeholders' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateSH} className="flex flex-col gap-2 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold">Nouvelle partie prenante</h3>
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Nom *"
              value={shName}
              onChange={(e) => setShName(e.target.value)}
              required
            />
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Catégorie *"
              value={shCategory}
              onChange={(e) => setShCategory(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">Niveau dépendance</label>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={shDependency}
                  onChange={(e) => setShDependency(parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Niveau menace</label>
                <select
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={shThreat}
                  onChange={(e) => setShThreat(parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm self-start">
              Ajouter
            </button>
          </form>
          {shLoading && <p className="text-sm text-gray-500">Chargement...</p>}
          {shError && <p className="text-sm text-red-600">{shError}</p>}
          <ul className="space-y-2">
            {stakeholders.map((sh) => (
              <li key={sh.id} className="flex items-center justify-between border rounded px-3 py-2 bg-white">
                <div>
                  <span className="font-medium">{sh.name}</span>
                  <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1 rounded">{sh.category}</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Dépendance: {sh.dependencyLevel} | Menace: {sh.threatLevel}
                  </p>
                </div>
                <button onClick={() => removeSH(sh.id)} className="text-red-500 hover:text-red-700 text-sm ml-4">
                  Supprimer
                </button>
              </li>
            ))}
            {stakeholders.length === 0 && !shLoading && <li className="text-sm text-gray-400">Aucune partie prenante.</li>}
          </ul>
        </div>
      )}

      {/* TAB: Scénarios stratégiques */}
      {tab === 'scenarios' && (
        <div className="space-y-4">
          <form onSubmit={handleCreateSS} className="flex flex-col gap-2 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold">Nouveau scénario stratégique</h3>
            <select id="ss-pair" className="border rounded px-2 py-1 text-sm">
              <option value="">-- Couple SR/OV retenu --</option>
              {retained.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.riskSource.name} → {p.targetObjective.description}
                </option>
              ))}
            </select>
            <select id="ss-fe" className="border rounded px-2 py-1 text-sm">
              <option value="">-- Événement redouté --</option>
              {fearEvents.map((fe) => (
                <option key={fe.id} value={fe.id}>
                  {fe.description}
                </option>
              ))}
            </select>
            <select id="ss-likelihood" className="border rounded px-2 py-1 text-sm">
              <option value="1">Vraisemblance 1 (Faible)</option>
              <option value="2">Vraisemblance 2 (Modérée)</option>
              <option value="3">Vraisemblance 3 (Élevée)</option>
              <option value="4">Vraisemblance 4 (Très élevée)</option>
            </select>
            {creationError && <p className="text-sm text-red-600">{creationError}</p>}
            <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm self-start">
              Créer le scénario
            </button>
          </form>
          {ssLoading && <p className="text-sm text-gray-500">Chargement...</p>}
          {ssError && <p className="text-sm text-red-600">{ssError}</p>}
          <ul className="space-y-2">
            {scenarios.map((ss) => (
              <li key={ss.id} className="border rounded px-3 py-2 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{ss.pair.riskSource.name} → {ss.pair.targetObjective.description}</p>
                    <p className="text-xs text-gray-600">{ss.fearEvent.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {[1, 2, 3, 4].map((l) => (
                        <button
                          key={l}
                          onClick={() => updateLikelihood(ss.id, l)}
                          className={`text-xs px-2 py-0.5 rounded ${
                            ss.likelihood === l ? likelihoodColor(l) + ' font-bold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          V{l}
                        </button>
                      ))}
                    </div>
                    {ss.stakeholders.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">Parties prenantes: {ss.stakeholders.map((s) => s.stakeholder.name).join(', ')}</p>
                    )}
                  </div>
                  <button onClick={() => removeSS(ss.id)} className="text-red-500 hover:text-red-700 text-sm ml-4">
                    ✕
                  </button>
                </div>
              </li>
            ))}
            {scenarios.length === 0 && !ssLoading && <li className="text-sm text-gray-400">Aucun scénario stratégique.</li>}
          </ul>
        </div>
      )}

      {/* TAB: Synthèse */}
      {tab === 'synthesis' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 border rounded bg-blue-50">
              <div className="text-2xl font-bold text-blue-700">{stakeholders.length}</div>
              <div className="text-xs text-blue-600">Parties prenantes</div>
            </div>
            <div className="p-3 border rounded bg-purple-50">
              <div className="text-2xl font-bold text-purple-700">{scenarios.length}</div>
              <div className="text-xs text-purple-600">Scénarios stratégiques</div>
            </div>
          </div>
          {scenarios.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-left">Scénario</th>
                  <th className="border px-2 py-1 text-center">Vraisemblance</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((ss) => (
                  <tr key={ss.id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1 text-xs">
                      {ss.pair.riskSource.name} → {ss.pair.targetObjective.description}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${likelihoodColor(ss.likelihood)}`}>V{ss.likelihood}</span>
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
