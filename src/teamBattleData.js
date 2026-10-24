import { supabase } from './supabaseClient';

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

export async function listTeamBattleSets() {
  const data = unwrap(await supabase
    .from('team_battle_sets')
    .select('id, owner_id, title, questions, share_token, is_shared, created_at, updated_at')
    .order('created_at', { ascending: false }));
  return Array.isArray(data) ? data : [];
}

export async function getSharedTeamBattleSet(token) {
  return unwrap(await supabase.rpc('get_shared_team_battle_set', { p_share_token: token }));
}

export async function saveTeamBattleSet({ id, ownerId, title, questions }) {
  const payload = { owner_id: ownerId, title: title.trim(), questions, is_shared: false, updated_at: new Date().toISOString() };
  const query = id
    ? supabase.from('team_battle_sets').update(payload).eq('id', id)
    : supabase.from('team_battle_sets').insert(payload);
  return unwrap(await query.select('id, owner_id, title, questions, share_token, is_shared, created_at, updated_at').single());
}

export async function setTeamBattleSetShared(id, isShared) {
  return unwrap(await supabase.from('team_battle_sets').update({ is_shared: isShared, updated_at: new Date().toISOString() }).eq('id', id).select('id, share_token, is_shared').single());
}

export async function deleteTeamBattleSet(id) {
  return unwrap(await supabase.from('team_battle_sets').delete().eq('id', id));
}
