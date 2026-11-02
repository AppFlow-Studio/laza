-- =====================================================================
-- LAZA ITEM CATALOG REPLACEMENT: STEP 2 OF 2
-- Deletes Laza's current items and adds the 68 items from the
-- "Laza Dessert Café: Complete Master Purchasing List".
--
-- Paste into Supabase > SQL Editor > Run.
-- It all runs as one transaction: if any part fails, nothing changes.
-- Before deleting, it copies every removed row into a new schema named
-- catalog_backup_<date>_<time>, so the old data can be restored.
--
-- Left out on purpose (marked Removed / Replaced / excluded on the list):
-- #18, 19, 26, 27, 39, 48, 51, 58-67.
-- =====================================================================
do $$
declare
  -- Laza's organization: the Clerk org whose id starts with org_36ZVGtf3aRW.
  -- (There is an older org_35... also named "Laza Dessert Cafe"; it is not touched.)
  v_org_prefix text := 'org_36ZVGtf3aRW';
  v_org_id   text;

  v_backup   text := 'catalog_backup_' || to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS');
  v_matches  int;
  v_removed  int;
  v_cat_id   bigint;
  r          record;
begin
  -- 1. Pick the organization -------------------------------------------
  select count(*), min(id) into v_matches, v_org_id
  from public.organizations where left(id, length(v_org_prefix)) = v_org_prefix;
  if v_matches <> 1 then
    raise exception 'Expected exactly 1 organization with id starting %, found %. Nothing was changed. Organizations: %',
      v_org_prefix, v_matches, (select string_agg(coalesce(name, '(no name)') || ' = ' || id, '; ') from public.organizations);
  end if;

  -- 2. The items being cleared -----------------------------------------
  drop table if exists pg_temp._laza_old_items;
  create temp table _laza_old_items as
    select id from public.items where organization_id = v_org_id;
  select count(*) into v_removed from _laza_old_items;

  -- 3. Everything that points at those items, found from the database's
  --    own foreign keys (and anything pointing at those rows, and so on).
  drop table if exists pg_temp._laza_tree;
  create temp table _laza_tree as
  with recursive tree as (
    select c.conrelid as tbl, 1 as depth, cardinality(c.conkey) as ncols,
           format('%I in (select id from pg_temp._laza_old_items)', a.attname) as cond
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.items'::regclass and c.confdeltype in ('a', 'r', 'c')
    union all
    select c.conrelid, t.depth + 1, cardinality(c.conkey),
           format('%I in (select %I from %s where %s)', a.attname, ra.attname, t.tbl::regclass, t.cond)
    from tree t
    join pg_constraint c on c.contype = 'f' and c.confrelid = t.tbl and c.confdeltype in ('a', 'r', 'c')
    join pg_attribute a  on a.attrelid  = c.conrelid  and a.attnum  = c.conkey[1]
    join pg_attribute ra on ra.attrelid = c.confrelid and ra.attnum = c.confkey[1]
    where t.depth < 6
  )
  select * from tree;

  if exists (select 1 from _laza_tree where ncols > 1) then
    raise exception 'Found a multi-column foreign key linked to items; this script does not handle that. Nothing was changed.';
  end if;

  -- 4. Back up everything that will be removed ---------------------------
  execute format('create schema %I', v_backup);
  execute format('create table %I.items as select * from public.items where id in (select id from pg_temp._laza_old_items)', v_backup);
  execute format('create table %I.category as select * from public.category where organization_id = %L', v_backup, v_org_id);
  for r in
    select t.tbl, n.nspname, cl.relname, string_agg('(' || t.cond || ')', ' or ') as conds
    from _laza_tree t
    join pg_class cl on cl.oid = t.tbl
    join pg_namespace n on n.oid = cl.relnamespace
    group by t.tbl, n.nspname, cl.relname
  loop
    execute format('create table %I.%I as select * from %s where %s',
                   v_backup, r.nspname || '__' || r.relname, r.tbl::regclass, r.conds);
  end loop;

  -- 5. Delete: deepest linked rows first, then the items themselves -------
  for r in select tbl, cond from _laza_tree order by depth desc loop
    execute format('delete from %s where %s', r.tbl::regclass, r.cond);
  end loop;
  delete from public.items where id in (select id from pg_temp._laza_old_items);

  -- 6. The 7 categories (sections A-G of the list) -------------------------
  drop table if exists pg_temp._laza_new_categories;
  create temp table _laza_new_categories (section text primary key, name text, description text, category_id bigint);
  insert into _laza_new_categories (section, name, description) values
    ('A', 'Gloves, Paper Goods, Utensils & Supplies', 'Supplier: Sysco'),
    ('B', 'Chocolate, Spreads & Fillings',            'Supplier: Sysco'),
    ('C', 'Syrups',                                    'Supplier: Sysco (Monin, 1883 Maison Routin)'),
    ('D', 'Ingredients, Dairy & Produce',              'Supplier: Sysco'),
    ('E', 'Desserts & Frozen Items',                   'Supplier: Sysco'),
    ('F', 'Beverages & Outside Suppliers',             'Red Bull: Sysco. Coffee: Devoción. Matcha: Oora. Kunafa dough: Mohammad. Kunafa powder mix: in-house. Frozen yogurt mixes: Noun (planned move to Sysco).'),
    ('G', 'Custom Packaging',                          'China supplier: +86 190 1156 6003');

  -- Remove old categories that are now empty, unless something else still uses them.
  for r in
    select c.id from public.category c
    where c.organization_id = v_org_id
      and lower(trim(coalesce(c.name, ''))) not in (select lower(name) from _laza_new_categories)
      and not exists (select 1 from public.items i where i.category_id = c.id)
  loop
    begin
      delete from public.category where id = r.id;
    exception when foreign_key_violation then
      null;
    end;
  end loop;

  -- Reuse a category that already has the same name, otherwise create it.
  for r in select * from _laza_new_categories order by section loop
    select id into v_cat_id from public.category
     where organization_id = v_org_id and lower(trim(name)) = lower(r.name)
     order by id limit 1;
    if v_cat_id is null then
      insert into public.category (organization_id, name, description)
      values (v_org_id, r.name, r.description)
      returning id into v_cat_id;
    else
      update public.category set description = r.description, updated_at = now() where id = v_cat_id;
    end if;
    update _laza_new_categories set category_id = v_cat_id where section = r.section;
  end loop;

  -- 7. The 68 new items (list number, section, name, Sysco item # as SKU) --
  drop table if exists pg_temp._laza_new_items;
  create temp table _laza_new_items (list_no int primary key, section text, name text, sku text);
  insert into _laza_new_items (list_no, section, name, sku) values
    -- A. Gloves, paper goods, utensils & supplies (Sysco)
    ( 1, 'A', 'Black Nitrile Gloves — Medium',          '4685594'),
    ( 2, 'A', 'Black Nitrile Gloves — Large',           '4685614'),
    ( 3, 'A', 'White Kitchen Paper Towels',             '4458646'),
    ( 4, 'A', 'Jumbo Toilet Paper, 2-Ply',              '5577089'),
    ( 5, 'A', 'Black Wrapped Forks',                    '6025076'),
    ( 6, 'A', 'Black Wrapped Spoons',                   '5534730'),
    ( 7, 'A', 'White 1-Ply Luncheon Napkins',           '4458547'),
    ( 8, 'A', 'White 2-Ply Beverage Napkins',           '7216177'),
    ( 9, 'A', 'Dome Lids, 12–20 oz',                    '2667374'),
    (10, 'A', 'Strawless Lids, 12–24 oz',               '7182402'),
    (11, 'A', 'Four-Cup Carriers',                      '3574910'),
    (12, 'A', 'Kraft Cup Sleeves',                      '7196630'),
    (13, 'A', '23-Gallon Trash Bags',                   '7455530'),
    (14, 'A', '33-Gallon Trash Bags',                   '1763192'),
    (15, 'A', '4 oz Translucent Portion Cups',          '7064604'),
    (16, 'A', 'Clear Lids for 3–4 oz Portion Cups',     '7793736'),
    (17, 'A', 'Plastic Food Wrap, 2,000 ft',            '3302601'),
    -- B. Chocolate, spreads & fillings (Sysco)
    (20, 'B', 'Nutella Hazelnut Spread',                null),
    (21, 'B', 'Lotus Biscoff Spread',                   null),
    (22, 'B', 'Sticky Tiki Pistachio Cococream Filling','7399774'),
    (23, 'B', 'Callebaut White Chocolate Callets CW2',  '5846944'),
    (24, 'B', 'Callebaut Milk Chocolate Callets 32%',   '1846730'),
    (25, 'B', 'Callebaut Dark Chocolate 53.1%',         null),
    -- C. Syrups (Sysco)
    (28, 'C', 'Strawberry Syrup (Monin)',               null),
    (29, 'C', 'Watermelon Syrup (Monin)',               null),
    (30, 'C', 'Dragon Fruit Syrup (Monin)',             '7119606'),
    (31, 'C', 'Peach Syrup (Monin)',                    null),
    (32, 'C', 'Passion Fruit / Red Passion Fruit Syrup (Monin)', null),
    (33, 'C', 'Vanilla Syrup (Monin)',                  null),
    (34, 'C', 'Blue Raspberry Syrup (Monin)',           null),
    (35, 'C', 'Blue Raspberry Syrup (1883)',            null),
    (36, 'C', 'Pineapple Syrup',                        null),
    (37, 'C', 'Coconut Syrup',                          null),
    (38, 'C', 'Cane Sugar Syrup',                       null),
    -- D. Ingredients, dairy & produce (Sysco)
    (40, 'D', 'Eagle Brand Sweetened Condensed Milk',   '4106698'),
    (41, 'D', 'Liquid Egg Product',                     null),
    (42, 'D', 'Ricotta Cheese',                         null),
    (43, 'D', 'Cold Foam Sweet Cream',                  null),
    (44, 'D', 'Cornstarch (Tate & Lyle)',               null),
    (45, 'D', 'Powdered Sugar',                         null),
    (46, 'D', 'Fresh Strawberries',                     null),
    (47, 'D', 'Imperial Fresh Mint, 1 lb',              '2037125'),
    (49, 'D', 'Kinder Chocolate 1.8 oz, Four-Bar Pack', '6063971'),
    (50, 'D', 'David''s Chocolate Chip Cookie Dough',   null),
    -- E. Desserts & frozen items (Sysco)
    (52, 'E', 'Brownies',                               null),
    (53, 'E', 'Lava Cakes',                             null),
    (54, 'E', 'Donut Holes',                            null),
    (55, 'E', 'Tiramisu',                               null),
    (56, 'E', 'Ice Cream Sandwiches',                   null),
    (57, 'E', 'Vanilla Ice Cream',                      null),
    -- F. Beverages & outside suppliers
    (68, 'F', 'Regular Red Bull',                       null),
    (69, 'F', 'Sugar-Free Red Bull',                    null),
    (70, 'F', 'Coffee Beans — One Blend (Devoción)',    null),
    (71, 'F', 'Matcha Powder (Oora)',                   null),
    (72, 'F', 'Kunafa Dough',                           null),
    (73, 'F', 'Kunafa Powder Mix',                      null),
    (74, 'F', 'Tart Frozen Yogurt Mix',                 null),
    (75, 'F', 'Non-Tart Frozen Yogurt Mix',             null),
    -- G. Custom packaging (China supplier)
    (76, 'G', 'Large Paper Boxes With Lids',            null),
    (77, 'G', 'Small Paper Boxes With Lids',            null),
    (78, 'G', 'Large Paper Boxes Without Lids',         null),
    (79, 'G', 'Small Paper Boxes Without Lids',         null),
    (80, 'G', 'Large Branded Paper Bags',               null),
    (81, 'G', 'Small Branded Paper Bags',               null),
    (82, 'G', 'Branded Paper Cups',                     null),
    (83, 'G', 'Branded Plastic Cups With Lids',         null),
    (84, 'G', 'Branded Plastic Cup Sleeves',            null),
    (85, 'G', 'Ice Cream Cups',                         null);

  -- created_at is staggered by a second per item so "newest first" lists
  -- show the items in the same order as the master list.
  insert into public.items (organization_id, name, sku, category_id, unit_of_measure, min_quantity, created_at)
  select v_org_id, n.name, n.sku, c.category_id, 'pcs', 0, now() - make_interval(secs => n.list_no)
  from _laza_new_items n
  join _laza_new_categories c on c.section = n.section
  order by n.list_no;

  -- 8. Put every new item in every Laza location's catalog, the same way
  --    the app does when a location is created (location admins can only
  --    stock items that are in their location's catalog).
  insert into public.location_catalog (location_id, item_id, assigned_at)
  select l.id, i.id, now()
  from public.locations l
  join public.items i on i.organization_id = l.organization_id
  where l.organization_id = v_org_id
  on conflict do nothing;

  -- Values for the summary below.
  perform set_config('laza.catalog_org_id', v_org_id, false);
  perform set_config('laza.catalog_backup', v_backup, false);
  perform set_config('laza.catalog_removed', v_removed::text, false);

  drop table if exists pg_temp._laza_old_items, pg_temp._laza_tree,
                       pg_temp._laza_new_categories, pg_temp._laza_new_items;
end $$;

-- Summary of the new catalog
select category, items from (
  select 1 as sort, c.name as category, count(i.id) as items
  from public.category c
  join public.items i on i.category_id = c.id
  where i.organization_id = current_setting('laza.catalog_org_id', true)
  group by c.name
  union all
  select 2, 'TOTAL new items', count(*)
  from public.items where organization_id = current_setting('laza.catalog_org_id', true)
  union all
  select 3, 'Old items removed', current_setting('laza.catalog_removed', true)::bigint
  union all
  select 4, 'Backup of removed rows: schema ' || current_setting('laza.catalog_backup', true), null
) s
order by sort, category;
