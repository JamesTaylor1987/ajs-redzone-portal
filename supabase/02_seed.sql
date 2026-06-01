-- ============================================================
-- AJS Redzone Portal — product catalogue seed
-- Prices match Redzone_Costs_1.xlsx (canonical price list, GBP ex-VAT).
-- All values in pence.
-- Run after 01_schema.sql.
-- ============================================================

insert into public.products
  (sku, name, description, category, plc, material, io_count, price_gbp_pence, stock_status, lead_time, sort_order)
values
  -- Siemens panels — Mild Steel
  ('AJS-SI-MS-8',  'Siemens 8 I/O Panel (Mild Steel)',  'Mild Steel Enclosure (IP66 NEMA 4), c/w Siemens PLC with 8 Digital Inputs',  'panel', 'Siemens', 'Mild Steel', 8,  147500, 'In Stock', '3–5 days',  10),
  ('AJS-SI-MS-16', 'Siemens 16 I/O Panel (Mild Steel)', 'Mild Steel Enclosure (IP66 NEMA 4), c/w Siemens PLC with 16 Digital Inputs', 'panel', 'Siemens', 'Mild Steel', 16, 172500, 'In Stock', '3–5 days',  11),
  ('AJS-SI-MS-24', 'Siemens 24 I/O Panel (Mild Steel)', 'Mild Steel Enclosure (IP66 NEMA 4), c/w Siemens PLC with 24 Digital Inputs', 'panel', 'Siemens', 'Mild Steel', 24, 192500, 'In Stock', '5–7 days',  12),
  -- Siemens panels — Stainless Steel
  ('AJS-SI-SS-8',  'Siemens 8 I/O Panel (Stainless)',   'Stainless Steel Enclosure (IP66 NEMA 4), c/w Siemens PLC with 8 Digital Inputs',  'panel', 'Siemens', 'Stainless Steel', 8,  175000, 'In Stock', '3–5 days',  20),
  ('AJS-SI-SS-16', 'Siemens 16 I/O Panel (Stainless)',  'Stainless Steel Enclosure (IP66 NEMA 4), c/w Siemens PLC with 16 Digital Inputs', 'panel', 'Siemens', 'Stainless Steel', 16, 202500, 'In Stock', '5–7 days',  21),
  ('AJS-SI-SS-24', 'Siemens 24 I/O Panel (Stainless)',  'Stainless Steel Enclosure (IP66 NEMA 4), c/w Siemens PLC with 24 Digital Inputs', 'panel', 'Siemens', 'Stainless Steel', 24, 220000, 'Limited Stock', '7–10 days', 22),
  -- Allen Bradley panels — Mild Steel
  ('AJS-AB-MS-8',  'Allen Bradley 8 I/O Panel (Mild Steel)',  'Mild Steel Enclosure (IP66 NEMA 4), c/w Allen Bradley PLC with 8 Digital Inputs',  'panel', 'Allen Bradley', 'Mild Steel', 8,  175000, 'In Stock', '3–5 days', 30),
  ('AJS-AB-MS-16', 'Allen Bradley 16 I/O Panel (Mild Steel)', 'Mild Steel Enclosure (IP66 NEMA 4), c/w Allen Bradley PLC with 16 Digital Inputs', 'panel', 'Allen Bradley', 'Mild Steel', 16, 192500, 'In Stock', '3–5 days', 31),
  ('AJS-AB-MS-24', 'Allen Bradley 24 I/O Panel (Mild Steel)', 'Mild Steel Enclosure (IP66 NEMA 4), c/w Allen Bradley PLC with 24 Digital Inputs', 'panel', 'Allen Bradley', 'Mild Steel', 24, 265000, 'Limited Stock', '5–7 days', 32),
  -- Allen Bradley panels — Stainless Steel
  ('AJS-AB-SS-8',  'Allen Bradley 8 I/O Panel (Stainless)',   'Stainless Steel Enclosure (IP66 NEMA 4), c/w Allen Bradley PLC with 8 Digital Inputs',  'panel', 'Allen Bradley', 'Stainless Steel', 8,  202500, 'In Stock', '5–7 days', 40),
  ('AJS-AB-SS-16', 'Allen Bradley 16 I/O Panel (Stainless)',  'Stainless Steel Enclosure (IP66 NEMA 4), c/w Allen Bradley PLC with 16 Digital Inputs', 'panel', 'Allen Bradley', 'Stainless Steel', 16, 222500, 'Limited Stock', '5–7 days', 41),
  ('AJS-AB-SS-24', 'Allen Bradley 24 I/O Panel (Stainless)',  'Stainless Steel Enclosure (IP66 NEMA 4), c/w Allen Bradley PLC with 24 Digital Inputs', 'panel', 'Allen Bradley', 'Stainless Steel', 24, 292500, 'On Order',     '7–10 days', 42),
  -- Add-ons
  ('AJS-KEPWARE',    'Kepware License',         'OPC server licence for PLC data acquisition. Required for cloud connectivity.', 'software',  null, null, null, 185000, 'In Stock', 'Instant',    50),
  ('AJS-RELAY',      'Relay Box',               'IP67 PVC Box c/w 24v DC Relay and 2 glands. For use with existing sensors.',   'accessory', null, null, null,  15000, 'In Stock', '1–2 days',   60),
  ('AJS-LRZ-SENSOR', 'Laser Sensor LRZ',        'LR-ZH490CB Laser Sensor, IP69, c/w 60m M12 control cable, flat and 90° brackets and fixings.', 'sensor', null, null, null,  47500, 'In Stock', '2–3 days', 70),
  ('AJS-PZV-SENSOR', 'Laser Sensor PZV',        '300mm range PZ-V33P Laser Sensor, IP67, c/w 60m M12 control cable, 90° bracket and fixings.',   'sensor', null, null, null,  40000, 'In Stock', '2–3 days', 71),
  ('AJS-4MM-SENSOR', '4mm Proximity Sensor',    '4mm range Proximity Sensor, IP67, M12 threaded body, c/w 60m M12 control cable, brackets.',     'sensor', null, null, null,  25000, 'In Stock', '1–2 days', 72),
  ('AJS-8MM-SENSOR', '8mm Proximity Sensor',    '8mm range Proximity Sensor, IP67, M18 threaded body, c/w 60m M12 control cable, brackets.',     'sensor', null, null, null,  25000, 'In Stock', '1–2 days', 73)
on conflict (sku) do update set
  name            = excluded.name,
  description     = excluded.description,
  category        = excluded.category,
  plc             = excluded.plc,
  material        = excluded.material,
  io_count        = excluded.io_count,
  price_gbp_pence = excluded.price_gbp_pence,
  stock_status    = excluded.stock_status,
  lead_time       = excluded.lead_time,
  sort_order      = excluded.sort_order,
  active          = true;
