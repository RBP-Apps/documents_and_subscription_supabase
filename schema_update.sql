-- ==============================================================
-- SQL Schema Update for HLS Test Reports Table (Supabase)
-- ==============================================================

-- Option A: If you are creating the table for the first time
CREATE TABLE IF NOT EXISTS public.hls_test_reports (
    id BIGSERIAL PRIMARY KEY,
    serial_no TEXT,
    state TEXT NOT NULL,
    date DATE NOT NULL,
    department TEXT NOT NULL,
    scheme TEXT NOT NULL,
    company_name TEXT NOT NULL,
    hls_type TEXT NOT NULL,
    status TEXT NOT NULL,
    file_url TEXT,
    file_size TEXT,
    manufacturer TEXT,
    lab_name TEXT,
    testing_start_date DATE,
    testing_end_date DATE,
    no_of_samples INTEGER,
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Option B: If the table already exists and you want to add the new columns
ALTER TABLE public.hls_test_reports 
ADD COLUMN IF NOT EXISTS file_size TEXT,
ADD COLUMN IF NOT EXISTS manufacturer TEXT,
ADD COLUMN IF NOT EXISTS lab_name TEXT,
ADD COLUMN IF NOT EXISTS testing_start_date DATE,
ADD COLUMN IF NOT EXISTS testing_end_date DATE,
ADD COLUMN IF NOT EXISTS no_of_samples INTEGER,
ADD COLUMN IF NOT EXISTS model TEXT;


-- ==============================================================
-- SQL Schema Update for Pump Experience Certificates Table
-- ==============================================================

-- Option A: If you are creating the table for the first time
CREATE TABLE IF NOT EXISTS public.pump_experience_certificates (
    id BIGSERIAL PRIMARY KEY,
    serial_no TEXT,
    client_name TEXT NOT NULL,
    work_order_no TEXT NOT NULL,
    issue_date DATE NOT NULL,
    work_name TEXT NOT NULL,
    pump_capacity TEXT NOT NULL,
    value TEXT NOT NULL,
    file_url TEXT,
    company_name TEXT,
    scheme TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Option B: If the table already exists and you want to add the new columns
ALTER TABLE public.pump_experience_certificates 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS scheme TEXT,
ADD COLUMN IF NOT EXISTS department TEXT;
