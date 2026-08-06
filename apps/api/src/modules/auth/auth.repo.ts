import { getSql } from '../../db/client.js';
import { normalizeToUnicode } from '@inyalink/burmese';

export type ProfileRow = {
  id: string;
  displayName: string;
  role: 'client' | 'professional' | 'admin';
  locale: 'my' | 'en';
};

export async function findProfileById(id: string): Promise<ProfileRow | null> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      display_name: string;
      role: 'client' | 'professional' | 'admin';
      locale: 'my' | 'en';
    }[]
  >`
    select id, display_name, role, locale
    from profiles
    where id = ${id}::uuid
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    locale: row.locale,
  };
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
  const rows = await sql<
    {
      id: string;
      display_name: string;
      role: 'client' | 'professional' | 'admin';
      locale: 'my' | 'en';
    }[]
  >`
    insert into profiles (id, role, display_name, locale)
    values (
      ${input.id}::uuid,
      'client'::user_role,
      ${displayName.length > 0 ? displayName : 'Client'},
      ${input.locale}::locale_code
    )
    on conflict (id) do update
      set updated_at = now()
    returning id, display_name, role, locale
  `;
  const row = rows[0];
  if (!row) {
    throw new Error('insertClientProfile returned no row');
  }
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    locale: row.locale,
  };
}
