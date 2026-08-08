import { getSql } from '../../db/client.js';
import { normalizeToUnicode } from '@inyalink/burmese';

export type ProfileRow = {
  id: string;
  displayName: string;
  role: 'client' | 'professional' | 'admin';
  isAdmin: boolean;
  locale: 'my' | 'en';
};

type ProfileDbRow = {
  id: string;
  display_name: string;
  role: 'client' | 'professional' | 'admin';
  is_admin: boolean;
  locale: 'my' | 'en';
};

function mapProfile(row: ProfileDbRow): ProfileRow {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    isAdmin: row.is_admin,
    locale: row.locale,
  };
}

export async function findProfileById(id: string): Promise<ProfileRow | null> {
  const sql = getSql();
  const rows = await sql<ProfileDbRow[]>`
    select id, display_name, role, is_admin, locale
    from profiles
    where id = ${id}::uuid
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return mapProfile(row);
}

/**
 * Insert a client profile on first Google sign-in.
 * No-op if the row already exists (unique id).
 */
export async function insertClientProfile(input: {
  id: string;
  displayName: string;
  locale: 'my' | 'en';
}): Promise<ProfileRow> {
  const sql = getSql();
  const displayName = normalizeToUnicode(input.displayName.trim()).slice(0, 80);
  const rows = await sql<ProfileDbRow[]>`
    insert into profiles (id, role, display_name, locale, is_admin)
    values (
      ${input.id}::uuid,
      'client'::user_role,
      ${displayName.length > 0 ? displayName : 'Client'},
      ${input.locale}::locale_code,
      false
    )
    on conflict (id) do update
      set updated_at = now()
    returning id, display_name, role, is_admin, locale
  `;
  const row = rows[0];
  if (!row) {
    throw new Error('insertClientProfile returned no row');
  }
  return mapProfile(row);
}

/** Promote a profile to admin (ops console). Sets role=admin and is_admin=true. */
export async function promoteToAdmin(id: string): Promise<ProfileRow> {
  const sql = getSql();
  const rows = await sql<ProfileDbRow[]>`
    update profiles
    set
      is_admin = true,
      role = 'admin'::user_role,
      updated_at = now()
    where id = ${id}::uuid
    returning id, display_name, role, is_admin, locale
  `;
  const row = rows[0];
  if (!row) {
    throw new Error('promoteToAdmin returned no row');
  }
  return mapProfile(row);
}
