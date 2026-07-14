-- ==============================================================
-- CREATE TABLE public.pv_module_test_reports
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.pv_module_test_reports (
  id bigserial not null,
  company_name text not null,
  module_manufacturer text null,
  year text null,
  test_report_no text null,
  type text null,
  number_of_sample bigint null,
  model text null,
  file_url text null,
  file_size text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  serial_no text null,
  constraint pv_module_test_reports_pkey primary key (id),
  constraint pv_module_test_reports_serial_no_key unique (serial_no)
) TABLESPACE pg_default;


-- ==============================================================
-- CREATE TABLE public.pv_water_pumping_test_reports
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.pv_water_pumping_test_reports (
  id bigserial not null,
  company_name text not null,
  module_manufacture text null,
  year text null,
  test_report_no text null,
  type text null,
  hp_pv_panel text null,
  model text null,
  spv_module_capacity text null,
  compatibility_report text null,
  date date null,
  file_url text null,
  file_size text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  serial_no text null,
  constraint pv_water_pumping_test_reports_pkey primary key (id),
  constraint pv_water_pumping_test_reports_serial_no_key unique (serial_no)
) TABLESPACE pg_default;


-- ==============================================================
-- ALTER TABLE OPTION (For existing databases)
-- ==============================================================

-- -- 1. For pv_module_test_reports:
-- ALTER TABLE public.pv_module_test_reports ADD COLUMN IF NOT EXISTS serial_no TEXT;
-- WITH numbered_reports AS (
--   SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as row_num
--   FROM public.pv_module_test_reports
-- )
-- UPDATE public.pv_module_test_reports r
-- SET serial_no = 'PVM-' || LPAD(nr.row_num::text, 3, '0')
-- FROM numbered_reports nr
-- WHERE r.id = nr.id AND r.serial_no IS NULL;
-- ALTER TABLE public.pv_module_test_reports ADD CONSTRAINT pv_module_test_reports_serial_no_key UNIQUE (serial_no);

-- -- 2. For pv_water_pumping_test_reports:
-- ALTER TABLE public.pv_water_pumping_test_reports ADD COLUMN IF NOT EXISTS serial_no TEXT;
-- WITH numbered_reports AS (
--   SELECT id, ROW_NUMBER() OVER (ORDER BY id ASC) as row_num
--   FROM public.pv_water_pumping_test_reports
-- )
-- UPDATE public.pv_water_pumping_test_reports r
-- SET serial_no = 'PWP-' || LPAD(nr.row_num::text, 3, '0')
-- FROM numbered_reports nr
-- WHERE r.id = nr.id AND r.serial_no IS NULL;
-- ALTER TABLE public.pv_water_pumping_test_reports ADD CONSTRAINT pv_water_pumping_test_reports_serial_no_key UNIQUE (serial_no);
