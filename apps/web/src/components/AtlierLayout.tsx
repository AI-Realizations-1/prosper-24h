import { useState } from 'react';
import { A1Form } from './A1Form';
import A2Form from './A2Form';
import A3Form from './A3Form';
import { A4Form } from './A4Form';
import { A5Form } from './A5Form';

export function AtlierLayout({ studyId }: { studyId: string }) {
  const [activeAtlier, setActiveAtlier] = useState(1);

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            onClick={() => setActiveAtlier(i)}
            disabled={i > 5}
            style={{
              padding: '8px 16px',
              background: activeAtlier === i ? '#007bff' : '#ccc',
              color: activeAtlier === i ? 'white' : 'black',
              cursor: i > 5 ? 'not-allowed' : 'pointer',
              border: 'none',
            }}
          >
            Atelier {i}
          </button>
        ))}
      </div>

      {activeAtlier === 1 && <A1Form studyId={studyId} />}
      {activeAtlier === 2 && <A2Form studyId={studyId} />}
      {activeAtlier === 3 && <A3Form studyId={studyId} />}
      {activeAtlier === 4 && <A4Form studyId={studyId} />}
      {activeAtlier === 5 && <A5Form studyId={studyId} />}
    </div>
  );
}
