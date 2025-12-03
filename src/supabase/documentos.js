import { supabase } from './cliente.js';

export const subirDocumentoPDF = async (file, tipo = 'otro') => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No hay usuario autenticado');
    if (!file) throw new Error('Archivo PDF requerido');
    if (file.type !== 'application/pdf') throw new Error('Solo se permite PDF');

    const userId = user.id;
    const { data: existentes, error: errExistentes } = await supabase
      .from('documentos_trabajador')
      .select('id, estado')
      .eq('trabajador_id', userId)
      .in('estado', ['pendiente', 'aprobado'])
      .limit(1);
    if (errExistentes) throw errExistentes;
    if (Array.isArray(existentes) && existentes.length > 0) {
      throw new Error('Ya tienes un documento en revisión o aprobado. Espera decisión antes de subir otro.');
    }

    const ts = Date.now();
    const cleanName = (file.name || 'documento.pdf').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const path = `verificaciones/${userId}/${ts}_${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(path, file, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw uploadError;

    const { data: inserted, error: insertError } = await supabase
      .from('documentos_trabajador')
      .insert({ trabajador_id: userId, tipo, storage_path: path })
      .select('*')
      .single();
    if (insertError) throw insertError;

    return { success: true, data: inserted };
  } catch (error) {
    return { success: false, error };
  }
};

export const listarDocumentosVerificacionPorUsuario = async (userId) => {
  try {
    if (!userId) throw new Error('Usuario requerido');
    const { data, error } = await supabase.storage
      .from('documentos')
      .list(`verificaciones/${userId}`, { limit: 100, sortBy: { column: 'name', order: 'desc' } });
    if (error) throw error;
    const files = Array.isArray(data) ? data : [];
    return { success: true, data: files.map(f => ({
      trabajador_id: userId,
      storage_path: `verificaciones/${userId}/${f.name}`,
      name: f.name,
      created_at: f.created_at || null
    })) };
  } catch (error) {
    return { success: false, error, data: [] };
  }
};

export const listarDocumentosVerificacionDesdeStorage = async (userIds = []) => {
  try {
    const result = [];
    for (const id of (userIds || [])) {
      const { success, data } = await listarDocumentosVerificacionPorUsuario(id);
      if (success && data.length > 0) {
        const sorted = [...data].sort((a, b) => String(b.name).localeCompare(String(a.name)));
        const top = sorted[0];
        // Si ya existe registro en BD (pendiente/aprobado/rechazado), respetar BD y evitar fallback duplicado
        try {
          const { data: checkPend } = await supabase
            .from('documentos_trabajador')
            .select('id')
            .eq('trabajador_id', id)
            .eq('storage_path', top.storage_path)
            .in('estado', ['pendiente'])
            .limit(1);
          if (Array.isArray(checkPend) && checkPend.length > 0) {
            continue; // ya hay pendiente en BD, no crear fallback
          }
          const { data: checkDone } = await supabase
            .from('documentos_trabajador')
            .select('id')
            .eq('trabajador_id', id)
            .in('estado', ['aprobado','rechazado'])
            .limit(1);
          if (Array.isArray(checkDone) && checkDone.length > 0) {
            continue; // ya procesado en BD, no mostrar en pendientes
          }
        } catch {}
        let trabajadorInfo = null;
        try {
          const { data: tData, error: tErr } = await supabase
            .from('trabajadores')
            .select('nombre_completo, correo')
            .eq('id', id)
            .single();
          if (!tErr && tData) trabajadorInfo = tData;
        } catch {}
        result.push({
          id: `${id}:${top.name}`,
          trabajador_id: id,
          tipo: 'otro',
          estado: 'pendiente',
          storage_path: top.storage_path,
          created_at: top.created_at,
          trabajador: trabajadorInfo || null
        });
      }
    }
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error, data: [] };
  }
};

export const listarDocumentosTrabajador = async (userId) => {
  try {
    const id = userId || (await supabase.auth.getUser()).data?.user?.id;
    if (!id) throw new Error('Usuario requerido');
    const { data, error } = await supabase
      .from('documentos_trabajador')
      .select('*')
      .eq('trabajador_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error, data: [] };
  }
};

export const obtenerSignedUrlParaDocumento = async (storagePath, expiresIn = 3600) => {
  try {
    if (!storagePath) throw new Error('Ruta de storage requerida');
    const { data, error } = await supabase.storage
      .from('documentos')
      .createSignedUrl(storagePath, expiresIn);
    if (error) throw error;
    return { success: true, url: data?.signedUrl };
  } catch (error) {
    return { success: false, error };
  }
};

export const listarDocumentosPendientes = async () => {
  try {
    const { data, error } = await supabase
      .from('documentos_trabajador')
      .select('*')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });
    if (error) throw error;
    const docs = Array.isArray(data) ? data : [];
    const ids = [...new Set(docs.map(d => d.trabajador_id).filter(Boolean))];
    if (ids.length === 0) return { success: true, data: docs };
    const { data: trabajadores, error: tErr } = await supabase
      .from('trabajadores')
      .select('id, nombre_completo, correo, profesion')
      .in('id', ids);
    if (tErr) return { success: true, data: docs };
    const map = new Map((trabajadores || []).map(t => [t.id, t]));
    const enriquecidos = docs.map(d => ({ ...d, trabajador: map.get(d.trabajador_id) || null }));
    return { success: true, data: enriquecidos };
  } catch (error) {
    return { success: false, error, data: [] };
  }
};

export const listarTodosDocumentosVerificacion = async () => {
  try {
    const { data, error } = await supabase
      .from('documentos_trabajador')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const docs = Array.isArray(data) ? data : [];
    const ids = [...new Set(docs.map(d => d.trabajador_id).filter(Boolean))];
    if (ids.length === 0) return { success: true, data: docs };
    const { data: trabajadores, error: tErr } = await supabase
      .from('trabajadores')
      .select('id, nombre_completo, correo, profesion')
      .in('id', ids);
    if (tErr) return { success: true, data: docs };
    const map = new Map((trabajadores || []).map(t => [t.id, t]));
    const enriquecidos = docs.map(d => ({ ...d, trabajador: map.get(d.trabajador_id) || null }));
    return { success: true, data: enriquecidos };
  } catch (error) {
    return { success: false, error, data: [] };
  }
};

export const actualizarEstadoDocumento = async (docId, estado, comentario_admin) => {
  try {
    if (!docId) throw new Error('ID de documento requerido');
    if (!['aprobado','rechazado'].includes(estado)) throw new Error('Estado inválido');
    const { data, error } = await supabase
      .from('documentos_trabajador')
      .update({ estado, comentario_admin })
      .eq('id', docId)
      .select('*')
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

export const actualizarEstadoDocumentoPorPath = async (trabajador_id, storage_path, estado, comentario_admin) => {
  try {
    if (!trabajador_id || !storage_path) throw new Error('Trabajador y ruta requeridos');
    if (!['aprobado','rechazado'].includes(estado)) throw new Error('Estado inválido');
    const { data, error } = await supabase
      .from('documentos_trabajador')
      .update({ estado, comentario_admin })
      .eq('trabajador_id', trabajador_id)
      .eq('storage_path', storage_path)
      .eq('estado', 'pendiente')
      .select('*');
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

export const aprobarDocumentoAdmin = async (doc) => {
  try {
    if (!doc) throw new Error('Documento requerido');

    const esFilaReal = typeof doc.id === 'number';
    const payload = esFilaReal
      ? { action: 'approve_document', doc_id: doc.id }
      : { action: 'approve_document_from_storage', trabajador_id: doc.trabajador_id, storage_path: doc.storage_path, tipo: doc.tipo || 'otro' };

    const { data, error } = await supabase.functions.invoke('smart-processor', { body: payload });
    if (error) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const json = await res.json().catch(() => ({}));
      return { success: true, data: json };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

export const rechazarDocumentoAdmin = async (doc, comentario_admin = '') => {
  try {
    if (!doc) throw new Error('Documento requerido');

    const esFilaReal = typeof doc.id === 'number';
    const payload = esFilaReal
      ? { action: 'reject_document', doc_id: doc.id, comentario_admin }
      : { action: 'reject_document_from_storage', trabajador_id: doc.trabajador_id, storage_path: doc.storage_path, tipo: doc.tipo || 'otro', comentario_admin };

    const { data, error } = await supabase.functions.invoke('smart-processor', { body: payload });
    if (error) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const json = await res.json().catch(() => ({}));
      return { success: true, data: json };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

export const obtenerEstadoVerificacionPublico = async (trabajador_id) => {
  try {
    if (!trabajador_id) throw new Error('ID de trabajador requerido');
    const payload = { action: 'get_verification_status', trabajador_id };
    const { data, error } = await supabase.functions.invoke('smart-processor', { body: payload });
    if (error) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-processor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return { success: false, data: { verificado: false } };
      const json = await res.json().catch(() => ({}));
      return { success: true, data: json };
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error, data: { verificado: false } };
  }
};

