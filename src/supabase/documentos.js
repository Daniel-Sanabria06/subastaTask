import { supabase } from './cliente.js';

export const subirDocumentoPDF = async (file, tipo = 'otro') => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No hay usuario autenticado');
    if (!file) throw new Error('Archivo PDF requerido');
    if (file.type !== 'application/pdf') throw new Error('Solo se permite PDF');

    const userId = user.id;
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
      .select('*, trabajador:trabajador_id ( nombre_completo, correo, profesion )')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { success: true, data };
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

