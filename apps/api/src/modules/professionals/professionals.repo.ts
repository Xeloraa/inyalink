import { getSql } from '../../db/client.js';
import type { CategorySlug } from '@inyalink/shared';

function toInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value !== '') return Number(value);
  return null;
}

export type CategoryRow = {
  id: string;
  slug: CategorySlug;
  nameMy: string;
  nameEn: string;
};

export type ProfessionalProfileRow = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  headlineMy: string | null;
  headlineEn: string | null;
  bioMy: string | null;
  bioEn: string | null;
  skills: string[];
  status: 'pending' | 'approved' | 'rejected' | 'paused';
  acceptingWork: boolean;
  typicalTurnaroundDays: number | null;
  minBudgetMmk: number | null;
  categoryId: string | null;
  categorySlug: CategorySlug | null;
  categoryNameMy: string | null;
  categoryNameEn: string | null;
  categoryOtherText: string | null;
  completedCount: number;
  declinedCount: number;
  uniqueClients: number;
  completionRatePct: number | null;
  medianResponseMins: number | null;
};

export type PortfolioRow = {
  id: string;
  caption: string | null;
  externalUrl: string | null;
  storagePath: string | null;
  sort: number;
};

export async function listApprovedProfiles(filters: {
  categories?: CategorySlug[];
  minBudget?: number;
  maxBudget?: number;
  acceptingOnly?: boolean;
}): Promise<ProfessionalProfileRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      display_name: string;
      avatar_url: string | null;
      headline_my: string | null;
      headline_en: string | null;
      bio_my: string | null;
      bio_en: string | null;
      skills: string[] | null;
      status: 'pending' | 'approved' | 'rejected' | 'paused';
      accepting_work: boolean;
      typical_turnaround_days: number | null;
      min_budget_mmk: string | number | null;
      category_id: string | null;
      category_slug: CategorySlug | null;
      category_name_my: string | null;
      category_name_en: string | null;
      category_other_text: string | null;
      completed_count: string | number | null;
      declined_count: string | number | null;
      unique_clients: string | number | null;
      completion_rate_pct: string | number | null;
      median_response_mins: string | number | null;
    }[]
  >`
    select
      p.user_id,
      pr.display_name,
      coalesce(u.raw_user_meta_data->>'avatar_url', null) as avatar_url,
      p.headline_my,
      p.headline_en,
      p.bio_my,
      p.bio_en,
      p.skills,
      p.status,
      p.accepting_work,
      p.typical_turnaround_days,
      p.min_budget_mmk,
      p.category_id,
      c.slug as category_slug,
      c.name_my as category_name_my,
      c.name_en as category_name_en,
      p.category_other_text,
      coalesce(rep.completed_count, 0) as completed_count,
      coalesce(rep.declined_count, 0) as declined_count,
      coalesce(rep.unique_clients, 0) as unique_clients,
      rep.completion_rate_pct,
      rep.median_response_mins
    from professionals p
    join profiles pr on pr.id = p.user_id
    left join auth.users u on u.id = p.user_id
    left join categories c on c.id = p.category_id
    left join professional_reputation rep on rep.professional_id = p.user_id
    where p.status = 'approved'
    order by pr.display_name asc
  `;

  return rows
    .map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      headlineMy: row.headline_my,
      headlineEn: row.headline_en,
      bioMy: row.bio_my,
      bioEn: row.bio_en,
      skills: row.skills ?? [],
      status: row.status,
      acceptingWork: row.accepting_work,
      typicalTurnaroundDays: row.typical_turnaround_days,
      minBudgetMmk: toInt(row.min_budget_mmk),
      categoryId: row.category_id,
      categorySlug: row.category_slug,
      categoryNameMy: row.category_name_my,
      categoryNameEn: row.category_name_en,
      categoryOtherText: row.category_other_text,
      completedCount: toInt(row.completed_count) ?? 0,
      declinedCount: toInt(row.declined_count) ?? 0,
      uniqueClients: toInt(row.unique_clients) ?? 0,
      completionRatePct: toInt(row.completion_rate_pct),
      medianResponseMins:
        row.median_response_mins === null ||
        row.median_response_mins === undefined
          ? null
          : Number(row.median_response_mins),
    }))
    .filter((row) => {
      if (filters.acceptingOnly && !row.acceptingWork) return false;
      if (
        filters.categories &&
        filters.categories.length > 0 &&
        (!row.categorySlug || !filters.categories.includes(row.categorySlug))
      ) {
        return false;
      }
      if (
        filters.minBudget !== undefined &&
        (row.minBudgetMmk === null || row.minBudgetMmk < filters.minBudget)
      ) {
        return false;
      }
      if (
        filters.maxBudget !== undefined &&
        (row.minBudgetMmk === null || row.minBudgetMmk > filters.maxBudget)
      ) {
        return false;
      }
      return true;
    });
}

