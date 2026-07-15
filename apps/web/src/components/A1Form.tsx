import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface BusinessValue {
  id: string;
  name: string;
  description?: string;
}

interface SupportingAsset {
  id: string;
  name: string;
  type: string;
}

interface FearEvent {
  id: string;
  description: string;
  gravity: number;
  businessValueId: string;
}

interface SecurityBaseline {
  id: string;
  referential: string;
  compliance: string;
  gap?: string;
}

type Tab = 'business-values' | 'supporting-assets' | 'fear-events' | 'security-baselines';

const tabLabels: Record<Tab, string> = {
  'business-values': 'Valeurs métier',
  'supporting-assets': 'Biens supports',
  'fear-events': 'Événements redoutés',
  'security-baselines': 'Socle de sécurité',
};

export function A1Form({ studyId }: { studyId: string }) {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('business-values');
  const [businessValues, setBusinessValues] = useState<BusinessValue[]>([]);
  const [supportingAssets, setSupportingAssets] = useState<SupportingAsset[]>([]);
  const [fearEvents, setFearEvents] = useState<FearEvent[]>([]);
  const [securityBaselines, setSecurityBaselines] = useState<SecurityBaseline[]>([]);

  // Business Value form
  const [bvName, setBvName] = useState('');
  const [bvDesc, setBvDesc] = useState('');

  // Supporting Asset form
  const [saName, setSaName] = useState('');
  const [saType, setSaType] = useState('');

  // Fear Event form
  const [feDesc, setFeDesc] = useState('');
  const [feGravity, setFeGravity] = useState(1);
  const [feBvId, setFeBvId] = useState('');

  // Security Baseline form
  const [sbRef, setSbRef] = useState('');
  const [sbCompliance, setSbCompliance] = useState('PARTIAL');
  const [sbGap, setSbGap] = useState('');

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const base = `/api/studies/${studyId}`;

  const loadTab = async (tab: Tab) => {
    setActiveTab(tab);
    const res = await fetch(`${base}/${tab}`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    if (tab === 'business-values') setBusinessValues(data);
    if (tab === 'supporting-assets') setSupportingAssets(data);
    if (tab === 'fear-events') setFearEvents(data);
    if (tab === 'security-baselines') setSecurityBaselines(data);
  };

  const addBusinessValue = async () => {
    const res = await fetch(`${base}/business-values`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: bvName, description: bvDesc }),
    });
    if (res.ok) {
      const bv = await res.json();
      setBusinessValues((prev) => [...prev, bv]);
      setBvName('');
      setBvDesc('');
    }
  };

  const addSupportingAsset = async () => {
    const res = await fetch(`${base}/supporting-assets`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: saName, type: saType }),
    });
    if (res.ok) {
      const sa = await res.json();
      setSupportingAssets((prev) => [...prev, sa]);
      setSaName('');
      setSaType('');
    }
  };

  const addFearEvent = async () => {
    const res = await fetch(`${base}/fear-events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ description: feDesc, gravity: feGravity, businessValueId: feBvId }),
    });
    if (res.ok) {
      const fe = await res.json();
      setFearEvents((prev) => [...prev, fe]);
      setFeDesc('');
      setFeGravity(1);
    }
  };

  const addSecurityBaseline = async () => {
    const res = await fetch(`${base}/security-baselines`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ referential: sbRef, compliance: sbCompliance, gap: sbGap || undefined }),
    });
    if (res.ok) {
      const sb = await res.json();
      setSecurityBaselines((prev) => [...prev, sb]);
      setSbRef('');
      setSbCompliance('PARTIAL');
      setSbGap('');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(Object.keys(tabLabels) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => loadTab(tab)}
            style={{
              padding: '6px 12px',
              background: activeTab === tab ? '#007bff' : '#eee',
              color: activeTab === tab ? 'white' : 'black',
              border: '1px solid #ccc',
              cursor: 'pointer',
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'business-values' && (
        <div>
          <h3>Valeurs métier</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input placeholder="Nom" value={bvName} onChange={(e) => setBvName(e.target.value)} style={{ padding: '6px' }} />
            <input placeholder="Description" value={bvDesc} onChange={(e) => setBvDesc(e.target.value)} style={{ padding: '6px' }} />
            <button onClick={addBusinessValue} style={{ padding: '6px 12px' }}>Ajouter</button>
          </div>
          <ul>
            {businessValues.map((bv) => (
              <li key={bv.id}><strong>{bv.name}</strong> — {bv.description}</li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'supporting-assets' && (
        <div>
          <h3>Biens supports</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input placeholder="Nom" value={saName} onChange={(e) => setSaName(e.target.value)} style={{ padding: '6px' }} />
            <input placeholder="Type" value={saType} onChange={(e) => setSaType(e.target.value)} style={{ padding: '6px' }} />
            <button onClick={addSupportingAsset} style={{ padding: '6px 12px' }}>Ajouter</button>
          </div>
          <ul>
            {supportingAssets.map((sa) => (
              <li key={sa.id}><strong>{sa.name}</strong> — {sa.type}</li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'fear-events' && (
        <div>
          <h3>Événements redoutés</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input placeholder="Description" value={feDesc} onChange={(e) => setFeDesc(e.target.value)} style={{ padding: '6px' }} />
            <select value={feGravity} onChange={(e) => setFeGravity(Number(e.target.value))} style={{ padding: '6px' }}>
              {[1, 2, 3, 4].map((g) => <option key={g} value={g}>Gravité {g}</option>)}
            </select>
            <select value={feBvId} onChange={(e) => setFeBvId(e.target.value)} style={{ padding: '6px' }}>
              <option value="">-- Valeur métier --</option>
              {businessValues.map((bv) => <option key={bv.id} value={bv.id}>{bv.name}</option>)}
            </select>
            <button onClick={addFearEvent} disabled={!feBvId} style={{ padding: '6px 12px' }}>Ajouter</button>
          </div>
          <ul>
            {fearEvents.map((fe) => (
              <li key={fe.id}>{fe.description} (Gravité {fe.gravity})</li>
            ))}
          </ul>
        </div>
      )}

      {activeTab === 'security-baselines' && (
        <div>
          <h3>Socle de sécurité</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <input placeholder="Référentiel (ex: ISO27001)" value={sbRef} onChange={(e) => setSbRef(e.target.value)} style={{ padding: '6px' }} />
            <select value={sbCompliance} onChange={(e) => setSbCompliance(e.target.value)} style={{ padding: '6px' }}>
              <option value="COMPLIANT">Conforme</option>
              <option value="PARTIAL">Partiel</option>
              <option value="NON_COMPLIANT">Non conforme</option>
            </select>
            <input placeholder="Écart" value={sbGap} onChange={(e) => setSbGap(e.target.value)} style={{ padding: '6px' }} />
            <button onClick={addSecurityBaseline} style={{ padding: '6px 12px' }}>Ajouter</button>
          </div>
          <ul>
            {securityBaselines.map((sb) => (
              <li key={sb.id}><strong>{sb.referential}</strong> — {sb.compliance}{sb.gap ? ` — ${sb.gap}` : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
