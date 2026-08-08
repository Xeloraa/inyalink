-- category_other_text: free-text specialty when professionals.category is `other`.
-- Lets ops see what people offer outside the named verticals.

alter table professionals
  add column if not exists category_other_text text
    check (
      category_other_text is null
      or (
        length(trim(category_other_text)) between 2 and 200
      )
    );

comment on column professionals.category_other_text is
  'Free-text description of work when category slug is other. Null otherwise.';