export type SkillFacetRow = {
  name: string;
  count: number;
};

/** Distinct skills across approved professionals, most common first. */
export async function listSkillFacets(): Promise<SkillFacetRow[]> {
  const sql = getSql();
  const rows = await sql<{ name: string; count: string | number }[]>`
    select s.name, count(*)::int as count
    from professionals p
    cross join lateral unnest(p.skills) as s(name)
    where p.status = 'approved'
    group by s.name
    order by count(*) desc, s.name asc
  `;
  return rows.map((r) => ({ name: r.name, count: toInt(r.count) ?? 0 }));
}

export async function listCategories(): Promise<CategoryRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      slug: CategorySlug;
      name_my: string;
      name_en: string;
    }[]
  >`
    select id, slug, name_my, name_en
    from categories
    order by sort asc, name_en asc
  `;
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nameMy: r.name_my,
    nameEn: r.name_en,
  }));
}

export async function getCategoryBySlug(
  slug: CategorySlug,
): Promise<CategoryRow | null> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      slug: CategorySlug;
      name_my: string;
      name_en: string;
    }[]
  >`
    select id, slug, name_my, name_en
    from categories
    where slug = ${slug}
    limit 1
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    nameMy: r.name_my,
    nameEn: r.name_en,
  };
}

type ProfileSqlRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  headline_my: string | null;
  headline_en: string | null;
  bio_my: string | null;
  bio_en: string | null;
  skills: string[] | null;
  status: 'pending' | 'approved' | 'rejected' | 'paused';
  accepting_work: boolean;
  typical_turnaround_days: number | null;
  min_budget_mmk: string | number | null;
  category_id: string | null;
  category_slug: CategorySlug | null;
  category_name_my: string | null;
  category_name_en: string | null;
  category_other_text: string | null;
  completed_count: string | number | null;
  declined_count: string | number | null;
  unique_clients: string | number | null;
  completion_rate_pct: string | number | null;
  median_response_mins: string | number | null;
};

function mapProfileRow(row: ProfileSqlRow): ProfessionalProfileRow {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    headlineMy: row.headline_my,
    headlineEn: row.headline_en,
    bioMy: row.bio_my,
    bioEn: row.bio_en,
    skills: row.skills ?? [],
    status: row.status,
    acceptingWork: row.accepting_work,
    typicalTurnaroundDays: row.typical_turnaround_days,
    minBudgetMmk: toInt(row.min_budget_mmk),
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    categoryNameMy: row.category_name_my,
    categoryNameEn: row.category_name_en,
    categoryOtherText: row.category_other_text,
    completedCount: toInt(row.completed_count) ?? 0,
    declinedCount: toInt(row.declined_count) ?? 0,
    uniqueClients: toInt(row.unique_clients) ?? 0,
    completionRatePct: toInt(row.completion_rate_pct),
    medianResponseMins:
      row.median_response_mins === null || row.median_response_mins === undefined
        ? null
        : Number(row.median_response_mins),
  };
}

export async function getApprovedProfileById(
  userId: string,
): Promise<ProfessionalProfileRow | null> {
  const sql = getSql();
  const rows = await sql<ProfileSqlRow[]>`
    select
      p.user_id,
      pr.display_name,
      coalesce(u.raw_user_meta_data->>'avatar_url', null) as avatar_url,
      p.headline_my,
      p.headline_en,
      p.bio_my,
      p.bio_en,
      p.skills,
      p.status,
      p.accepting_work,
      p.typical_turnaround_days,
      p.min_budget_mmk,
      p.category_id,
      c.slug as category_slug,
      c.name_my as category_name_my,
      c.name_en as category_name_en,
      p.category_other_text,
      coalesce(rep.completed_count, 0) as completed_count,
      coalesce(rep.declined_count, 0) as declined_count,
      coalesce(rep.unique_clients, 0) as unique_clients,
      rep.completion_rate_pct,
      rep.median_response_mins
    from professionals p
    join profiles pr on pr.id = p.user_id
    left join auth.users u on u.id = p.user_id
    left join categories c on c.id = p.category_id
    left join professional_reputation rep on rep.professional_id = p.user_id
    where p.user_id = ${userId}::uuid
      and p.status = 'approved'
    limit 1
  `;
  const row = rows[0];
  return row ? mapProfileRow(row) : null;
}

/** Own row — any status (join gate + profile edit). */
export async function getProfileByUserId(
  userId: string,
): Promise<ProfessionalProfileRow | null> {
  const sql = getSql();
  const rows = await sql<ProfileSqlRow[]>`
    select
      p.user_id,
      pr.display_name,
      coalesce(u.raw_user_meta_data->>'avatar_url', null) as avatar_url,
      p.headline_my,
      p.headline_en,
      p.bio_my,
      p.bio_en,
      p.skills,
      p.status,
      p.accepting_work,
      p.typical_turnaround_days,
      p.min_budget_mmk,
      p.category_id,
      c.slug as category_slug,
      c.name_my as category_name_my,
      c.name_en as category_name_en,
      p.category_other_text,
      coalesce(rep.completed_count, 0) as completed_count,
      coalesce(rep.declined_count, 0) as declined_count,
      coalesce(rep.unique_clients, 0) as unique_clients,
      rep.completion_rate_pct,
      rep.median_response_mins
    from professionals p
    join profiles pr on pr.id = p.user_id
    left join auth.users u on u.id = p.user_id
    left join categories c on c.id = p.category_id
    left join professional_reputation rep on rep.professional_id = p.user_id
    where p.user_id = ${userId}::uuid
    limit 1
  `;
  const row = rows[0];
  return row ? mapProfileRow(row) : null;
}

export async function listPortfolio(
  professionalId: string,
): Promise<PortfolioRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      caption: string | null;
      external_url: string | null;
      storage_path: string | null;
      sort: number;
    }[]
  >`
    select id, caption, external_url, storage_path, sort
    from portfolio_items
    where professional_id = ${professionalId}::uuid
    order by sort asc, created_at asc
  `;
  return rows.map((r) => ({
    id: r.id,
    caption: r.caption,
    externalUrl: r.external_url,
    storagePath: r.storage_path,
    sort: r.sort,
  }));
}

export async function insertApplication(args: {
  userId: string;
  categoryId: string;
  categoryOtherText: string | null;
  headlineMy: string | null;
  headlineEn: string | null;
  bioMy: string | null;
  bioEn: string | null;
  skills: string[];
  typicalTurnaroundDays: number | null;
  minBudgetMmk: number | null;
  acceptingWork: boolean;
  status: 'pending' | 'approved';
  portfolio: Array<{ externalUrl: string; caption?: string }>;
}): Promise<{ professionalId: string; status: 'pending' | 'approved' }> {
  const sql = getSql();

  await sql`
    insert into professionals (
      user_id, category_id, category_other_text, headline_my, headline_en, bio_my, bio_en,
      skills, status, typical_turnaround_days, min_budget_mmk, accepting_work
    ) values (
      ${args.userId}::uuid,
      ${args.categoryId}::uuid,
      ${args.categoryOtherText},
      ${args.headlineMy},
      ${args.headlineEn},
      ${args.bioMy},
      ${args.bioEn},
      ${args.skills},
      ${args.status}::pro_status,
      ${args.typicalTurnaroundDays},
      ${args.minBudgetMmk},
      ${args.acceptingWork}
    )
    on conflict (user_id) do update set
      category_id = excluded.category_id,
      category_other_text = excluded.category_other_text,
      headline_my = excluded.headline_my,
      headline_en = excluded.headline_en,
      bio_my = excluded.bio_my,
      bio_en = excluded.bio_en,
      skills = excluded.skills,
      status = ${args.status}::pro_status,
      typical_turnaround_days = excluded.typical_turnaround_days,
      min_budget_mmk = excluded.min_budget_mmk,
      accepting_work = excluded.accepting_work,
      updated_at = now()
  `;

  await sql`
    delete from portfolio_items
    where professional_id = ${args.userId}::uuid
  `;

  for (let i = 0; i < args.portfolio.length; i++) {
    const item = args.portfolio[i];
    if (!item) continue;
    await sql`
      insert into portfolio_items (professional_id, external_url, caption, sort)
      values (
        ${args.userId}::uuid,
        ${item.externalUrl},
        ${item.caption ?? null},
        ${i}
      )
    `;
  }

  return { professionalId: args.userId, status: args.status };
}

export async function updateProfessional(args: {
  userId: string;
  categoryId?: string;
  /** Pass null to clear; omit to leave unchanged. */
  categoryOtherText?: string | null;
  headlineMy?: string;
  headlineEn?: string;
  bioMy?: string;
  bioEn?: string;
  skills?: string[];
  typicalTurnaroundDays?: number;
  minBudgetMmk?: number;
  acceptingWork?: boolean;
}): Promise<void> {
  const sql = getSql();
  const clearOther = args.categoryOtherText === null;
  const setOther =
    args.categoryOtherText !== undefined && args.categoryOtherText !== null;
  await sql`
    update professionals set
      category_id = coalesce(${args.categoryId ?? null}::uuid, category_id),
      category_other_text = case
        when ${clearOther} then null
        when ${setOther} then ${args.categoryOtherText ?? null}
        else category_other_text
      end,
      headline_my = coalesce(${args.headlineMy ?? null}, headline_my),
      headline_en = coalesce(${args.headlineEn ?? null}, headline_en),
      bio_my = coalesce(${args.bioMy ?? null}, bio_my),
      bio_en = coalesce(${args.bioEn ?? null}, bio_en),
      skills = coalesce(${args.skills ?? null}::text[], skills),
      typical_turnaround_days = coalesce(
        ${args.typicalTurnaroundDays ?? null},
        typical_turnaround_days
      ),
      min_budget_mmk = coalesce(${args.minBudgetMmk ?? null}, min_budget_mmk),
      accepting_work = coalesce(${args.acceptingWork ?? null}, accepting_work),
      updated_at = now()
    where user_id = ${args.userId}::uuid
  `;
}

export async function updateDisplayName(
  userId: string,
  displayName: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    update profiles set
      display_name = ${displayName},
      updated_at = now()
    where id = ${userId}::uuid
  `;
}

