-- ==============================================================
-- SQL Schema Update for HLS Test Reports Table (Supabase)
-- ==============================================================

-- Drop the existing table and recreate it with the new fields
DROP TABLE IF EXISTS public.hls_test_reports;

CREATE TABLE public.hls_test_reports (
    id BIGSERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    date DATE NULL,
    report_no TEXT NULL,
    test_description TEXT NULL,
    pv_panel TEXT NULL,
    battery TEXT NULL,
    file_url TEXT NULL,
    file_size TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);



-- ==============================================================
-- SQL Schema Update for Pump Experience Certificates Table
-- ==============================================================

-- Option A: If you are creating the table for the first time
CREATE TABLE IF NOT EXISTS public.pump_experience_certificates (
    id BIGSERIAL PRIMARY KEY,
    serial_no TEXT,
    client_name TEXT NULL,
    work_order_no TEXT NULL,
    issue_date DATE NULL,
    work_name TEXT NULL,
    pump_capacity TEXT NULL,
    value TEXT NULL,
    file_url TEXT,
    company_name TEXT,
    scheme TEXT,
    department TEXT,
    year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Option B: If the table already exists and you want to alter it to drop NOT NULL constraints
ALTER TABLE public.pump_experience_certificates 
    ALTER COLUMN client_name DROP NOT NULL,
    ALTER COLUMN work_order_no DROP NOT NULL,
    ALTER COLUMN issue_date DROP NOT NULL,
    ALTER COLUMN work_name DROP NOT NULL,
    ALTER COLUMN pump_capacity DROP NOT NULL,
    ALTER COLUMN value DROP NOT NULL;

-- Add new columns if they do not exist
ALTER TABLE public.pump_experience_certificates 
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS scheme TEXT,
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS year TEXT;

-- ==============================================================
-- SQL Schema for PV Module Test Reports Table
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.pv_module_test_reports (
    id BIGSERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    module_manufacturer TEXT NULL,
    year TEXT NULL,
    test_report_no TEXT NULL,
    type TEXT NULL,
    number_of_sample INTEGER NULL,
    model TEXT NULL,
    file_url TEXT NULL,
    file_size TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================
-- SQL Schema for PV Water Pumping Test Reports Table
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.pv_water_pumping_test_reports (
    id BIGSERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    module_manufacture TEXT NULL,
    year TEXT NULL,
    test_report_no TEXT NULL,
    type TEXT NULL,
    hp_pv_panel TEXT NULL,
    model TEXT NULL,
    spv_module_capacity TEXT NULL,
    compatibility_report TEXT NULL,
    date DATE NULL,
    file_url TEXT NULL,
    file_size TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================
-- SQL Schema for Solar Photovoltaic Test Reports Table
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.solar_photovoltaic_test_reports (
    id BIGSERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    pump_manufacturer TEXT NULL,
    year TEXT NULL,
    test_report_no TEXT NULL,
    type TEXT NULL,
    total_modules TEXT NULL,
    module TEXT NULL,
    hp TEXT NULL,
    file_url TEXT NULL,
    file_size TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
