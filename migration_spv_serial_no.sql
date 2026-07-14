-- ==============================================================
-- CREATE TABLE public.solar_photovoltaic_test_reports
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.solar_photovoltaic_test_reports (
  id bigserial not null,
  company_name text not null,
  pump_manufacturer text null,
  year text null,
  test_report_no text null,
  type text null,
  total_modules text null,
  module text null,
  hp text null,
  file_url text null,
  file_size text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  serial_no text null,
  constraint solar_photovoltaic_test_reports_pkey primary key (id),
  constraint solar_photovoltaic_test_reports_serial_no_key unique (serial_no)
) TABLESPACE pg_default;


