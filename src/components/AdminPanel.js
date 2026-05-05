import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AdminPanel({ usuario, onLogout }) {
  const [vista, setVista] = useState('caja');
  const [clinicas, setClinicas] = useState([]);
  const [doctores, setDoctores] = useState([]);
  const [aseguradoras, setAseguradoras] = useState([]);
  const [actos, setActos] = useState([]);
  const [salidas, setSalidas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [clinicaFiltro, setClinicaFiltro] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('clinicas').select('*').then(({ data }) => setClinicas(data || []));
    supabase.from('doctores').select('*').then(({ data }) => setDoctores(data || []));
    supabase.from('aseguradoras').select('*').then(({ data }) => setAseguradoras(data || []));
    supabase.from('pacientes').select('*').then(({ data }) => setPacientes(data || []));
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [fechaFiltro, clinicaFiltro]);

  const cargarDatos = async () => {
    setLoading(true);
    let q = supabase.from('actos').select('*, clinicas(*), doctores(*), aseguradoras(*), pacientes(*)').eq('fecha', fechaFiltro);
    if (clinicaFiltro) q = q.eq('clinica_id', clinicaFiltro);
    const { data } = await q;
    setActos(data || []);

    let q2 = supabase.from('salidas').select('*, clinicas(*)').eq('fecha', fechaFiltro);
    if (clinicaFiltro) q2 = q2.eq('clinica_id', clinicaFiltro);
    const { data: sal } = await q2;
    setSalidas(sal || []);
    setLoading(false);
  };

  const totalEfectivo = actos
    .filter(a => (a.forma_pago === 'CONTADO' || a.forma_pago === 'BIZUM') )
    .reduce((s, a) => s + parseFloat(a.importe), 0);

  const totalTransferencias = actos
    .filter(a => a.forma_pago === 'TRANSFERENCIA' && a.pago_confirmado)
    .reduce((s, a) => s + parseFloat(a.importe), 0);

  const totalPendiente = actos
    .filter(a => a.forma_pago === 'TRANSFERENCIA' && !a.pago_confirmado)
    .reduce((s, a) => s + parseFloat(a.importe), 0);

  const totalSalidas = salidas.reduce((s, a) => s + parseFloat(a.importe), 0);
  const saldoCaja = totalEfectivo - totalSalidas;

  const marcarFacturado = async (id, val) => {
    await supabase.from('actos').update({ facturado: val }).eq('id', id);
    cargarDatos();
  };

  const marcarPagoConfirmado = async (id, val) => {
    await supabase.from('actos').update({ pago_confirmado: val }).eq('id', id);
    cargarDatos();
  };

  const marcarFacturablePaciente = async (pacienteId, val) => {
    await supabase.from('pacientes').update({ es_facturable: val, facturable_manual: val }).eq('id', pacienteId);
    supabase.from('pacientes').select('*').then(({ data }) => setPacientes(data || []));
  };

  const agregarSalida = async () => {
    const concepto = prompt('Concepto de la salida:');
    if (!concepto) return;
    const importe = prompt('Importe (€):');
    if (!importe) return;
    const clinica = clinicaFiltro || clinicas[0]?.id;
    await supabase.from('salidas').insert({ clinica_id: parseInt(clinica), concepto, importe: parseFloat(importe), fecha: fechaFiltro });
    cargarDatos();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🦷 Panel de Administración</h2>
        <button style={styles.logoutBtn} onClick={onLogout}>Salir</button>
      </div>

      <div style={styles.nav}>
        {['caja', 'actos', 'pacientes', 'configuracion'].map(v => (
          <button key={v} style={{ ...styles.navBtn, ...(vista === v ? styles.navBtnActive : {}) }} onClick={() => setVista(v)}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.filtros}>
        <input style={styles.input} type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} />
        <select style={styles.input} value={clinicaFiltro} onChange={e => setClinicaFiltro(e.target.value)}>
          <option value="">Todas las clínicas</option>
          {clinicas.map(c => <option key={c.id} value={c.id}>{c.codigo}</option>)}
        </select>
      </div>

      {vista === 'caja' && (
        <div>
          <div style={styles.cardsRow}>
            <div style={styles.card}><p style={styles.cardLabel}>Efectivo + Bizum</p><p style={styles.cardValue}>{totalEfectivo.toFixed(2)} €</p></div>
            <div style={styles.card}><p style={styles.cardLabel}>Transferencias cobradas</p><p style={styles.cardValue}>{totalTransferencias.toFixed(2)} €</p></div>
            <div style={{ ...styles.card, backgroundColor: '#fef3c7' }}><p style={styles.cardLabel}>Transferencias pendientes</p><p style={styles.cardValue}>{totalPendiente.toFixed(2)} €</p></div>
            <div style={{ ...styles.card, backgroundColor: '#fee2e2' }}><p style={styles.cardLabel}>Salidas</p><p style={styles.cardValue}>{totalSalidas.toFixed(2)} €</p></div>
            <div style={{ ...styles.card, backgroundColor: '#d1fae5' }}><p style={styles.cardLabel}>Saldo en caja</p><p style={styles.cardValue}>{saldoCaja.toFixed(2)} €</p></div>
          </div>
          <button style={styles.addBtn} onClick={agregarSalida}>+ Añadir salida de caja</button>
          {salidas.length > 0 && (
            <div style={styles.tableWrap}>
              <h3>Salidas del día</h3>
              <table style={styles.table}>
                <thead><tr><th>Clínica</th><th>Concepto</th><th>Importe</th></tr></thead>
                <tbody>{salidas.map(s => <tr key={s.id}><td>{s.clinicas?.codigo}</td><td>{s.concepto}</td><td>{parseFloat(s.importe).toFixed(2)} €</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {vista === 'actos' && (
        <div style={styles.tableWrap}>
          <h3>Actos del día ({actos.length})</h3>
          <table style={styles.table}>
            <thead>
              <tr><th>Clínica</th><th>Paciente</th><th>Doctor</th><th>Concepto</th><th>Aseguradora</th><th>Pago</th><th>Confirmado</th><th>Importe</th><th>Facturado</th></tr>
            </thead>
            <tbody>
              {actos.map(a => (
                <tr key={a.id}>
                  <td>{a.clinicas?.codigo}</td>
                  <td>{a.pacientes?.nombre_completo}</td>
                  <td>{a.doctores?.nombre}</td>
                  <td>{a.concepto}</td>
                  <td>{a.aseguradoras?.nombre || 'Particular'}</td>
                  <td>{a.forma_pago}</td>
                  <td>
                    {a.forma_pago === 'TRANSFERENCIA'
                      ? <input type="checkbox" checked={a.pago_confirmado} onChange={e => marcarPagoConfirmado(a.id, e.target.checked)} />
                      : '✅'}
                  </td>
                  <td>{parseFloat(a.importe).toFixed(2)} €</td>
                  <td><input type="checkbox" checked={a.facturado} onChange={e => marcarFacturado(a.id, e.target.checked)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'pacientes' && (
        <div style={styles.tableWrap}>
          <h3>Pacientes</h3>
          <table style={styles.table}>
            <thead><tr><th>Nombre</th><th>NIF</th><th>Facturable</th><th>Acción</th></tr></thead>
            <tbody>
              {pacientes.map(p => (
                <tr key={p.id}>
                  <td>{p.nombre_completo}</td>
                  <td>{p.nif}</td>
                  <td>{p.es_facturable ? '✅ Sí' : '❌ No'}</td>
                  <td>
                    <button style={styles.smallBtn} onClick={() => marcarFacturablePaciente(p.id, !p.es_facturable)}>
                      {p.es_facturable ? 'Quitar facturable' : 'Marcar facturable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'configuracion' && (
        <ConfiguracionPanel clinicas={clinicas} doctores={doctores} aseguradoras={aseguradoras} onRefresh={() => {
          supabase.from('doctores').select('*').then(({ data }) => setDoctores(data || []));
          supabase.from('aseguradoras').select('*').then(({ data }) => setAseguradoras(data || []));
        }} />
      )}
    </div>
  );
}

function ConfiguracionPanel({ doctores, aseguradoras, onRefresh }) {
  const agregarDoctor = async () => {
    const nombre = prompt('Nombre del doctor:');
    if (!nombre) return;
    const facturable = window.confirm('¿Es doctor facturable? (Ortodoncia/Laura)');
    await supabase.from('doctores').insert({ nombre: nombre.toUpperCase(), es_facturable: facturable });
    onRefresh();
  };

  const eliminarDoctor = async (id) => {
    if (!window.confirm('¿Eliminar este doctor?')) return;
    await supabase.from('doctores').delete().eq('id', id);
    onRefresh();
  };

  const agregarAseguradora = async () => {
    const nombre = prompt('Nombre de la aseguradora:');
    if (!nombre) return;
    await supabase.from('aseguradoras').insert({ nombre });
    onRefresh();
  };

  const eliminarAseguradora = async (id) => {
    if (!window.confirm('¿Eliminar esta aseguradora?')) return;
    await supabase.from('aseguradoras').delete().eq('id', id);
    onRefresh();
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h3>Doctores</h3>
        <button style={styles.addBtn} onClick={agregarDoctor}>+ Añadir doctor</button>
        <table style={styles.table}>
          <thead><tr><th>Nombre</th><th>Facturable</th><th>Acción</th></tr></thead>
          <tbody>
            {doctores.map(d => (
              <tr key={d.id}>
                <td>{d.nombre}</td>
                <td>{d.es_facturable ? '✅' : '❌'}</td>
                <td><button style={styles.deleteBtn} onClick={() => eliminarDoctor(d.id)}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3>Aseguradoras</h3>
        <button style={styles.addBtn} onClick={agregarAseguradora}>+ Añadir aseguradora</button>
        <table style={styles.table}>
          <thead><tr><th>Nombre</th><th>Acción</th></tr></thead>
          <tbody>
            {aseguradoras.map(a => (
              <tr key={a.id}>
                <td>{a.nombre}</td>
                <td><button style={styles.deleteBtn} onClick={() => eliminarAseguradora(a.id)}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: '1100px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { color: '#1a1a2e', margin: 0 },
  logoutBtn: { padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  nav: { display: 'flex', gap: '8px', marginBottom: '20px' },
  navBtn: { padding: '10px 20px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' },
  navBtnActive: { backgroundColor: '#2563eb', color: 'white' },
  filtros: { display: 'flex', gap: '12px', marginBottom: '20px' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' },
  cardsRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' },
  card: { backgroundColor: 'white', padding: '16px 20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: '150px' },
  cardLabel: { margin: '0 0 4px', fontSize: '12px', color: '#666' },
  cardValue: { margin: 0, fontSize: '22px', fontWeight: '700', color: '#1a1a2e' },
  addBtn: { marginBottom: '12px', padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  tableWrap: { backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  smallBtn: { padding: '4px 10px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  deleteBtn: { padding: '4px 10px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
};

export default AdminPanel;
