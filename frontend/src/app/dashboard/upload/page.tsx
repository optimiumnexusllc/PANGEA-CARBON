'use client';
import { useLang } from '@/lib/lang-context';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL;
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('accessToken') : ''}` });

const CSV_TEMPLATE = `period_start,period_end,energy_mwh,peak_power_mw,availability_pct,notes
2024-01-01,2024-01-31,1250.5,48.2,98.5,Janvier production
2024-02-01,2024-02-29,1180.3,46.8,97.2,Février production
2024-03-01,2024-03-31,1340.7,49.1,99.1,Mars production`;

export default function UploadPage() {
  const { t, lang } = useLang();
  const L = (en, fr) => lang === 'fr' ? fr : en;
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    api.getProjects().then(d => setProjects(d.projects || [])).catch(console.error);
  });

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj: any, header, i) => {
        obj[header] = values[i]?.trim() || '';
        return obj;
      }, {});
    }).filter(r => r.energy_mwh || r.energyMWh);
  };

  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setError('');
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        if (!rows.length) { setError('No data valide trouvée. Vérifiez le format CSV.'); return; }
        setParsed(rows);
      } catch (err) { setError('Erreur de parsing. Utilisez le template CSV fourni.'); }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) handleFile(file);
    else setError('Format accepté: .csv uniquement');
  };

  const upload = async () => {
    if (!selectedProject) { setError('Sélectionnez un projet'); return; }
    if (!parsed.length) { setError('Importez un fichier CSV d\'abord'); return; }
    setUploading(true); setError('');

    try {
      const readings = parsed.map(r => ({
        periodStart: r.period_start || r.periodStart,
        periodEnd: r.period_end || r.periodEnd,
        energyMWh: parseFloat(r.energy_mwh || r.energyMWh || 0),
        peakPowerMW: r.peak_power_mw ? parseFloat(r.peak_power_mw) : undefined,
        availabilityPct: r.availability_pct ? parseFloat(r.availability_pct) : undefined,
        notes: r.notes || undefined,
      })).filter(r => r.energyMWh > 0);

      const res = await api.bulkReadings(selectedProject, readings);
      setResult(res);

      // Start le calcul MRV automatiquement
      await api.getMRV(selectedProject).catch(() => {});

      setParsed([]);
      setFileName('');
    } catch(e) { setError(e.message); }
    finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pangea-carbon-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n) => parseFloat(n || 0).toFixed(2);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>IMPORT · AUTO MRV</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#E8EFF6', margin: 0 }}>L('CSV / Excel Import', 'Import CSV / Excel')</h1>
        <p style={{ fontSize: 13, color: '#4A6278', marginTop: 4 }}>Bulk import your production data. MRV calculation starts automatically.</p>
      </div>

      {result && (
        <div style={{ background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.3)', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#00FF94', marginBottom: 8 }}>✓ Import réussi !</div>
          <div style={{ fontSize: 13, color: '#8FA3B8' }}>{result.created} lectures importées sur {result.total}</div>
          <div style={{ fontSize: 12, color: '#4A6278', marginTop: 6 }}>Le calcul MRV a été mis à jour automatiquement → <a href={`/dashboard/projects/${selectedProject}`} style={{ color: '#38BDF8' }}>Voir le projet →</a></div>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#F87171' }}>{error}</div>
      )}

      {/* Project selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Project cible *</label>
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
          style={{ width: '100%', background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 7, color: selectedProject ? '#E8EFF6' : '#4A6278', padding: '10px 14px', fontSize: 14, outline: 'none' }}>
          <option value="">Sélectionner un projet...</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.installedMW} MW · {p.countryCode}</option>)}
        </select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? 'rgba(0,255,148,0.5)' : parsed.length ? 'rgba(0,255,148,0.3)' : '#1E2D3D'}`,
          borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16,
          background: dragging ? 'rgba(0,255,148,0.04)' : '#0D1117', transition: 'all 0.2s' }}>
        <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}/>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
        {fileName ? (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#00FF94', marginBottom: 4 }}>✓ {fileName}</div>
            <div style={{ fontSize: 13, color: '#4A6278' }}>{parsed.length} lignes de données prêtes à importer</div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#E8EFF6', marginBottom: 6 }}>Drag your CSV here or click to browse</div>
            <div style={{ fontSize: 12, color: '#4A6278' }}>Format: CSV avec colonnes period_start, period_end, energy_mwh</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={downloadTemplate} style={{ background: 'transparent', border: '1px solid #1E2D3D', borderRadius: 7, color: '#4A6278', padding: '9px 16px', cursor: 'pointer', fontSize: 13 }}>
          📥 Download CSV template
        </button>
        {parsed.length > 0 && (
          <button onClick={upload} disabled={uploading || !selectedProject}
            style={{ flex: 1, background: '#00FF94', color: '#080B0F', border: 'none', borderRadius: 7, padding: '9px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
            {uploading ? 'Import en cours...' : `✓ Import ${parsed.length} lectures → MRV auto`}
          </button>
        )}
      </div>

      {/* Preview */}
      {parsed.length > 0 && (
        <div style={{ background: '#0D1117', border: '1px solid #1E2D3D', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: '#121920', borderBottom: '1px solid #1E2D3D', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace' }}>
            APERÇU — {parsed.length} LIGNES · {parsed.reduce((s, r) => s + parseFloat(r.energy_mwh || 0), 0).toFixed(1)} MWh total
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0D1117' }}>
                {['Période début', 'Période fin', 'Production MWh', 'Puissance MW', 'Dispo %', 'Scores'].map(col => (
                  <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, color: '#4A6278', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', borderBottom: '1px solid #1E2D3D' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.slice(0, 10).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(30,45,61,0.4)' }}>
                  <td style={{ padding: '8px 14px', fontSize: 12, color: '#8FA3B8' }}>{row.period_start || row.periodStart}</td>
                  <td style={{ padding: '8px 14px', fontSize: 12, color: '#8FA3B8' }}>{row.period_end || row.periodEnd}</td>
                  <td style={{ padding: '8px 14px', fontSize: 13, color: '#00FF94', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{fmt(row.energy_mwh || row.energyMWh)}</td>
                  <td style={{ padding: '8px 14px', fontSize: 12, color: '#8FA3B8', fontFamily: 'JetBrains Mono, monospace' }}>{row.peak_power_mw ? fmt(row.peak_power_mw) : '—'}</td>
                  <td style={{ padding: '8px 14px', fontSize: 12, color: '#8FA3B8' }}>{row.availability_pct ? row.availability_pct + '%' : '—'}</td>
                  <td style={{ padding: '8px 14px', fontSize: 11, color: '#4A6278' }}>{row.notes || '—'}</td>
                </tr>
              ))}
              {parsed.length > 10 && (
                <tr><td colSpan={6} style={{ padding: '8px 14px', fontSize: 11, color: '#4A6278', textAlign: 'center' }}>+ {parsed.length - 10} lignes supplémentaires</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
