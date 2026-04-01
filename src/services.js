import { supabase } from './supabase.js'

const SELECT_FIELDS = `
  id,
  client_id,
  date,
  time_start,
  time_end,
  location,
  menu_notes,
  status,
  price,
  notes
`

export async function fetchServices() {
  const { data, error } = await supabase
    .from('services')
    .select(SELECT_FIELDS)
    .order('date', { ascending: true })
    .order('time_start', { ascending: true, nullsFirst: false })
  if (error) {
    console.error('fetchServices error:', error)
    throw error
  }
  return data || []
}

export async function upsertService(service) {
  const { id, ...fields } = service
  if (id) {
    const { data, error } = await supabase
      .from('services')
      .update(fields)
      .eq('id', id)
      .select(SELECT_FIELDS)
      .single()
    if (error) throw error
    return data
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('services')
    .insert({ ...fields, user_id: user.id })
    .select(SELECT_FIELDS)
    .single()
  if (error) throw error
  return data
}

export async function deleteService(id) {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}
