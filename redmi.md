create table public."APPROVAL" (
  id bigserial not null,
  timestamp timestamp without time zone null default now(),
  approval_no text null,
  subscription_no text null,
  approved_by text null,
  approval_status text null,
  note text null,
  created_at timestamp without time zone null default now(),
  constraint APPROVAL_pkey primary key (id)
) TABLESPACE pg_default;

create table public."Add New Document" (
  id bigserial not null,
  timestamp timestamp without time zone null default now(),
  serial_no text null,
  document_name text null,
  document_type text null,
  category text null,
  name text null,
  need_renewal boolean null default false,
  renewal_date date null,
  image text null,
  is_deleted boolean null default false,
  planned_date date null,
  actual_1 date null,
  issue_date date null,
  concern_person_name text null,
  concern_person_mobile text null,
  concern_person_department text null,
  company_name text null,
  created_at timestamp without time zone null default now(),
  constraint
  add New Document_pkey primary key (id)
) TABLESPACE pg_default;




create table public."create_subscription" (
  id bigserial primary key,
  
  timestamp timestamp without time zone default now(),
  
  serial_no text,
  
  company_name text,
  subscriber_name text,
  subscription_name text,
  
  price numeric,
  frequency text,
  purpose text,
  
  -- Renewal Section
  planned_1 date,
  actual_1 date,
  time_delay_1 integer,
  renewal_status text,
  renewal_count integer default 0,
  
  -- Approval Section
  planned_2 date,
  actual_2 date,
  time_delay_2 integer,
  approval_status text,
  
  -- Payment Section
  planned_3 date,
  actual_3 date,
  time_delay_3 integer,
  
  start_date date,
  end_date date,
  
  document_copy text,
  
  updated_price numeric,
  
  created_at timestamp without time zone default now()
);



create table public."Document Renewal" (
  id bigserial not null,
  timestamp timestamp without time zone null default now(),
  serial_no text null,
  last_renewal_date date null,
  old_image text null,
  need_renewal boolean null default false,
  new_renewal_date date null,
  new_image text null,
  created_at timestamp without time zone null default now(),
  constraint Document Renewal_pkey primary key (id)
) TABLESPACE pg_default;

create table public."loan" (
  id bigserial primary key,
  
  timestamp timestamp without time zone default now(),
  
  serial_no text,
  
  loan_name text,
  bank_name text,
  
  amount numeric,
  emi numeric,
  
  loan_start_date date,
  loan_end_date date,
  
  provided_document_name text,
  file text,
  
  remarks text,
  
  -- Loan Close Request Section
  planned_1 date,
  actual_1 date,
  delay_1 integer,
  
  request_date date,
  request_name text,
  
  -- NOC Collect Section
  planned_2 date,
  actual_2 date,
  delay_2 integer,
  
  collect_noc text,
  
  created_at timestamp without time zone default now()
);


create table public."PAYMENT" (
  id bigserial not null,
  timestamp timestamp without time zone null default now(),
  subscription_no text null,
  payment_mode text null,
  transaction_id text null,
  start_date date null,
  end_date date null,
  insurance_document text null,
  updated_price numeric null,
  old_price numeric null,
  created_at timestamp without time zone null default now(),
  constraint PAYMENT_pkey primary key (id)
) TABLESPACE pg_default;





create table public."RENEWAL" (
  id bigserial not null,
  timestamp timestamp without time zone null default now(),
  renewal_no text null,
  subscription_no text null,
  approved_by text null,
  status text null,
  created_at timestamp without time zone null default now(),
  constraint RENEWAL_pkey primary key (id)
) TABLESPACE pg_default;




create table public."Shared_Documents" (
  id bigserial not null,
  timestamp timestamp without time zone null default now(),
  email text null,
  name text null,
  document_name text null,
  document_type text null,
  category text null,
  serial_no text null,
  image text null,
  source_sheet text null,
  share_method text null,
  number text null,
  created_at timestamp without time zone null default now(),
  constraint Shared_Documents_pkey primary key (id)
) TABLESPACE pg_default;


create table public.master (
  id bigserial not null,
  document_type text null,
  category text null,
  renewal_filter text null,
  director_name text null,
  company_name text null,
  created_at timestamp without time zone null default now(),
  constraint master_pkey primary key (id)
) TABLESPACE pg_default;



create table public.login (
  id bigserial primary key,
  
  name text,
  username text,
  password text,
  
  role text,
  pages text,
  
  deleted boolean default false,
  
  created_at timestamp without time zone default now()
);


create table public."BG" (
  id bigserial primary key,
  
  timestamp timestamp without time zone default now(),
  
  serial_no text,
  
  bg_name text,
  bg_no text,
  
  bank_name text,
  
  amount numeric,
  
  bg_start_date date,
  expiry_date date,
  claim_expiry_date date,
  
  remarks text,
  file text,
  
  created_at timestamp without time zone default now()
);




