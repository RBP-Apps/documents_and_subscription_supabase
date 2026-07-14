-- ==============================================================
-- CREATE TABLE public.hls_test_reports
-- ==============================================================
CREATE TABLE IF NOT EXISTS public.hls_test_reports (
  id bigserial not null,
  company_name text not null,
  date date null,
  report_no text null,
  test_description text null,
  pv_panel text null,
  battery text null,
  file_url text null,
  file_size text null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  serial_no text null,
  module_manufacturer text null,
  constraint hls_test_reports_pkey primary key (id),
  constraint hls_test_reports_serial_no_key unique (serial_no)
) TABLESPACE pg_default;