export async function addPortfolioItem(args: {
  professionalId: string;
  externalUrl: string;
  caption?: string;
}): Promise<PortfolioRow> {
  const sql = getSql();
  const maxRows = await sql<{ max_sort: number | null }[]>`
    select max(sort) as max_sort
    from portfolio_items
    where professional_id = ${args.professionalId}::uuid
  `;
  const nextSort = (maxRows[0]?.max_sort ?? -1) + 1;
  const rows = await sql<
    {
      id: string;
      caption: string | null;
      external_url: string | null;
      storage_path: string | null;
      sort: number;
    }[]
  >`
    insert into portfolio_items (professional_id, external_url, caption, sort)
    values (
      ${args.professionalId}::uuid,
      ${args.externalUrl},
      ${args.caption ?? null},
      ${nextSort}
    )
    returning id, caption, external_url, storage_path, sort
  `;
  const r = rows[0];
  if (!r) throw new Error('portfolio insert returned no row');
  return {
    id: r.id,
    caption: r.caption,
    externalUrl: r.external_url,
    storagePath: r.storage_path,
    sort: r.sort,
  };
}

export async function deletePortfolioItem(
  professionalId: string,
  itemId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    delete from portfolio_items
    where id = ${itemId}::uuid
      and professional_id = ${professionalId}::uuid
    returning id
  `;
  return rows.length > 0;
}

export async function countPortfolioItems(
  professionalId: string,
): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ n: string | number }[]>`
    select count(*)::int as n
    from portfolio_items
    where professional_id = ${professionalId}::uuid
  `;
  return toInt(rows[0]?.n) ?? 0;
}

export type WorkLinkRow = {
  id: string;
  platform:
    | 'github'
    | 'behance'
    | 'dribbble'
    | 'website'
    | 'instagram'
    | 'facebook'
    | 'linkedin'
    | 'other';
  url: string;
  label: string | null;
  sort: number;
  verifiedAt: string;
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

export async function listWorkLinks(
  professionalId: string,
): Promise<WorkLinkRow[]> {
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      platform: WorkLinkRow['platform'];
      url: string;
      label: string | null;
      sort: number;
      verified_at: unknown;
    }[]
  >`
    select id, platform, url, label, sort, verified_at
    from work_links
    where professional_id = ${professionalId}::uuid
    order by sort asc, created_at asc
  `;
  return rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    url: r.url,
    label: r.label,
    sort: r.sort,
    verifiedAt: toIso(r.verified_at),
  }));
}

export async function countWorkLinks(professionalId: string): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ n: string | number }[]>`
    select count(*)::int as n
    from work_links
    where professional_id = ${professionalId}::uuid
  `;
  return toInt(rows[0]?.n) ?? 0;
}

export async function insertWorkLink(args: {
  professionalId: string;
  platform: WorkLinkRow['platform'];
  url: string;
  label: string | null;
  verifiedAt: Date;
}): Promise<WorkLinkRow> {
  const sql = getSql();
  const maxRows = await sql<{ max_sort: number | null }[]>`
    select max(sort) as max_sort
    from work_links
    where professional_id = ${args.professionalId}::uuid
  `;
  const nextSort = (maxRows[0]?.max_sort ?? -1) + 1;
  const rows = await sql<
    {
      id: string;
      platform: WorkLinkRow['platform'];
      url: string;
      label: string | null;
      sort: number;
      verified_at: unknown;
    }[]
  >`
    insert into work_links (
      professional_id, platform, url, label, sort, verified_at
    ) values (
      ${args.professionalId}::uuid,
      ${args.platform}::work_link_platform,
      ${args.url},
      ${args.label},
      ${nextSort},
      ${args.verifiedAt.toISOString()}::timestamptz
    )
    returning id, platform, url, label, sort, verified_at
  `;
  const r = rows[0];
  if (!r) throw new Error('work_link insert returned no row');
  return {
    id: r.id,
    platform: r.platform,
    url: r.url,
    label: r.label,
    sort: r.sort,
    verifiedAt: toIso(r.verified_at),
  };
}

export async function deleteWorkLink(
  professionalId: string,
  linkId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    delete from work_links
    where id = ${linkId}::uuid
      and professional_id = ${professionalId}::uuid
    returning id
  `;
  return rows.length > 0;
}

export async function upsertApplicantProfile(args: {
  userId: string;
  /** When omitted/empty, keep the existing profile name (or 'Professional'). */
  displayName?: string | null;
}): Promise<void> {
  const sql = getSql();
  const name =
    args.displayName && args.displayName.trim().length >= 2
      ? args.displayName.trim()
      : null;
  await sql`
    insert into profiles (id, role, display_name, locale)
    values (
      ${args.userId}::uuid,
      'professional'::user_role,
      coalesce(${name}, 'Professional'),
      'my'
    )
    on conflict (id) do update set
      role = 'professional'::user_role,
      display_name = coalesce(${name}, profiles.display_name),
      updated_at = now()
  `;
}
