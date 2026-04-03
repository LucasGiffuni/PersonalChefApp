import { supabase } from '../supabase';

type UploadRecipePhotoInput = {
  uri: string;
  recipeId: number;
  userId: string;
};

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

function getFileExtension(uri: string) {
  const cleanUri = uri.split('?')[0].split('#')[0];
  const raw = cleanUri.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (!ALLOWED_EXTENSIONS.has(raw)) return 'jpg';
  return raw;
}

function getMimeType(ext: string) {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return 'application/octet-stream';
}

export async function uploadRecipePhoto({
  uri,
  recipeId,
  userId,
}: UploadRecipePhotoInput): Promise<string> {
  const ext = getFileExtension(uri);
  const objectPath = `${userId}/${recipeId}-${Date.now()}.${ext}`;
  const contentType = getMimeType(ext);

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('No se pudo leer la imagen seleccionada.');
  }

  const arrayBuffer = await response.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from('recipe-photos').upload(objectPath, arrayBuffer, {
    contentType,
    upsert: false,
  });

  if (uploadError) {
    throw new Error(`Error subiendo imagen: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(objectPath);
  if (!data?.publicUrl) {
    throw new Error('No se pudo obtener la URL pública de la imagen.');
  }

  return `${data.publicUrl}?t=${Date.now()}`;
}
