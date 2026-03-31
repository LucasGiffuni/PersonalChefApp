import { supabase } from './supabase.js'

export async function fetchRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select('id, name, cat, emoji, description, time, difficulty, servings, ingredients, steps, tags, photo_url')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('fetchRecipes error:', error)
    throw error
  }
  return data || []
}

export async function upsertRecipe(recipe) {
  const { id, ...fields } = recipe
  if (id) {
    const { data, error } = await supabase.from('recipes').update(fields).eq('id', id).select().single()
    if (error) throw error
    return data
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('recipes').insert({ ...fields, user_id: user.id }).select().single()
    if (error) throw error
    return data
  }
}

export async function deleteRecipe(id) {
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

export async function uploadPhoto(file, recipeId) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${recipeId}.${ext}`
  const { error } = await supabase.storage
    .from('recipe-photos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path)
  return data.publicUrl
}
