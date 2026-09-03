import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { listMyCertificates, uploadCertificate, verifyCertificate } from '../services/api';
import type { Certificate } from '../types/api';

function VerificationBadge({ status }: { status: string }) {
  const config = {
    VERIFIED: { icon: '✓', color: '#22c55e', bg: '#22c55e22', label: 'VERIFIED' },
    PENDING: { icon: '⏳', color: '#f59e0b', bg: '#f59e0b22', label: 'PENDING' },
    REJECTED: { icon: '✗', color: '#ef4444', bg: '#ef444422', label: 'REJECTED' },
  }[status] || { icon: '?', color: '#94a3b8', bg: '#94a3b822', label: status };

  return (
    <span style={{ background: config.bg, color: config.color, border: `1px solid ${config.color}44`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
      {config.icon} {config.label}
    </span>
  );
}

export default function CertificatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    crop: '', grade: '', issuing_organization: '',
    issue_date: '', certificate_number: '',
  });
  const [file, setFile] = useState<File | null>(null);

  const fetchCerts = async () => {
    setLoading(true);
    try {
      const data = await listMyCertificates();
      setCerts(data);
    } catch {
      setError('Failed to load certificates.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchCerts(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('crop', form.crop);
      if (form.grade) fd.append('grade', form.grade);
      if (form.issuing_organization) fd.append('issuing_organization', form.issuing_organization);
      if (form.issue_date) fd.append('issue_date', form.issue_date);
      if (form.certificate_number) fd.append('certificate_number', form.certificate_number);
      if (file) fd.append('file', file);

      await uploadCertificate(fd);
      setShowUpload(false);
      setForm({ crop: '', grade: '', issuing_organization: '', issue_date: '', certificate_number: '' });
      setFile(null);
      fetchCerts();
    } catch {
      setError('Failed to upload certificate.');
    }
    setUploading(false);
  };

  const handleVerify = async (id: number) => {
    try {
      await verifyCertificate(id);
      fetchCerts();
    } catch {
      setError('Verification failed.');
    }
  };

  const styles = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', padding: '32px 24px', fontFamily: "'Inter', sans-serif" } as React.CSSProperties,
    btn: { background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' } as React.CSSProperties,
    btnOutline: { background: 'transparent', color: '#6366f1', border: '1px solid #6366f1', borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' } as React.CSSProperties,
    btnGreen: { background: 'linear-gradient(90deg, #22c55e, #16a34a)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
    card: { background: 'rgba(30,41,59,0.9)', border: '1px solid #334155', borderRadius: 16, padding: 24, marginBottom: 16 } as React.CSSProperties,
    label: { color: '#64748b', fontSize: 12, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 } as React.CSSProperties,
    value: { color: '#e2e8f0', fontSize: 14, marginBottom: 8 } as React.CSSProperties,
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 } as React.CSSProperties,
    modalBox: { background: '#0f172a', border: '1px solid #334155', borderRadius: 20, padding: 36, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' as const } as React.CSSProperties,
    input: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: 8, padding: '9px 14px', width: '100%', fontSize: 14, boxSizing: 'border-box' as const } as React.CSSProperties,
    formGroup: { marginBottom: 14 } as React.CSSProperties,
    formLabel: { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6 } as React.CSSProperties,
  };

  const CROPS = ['Groundnut', 'Mustard', 'Soybean', 'Sunflower', 'Sesame', 'Maize', 'Paddy'];

  return (
    <div style={styles.page}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#f8fafc', marginBottom: 6 }}>📄 My Certificates</h1>
            <p style={{ color: '#94a3b8', fontSize: 15 }}>Quality certificates to attach to your crop lots</p>
          </div>
          <button style={styles.btn} onClick={() => setShowUpload(true)}>+ Upload Certificate</button>
        </div>

        <div style={{ background: '#f59e0b11', border: '1px solid #f59e0b33', borderRadius: 12, padding: '12px 18px', marginBottom: 24, color: '#fcd34d', fontSize: 13 }}>
          <strong>⚠️ Demo Mode:</strong> Certificate verification is for demonstration purposes only. In production, verification requires an authorized third-party verifier.
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: 16, padding: 12, background: '#ef444422', borderRadius: 8 }}>{error}</div>}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#6366f1', padding: 48 }}>Loading...</div>
        ) : certs.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 64, background: 'rgba(30,41,59,0.6)', borderRadius: 20, border: '1px dashed #334155' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <p>No certificates yet. Upload one to add credibility to your crop lots!</p>
            <button style={{ ...styles.btn, marginTop: 16 }} onClick={() => setShowUpload(true)}>Upload Certificate</button>
          </div>
        ) : (
          certs.map(cert => (
            <div key={cert.id} style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                  📄 {cert.crop} Certificate
                  {cert.grade && <span style={{ color: '#94a3b8', fontSize: 14, fontWeight: 400, marginLeft: 8 }}>· {cert.grade}</span>}
                </div>
                <VerificationBadge status={cert.verification_status} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {cert.issuing_organization && (
                  <div><div style={styles.label}>Issuing Org</div><div style={styles.value}>{cert.issuing_organization}</div></div>
                )}
                {cert.certificate_number && (
                  <div><div style={styles.label}>Certificate No.</div><div style={styles.value}>{cert.certificate_number}</div></div>
                )}
                {cert.issue_date && (
                  <div><div style={styles.label}>Issue Date</div><div style={styles.value}>{cert.issue_date}</div></div>
                )}
                {cert.file_path && (
                  <div><div style={styles.label}>File</div><div style={{ color: '#6366f1', fontSize: 14 }}>📎 Attached</div></div>
                )}
              </div>
              {cert.notes && <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>{cert.notes}</div>}
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                {cert.verification_status === 'PENDING' && (
                  <button style={styles.btnGreen} onClick={() => handleVerify(cert.id)}>
                    ✓ Verify (Demo)
                  </button>
                )}
                <button style={styles.btnOutline} onClick={() => navigate('/my-lots')}>
                  Attach to Lot
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showUpload && (
        <div style={styles.modal} onClick={e => e.target === e.currentTarget && setShowUpload(false)}>
          <div style={styles.modalBox}>
            <h2 style={{ color: '#f8fafc', fontWeight: 800, marginBottom: 24, fontSize: 20 }}>📄 Upload Certificate</h2>
            <form onSubmit={handleUpload}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Crop *</label>
                <select style={styles.input} value={form.crop}
                  onChange={e => setForm(f => ({ ...f, crop: e.target.value }))} required>
                  <option value="">Select crop</option>
                  {CROPS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Grade</label>
                <input style={styles.input} placeholder="Grade A / Grade B"
                  value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Issuing Organization</label>
                <input style={styles.input} placeholder="Karnataka State Agriculture Dept."
                  value={form.issuing_organization} onChange={e => setForm(f => ({ ...f, issuing_organization: e.target.value }))} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Certificate Number</label>
                <input style={styles.input} placeholder="KA-GND-2026-001"
                  value={form.certificate_number} onChange={e => setForm(f => ({ ...f, certificate_number: e.target.value }))} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Issue Date</label>
                <input style={styles.input} type="date"
                  value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Upload File (JPG, PNG, PDF)</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  style={{ ...styles.input, padding: '6px 10px', color: '#94a3b8' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="submit" style={{ ...styles.btn, flex: 1 }} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload Certificate'}
                </button>
                <button type="button" style={{ ...styles.btnOutline, flex: 1 }} onClick={() => setShowUpload(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
