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

export async function getApprovedProfileById(
  userId: string,
): Promise<ProfessionalProfileRow | null> {
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
  if (!row) return null;
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
  headlineMy: string;
  headlineEn: string;
  bioMy: string;
  bioEn: string;
  skills: string[];
  typicalTurnaroundDays: number;
  minBudgetMmk: number;
  acceptingWork: boolean;
  portfolio: Array<{ externalUrl: string; caption?: string }>;
}): Promise<{ professionalId: string; status: 'pending' }> {
  const sql = getSql();

  await sql`
    insert into professionals (
      user_id, category_id, headline_my, headline_en, bio_my, bio_en,
      skills, status, typical_turnaround_days, min_budget_mmk, accepting_work
    ) values (
      ${args.userId}::uuid,
      ${args.categoryId}::uuid,
      ${args.headlineMy},
      ${args.headlineEn},
      ${args.bioMy},
      ${args.bioEn},
      ${args.skills},
      'pending'::pro_status,
      ${args.typicalTurnaroundDays},
      ${args.minBudgetMmk},
      ${args.acceptingWork}
    )
    on conflict (user_id) do update set
      category_id = excluded.category_id,
      headline_my = excluded.headline_my,
      headline_en = excluded.headline_en,
      bio_my = excluded.bio_my,
      bio_en = excluded.bio_en,
      skills = excluded.skills,
      status = 'pending'::pro_status,
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

  return { professionalId: args.userId, status: 'pending' };
}

export async function upsertApplicantProfile(args: {
  userId: string;
  displayName: string;
}): Promise<void> {
  const sql = getSql();
  await sql`
    insert into profiles (id, role, display_name, locale)
    values (
      ${args.userId}::uuid,
      'professional'::user_role,
      ${args.displayName},
      'my'
    )
    on conflict (id) do update set
      role = 'professional'::user_role,
      display_name = excluded.display_name,
      updated_at = now()
  `;
}
