import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AuxiliarPanel({ usuario, onLogout }) {
  const [clinicas, setClinicas] = useState([]);
  const [doctores, setDoctores] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [form, setForm] = useState({
    clinica_id: '', fecha: new Date().toISOString().split('T')[0],
    nif: '', nombre_completo: '', doctor_id: '',
    aseguradora_id: '', concepto: '', forma_pago: 'CONTADO',
    pago_confirmado: true, importe: ''
  });
  const [busquedaNif, setBusquedaNif] = useState('');
  const [mensajeNif, setMensajeNif] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('clinicas').select('*').then(({ data }) => setClinicas(data || []));
    supabase.from('doctores').select('*').then(({ data }) => setDoctores(data || []));
    supabase.from('aseguradoras').select('*').then(({ data }) => setAseguradoras(data || []));
    if (usuario.clinica_id) setForm(f => ({ ...f, clinica_id: usuario.clinica_id }));
  }, [usuario]);

  const buscarPorNif = async () => {
    if (!busquedaNif) return;
    const { data } = await supabase.from('pacientes').select('*').eq('nif', busquedaNif).single();
    if (data) {
      setForm(f => ({ ...f, nif: data.nif, nombre_completo: data.nombre_completo }));
      setMensajeNif('✅ Paciente encontrado: ' + data.nombre_completo);
    } else {
      setForm(f => ({ ...f, nif: busquedaNif, nombre_completo: '' }));
      setMensajeNif('🆕 Paciente nuevo, introduce el nombre');
    }
  };

  const handleSubmit = async () => {
    setError(''); setExito('');
    if (!form.clinica_id || !form.fecha || !form.nif || !form.nombre_completo || !form.doctor_id || !form.concepto || !form.importe) {
      setError('Por favor rellena todos los campos obligatorios');
      return;
    }
    setLoading(true);

    let pacienteId;
    const { data: pacExistente } = await supabase.from('pacientes').select('*').eq('nif', form.nif).single();
    if (pacExistente) {
      pacienteId = pacExistente.id;
    } else {
      const { data: nuevoPac } = await supabase.from('pacientes').insert({
        nif: form.nif, nombre_completo: form.nombre_completo
      }).select().single();
      pacienteId = nuevoPac.id;
    }

    const doctor = doctores.find(d => d.id === parseInt(form.doctor_id));
    const esFacturable = doctor?.es_facturable || form.forma_pago === 'TRANSFERENCIA';
    if (esFacturable) {
      await supabase.from('pacientes').update({ es_facturable: true }).eq('id', pacienteId);
    }

    const { error: actError } = await supabase.from('actos').insert({
      clinica_id: parseInt(form.clinica_id),
      paciente_id: pacienteId,
      doctor_id: parseInt(form.doctor_id),
      aseguradora_id: form.aseguradora_id ? parseInt(form.aseguradora_id) : null,
      concepto: form.concepto,
      forma_pago: form.forma_pago,
      pago_confirmado: form.forma_pago === 'CONTADO' || form.forma_pago === 'BIZUM' ? true : form.pago_confirmado,
      importe: parseFloat(form.importe),
      fecha: form.fecha
    });

    if (actError) { setError('Error al guardar: ' + actError.message); }
    else {
      setExito('✅ Acto registrado correctamente');
      setForm(f => ({ ...f, nif: '', nombre_completo: '', concepto: '', importe: '', pago_confirmado: true }));
      setBusquedaNif(''); setMensajeNif('');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🦷 Registro de Acto Médico</h2>
        <button style={styles.logoutBtn} onClick={onLogout}>Salir</button>
      </div>
      <div style={styles.form}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Clínica *</label>
            <select style={styles.input} value={form.clinica_id} onChange={e => setForm(f => ({ ...f, clinica_id: e.target.value }))}>
              <option value="">Selecciona...</option>
              {clinicas.map(c => <option key={c.id} value={c.id}>{c.codigo} - {c.nombre}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Fecha *</label>
            <input style={styles.input} type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Buscar paciente por NIF</label>
          <div style={styles.nifRow}>
            <input style={{ ...styles.input, flex: 1 }} type="text" placeholder="Introduce NIF" value={busquedaNif}
              onChange={e => setBusquedaNif(e.target.value.toUpperCase())} />
            <button style={styles.buscarBtn} onClick={buscarPorNif}>Buscar</button>
          </div>
          {mensajeNif && <p style={styles.mensajeNif}>{mensajeNif}</p>}
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>NIF *</label>
            <input style={styles.input} type="text" value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value.toUpperCase() }))} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Nombre completo *</label>
            <input style={styles.input} type="text" value={form.nombre_completo} onChange={e => setForm(f => ({ ...f, nombre_completo: e.target.value }))} />
          </div>
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Doctor *</label>
            <select style={styles.input} value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}>
              <option value="">Selecciona...</option>
              {doctores.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Aseguradora</label>
            <select style={styles.input} value={form.aseguradora_id} onChange={e => setForm(f => ({ ...f, aseguradora_id: e.target.value }))}>
              <option value="">Particular</option>
              {aseguradoras.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Concepto / Tratamiento *</label>
          <input style={styles.input} type="text" value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
        </div>

        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Forma de pago *</label>
            <select style={styles.input} value={form.forma_pago} onChange={e => setForm(f => ({ ...f, forma_pago: e.target.value }))}>
              <option value="CONTADO">Contado</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="BIZUM">Bizum</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Importe (€) *</label>
            <input style={styles.input} type="number" step="0.01" value={form.importe} onChange={e => setForm(f => ({ ...f, importe: e.target.value }))} />
          </div>
        </div>

        {form.forma_pago === 'TRANSFERENCIA' && (
          <div style={styles.field}>
            <label style={styles.label}>
              <input type="checkbox" checked={form.pago_confirmado} onChange={e => setForm(f => ({ ...f, pago_confirmado: e.target.checked }))} />
              {' '}Transferencia ya confirmada
            </label>
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}
        {exito && <p style={styles.exito}>{exito}</p>}

        <button style={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Guardando...' : 'Registrar Acto'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '700px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { color: '#1a1a2e', margin: 0 },
  logoutBtn: { padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  form: { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#333', fontSize: '14px' },
  input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' },
  nifRow: { display: 'flex', gap: '8px' },
  buscarBtn: { padding: '10px 16px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' },
  mensajeNif: { fontSize: '13px', color: '#555', marginTop: '4px' },
  submitBtn: { width: '100%', padding: '14px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', marginTop: '8px' },
  error: { color: 'red', fontSize: '13px' },
  exito: { color: 'green', fontSize: '13px' }
};

export default AuxiliarPanel;
