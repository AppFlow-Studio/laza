-- =====================================================================
-- LAZA ITEM CATALOG REPLACEMENT: STEP 1 OF 2 (PREVIEW ONLY)
-- This changes nothing. It shows what step 2 will delete and add.
-- Paste into Supabase > SQL Editor > Run.
-- =====================================================================
with recursive
-- Laza's organization: the Clerk org whose id starts with org_36ZVGtf3aRW.
-- (There is an older org_35... also named "Laza Dessert Cafe"; it is not touched.)
pick as (select 'org_36ZVGtf3aRW'::text as id_prefix),
laza as (
  select o.id, o.name from public.organizations o, pick
  where left(o.id, length(pick.id_prefix)) = pick.id_prefix
),
org as (
  select id, name from laza where (select count(*) from laza) = 1
),
old_items as (
  select i.* from public.items i join org on org.id = i.organization_id
),
-- Every table that points at those items, found from the database's own
-- foreign keys, plus anything that points at those rows, and so on.
tree as (
  select c.conrelid as tbl, 1 as depth,
         format('%I in (select id from public.items where organization_id = %L)', a.attname, org.id) as cond
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
  cross join org
  where c.contype = 'f' and c.confrelid = 'public.items'::regclass and c.confdeltype in ('a', 'r', 'c')
  union all
  select c.conrelid, t.depth + 1,
         format('%I in (select %I from %s where %s)', a.attname, ra.attname, t.tbl::regclass, t.cond)
  from tree t
  join pg_constraint c on c.contype = 'f' and c.confrelid = t.tbl and c.confdeltype in ('a', 'r', 'c')
  join pg_attribute a  on a.attrelid  = c.conrelid  and a.attnum  = c.conkey[1]
  join pg_attribute ra on ra.attrelid = c.confrelid and ra.attnum = c.confkey[1]
  where t.depth < 6
),
counted as (
  select t.tbl::regclass::text as table_name,
         (xpath('/row/n/text()', query_to_xml(
            format('select count(*) as n from %s where %s', t.tbl::regclass,
                   string_agg('(' || t.cond || ')', ' or ')), false, true, '')))[1]::text::bigint as n
  from tree t
  group by t.tbl
),
report as (
  select 1 as sort, 'Organization to clear' as "check",
         name || '  (' || id || ')' as details, (select count(*) from old_items) as "rows"
  from org
  union all
  select 1, 'PROBLEM: send Claude a screenshot',
         'Expected 1 organization with id starting ' || (select id_prefix from pick) || ', found ' || (select count(*) from laza) || '. All organizations: ' ||
         coalesce((select string_agg(coalesce(name, '(no name)') || ' = ' || id, '; ') from public.organizations), 'none'),
         null
  where (select count(*) from laza) <> 1
  union all
  select 2, 'Items that will be deleted', 'of which marked as warehouse items: ' ||
         (select count(*) from old_items where is_warehouse_item), (select count(*) from old_items)
  from org
  union all
  select 3, 'Categories right now', coalesce((select string_agg(c.name, ', ' order by c.name)
         from public.category c join org on org.id = c.organization_id), ''),
         (select count(*) from public.category c join org on org.id = c.organization_id)
  from org
  union all
  select 4, 'Also deleted: ' || table_name, 'rows linked to the old items (backed up first)', n
  from counted
  where n > 0
  union all
  select 5, 'Locations that will get the new items',
         coalesce((select string_agg(l.name, ', ' order by l.name) from public.locations l where l.organization_id = org.id), 'none'),
         (select count(*) from public.locations l where l.organization_id = org.id)
  from org
  union all
  select 6, 'New catalog to be added', '68 items in 7 categories', 68
)
select "check", details, "rows" from report order by sort, "rows" desc nulls last, "check";
