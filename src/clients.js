import { supabase } from './supabase.js'

export async function fetchClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, phone, email, allergies, preferences, notes')
    .order('name', { ascending: true })
  if (error) {
    console.error('fetchClients error:', error)
    throw error
  }
  return data || []
}

export async function upsertClient(client) {
  const { id, ...fields } = client
  if (id) {
    const { data, error } = await supabase
      .from('clients').update(fields).eq('id', id).select().single()
    if (error) throw error
    return data
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('clients').insert({ ...fields, user_id: user.id }).select().single()
    if (error) throw error
    return data
  }
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) throw error
}
