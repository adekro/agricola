-- Create the farmlands table
CREATE TABLE IF NOT EXISTS farmlands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT,
  area NUMERIC,
  perimeter NUMERIC,
  notes TEXT,
  location TEXT,
  owner_display_name TEXT,
  coordinates JSONB,
  owner_id UUID, -- Mandatory for linking to authenticated users
  cadastral_parcel TEXT,
  current_crop TEXT
);

-- Set up Row Level Security (RLS) for farmlands
ALTER TABLE farmlands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read their own farmlands" ON farmlands;
CREATE POLICY "Allow users to read their own farmlands" ON farmlands
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Allow users to insert their own farmlands" ON farmlands;
CREATE POLICY "Allow users to insert their own farmlands" ON farmlands
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Allow users to update their own farmlands" ON farmlands;
CREATE POLICY "Allow users to update their own farmlands" ON farmlands
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Allow users to delete their own farmlands" ON farmlands;
CREATE POLICY "Allow users to delete their own farmlands" ON farmlands
  FOR DELETE USING (auth.uid() = owner_id);

-- Create the companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  vat_number TEXT,
  owner_name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  authorized_operators TEXT[],
  owner_id UUID NOT NULL,
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES auth.users (id)
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own companies" ON companies;
CREATE POLICY "Allow users to manage their own companies" ON companies
  FOR ALL USING (auth.uid() = owner_id);

-- Create the inventory_products table
CREATE TABLE IF NOT EXISTS inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('Fitosanitario', 'Concime', 'Biostimolante', 'Altro')),
  supplier TEXT,
  batch_number TEXT,
  purchase_date DATE,
  expiry_date DATE,
  active_ingredient TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL
);

ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own products" ON inventory_products;
CREATE POLICY "Allow users to manage their own products" ON inventory_products
  FOR ALL USING (auth.uid() = owner_id);

-- Create the operations table
CREATE TABLE IF NOT EXISTS operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  operation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT CHECK (type IN ('Semina', 'Trapianto', 'Concimazione', 'Irrigazione', 'Trattamento fitosanitario', 'Diserbo', 'Potatura', 'Lavorazione del terreno', 'Raccolta', 'Altro')),
  farmland_id UUID REFERENCES farmlands(id) ON DELETE CASCADE,
  crop TEXT,
  operator TEXT,
  product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
  quantity NUMERIC,
  unit_of_measure TEXT,
  machinery TEXT,
  notes TEXT,
  weather_conditions TEXT,
  withholding_period INTEGER, -- In days (for treatments)
  dose_per_hectare NUMERIC,
  attachment_url TEXT,
  owner_id UUID NOT NULL
);

-- Create the crop_history table
CREATE TABLE IF NOT EXISTS crop_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  farmland_id UUID REFERENCES farmlands(id) ON DELETE CASCADE,
  crop TEXT NOT NULL,
  agea_code TEXT,
  agea_label TEXT,
  area NUMERIC,
  month INTEGER,
  year INTEGER,
  foglio TEXT,
  mappale TEXT,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  owner_id UUID NOT NULL
);

ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own crop history" ON crop_history;
CREATE POLICY "Allow users to manage their own crop history" ON crop_history
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Allow users to manage their own operations" ON operations;
CREATE POLICY "Allow users to manage their own operations" ON operations
  FOR ALL USING (auth.uid() = owner_id);

-- Shared cadastral sheets dataset populated by an external updater.
CREATE TABLE IF NOT EXISTS cadastral_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  admin_code TEXT NOT NULL,
  comune TEXT NOT NULL,
  foglio TEXT NOT NULL,
  label TEXT NOT NULL,
  inspire_id TEXT,
  national_reference TEXT,
  bbox_4326 JSONB NOT NULL,
  polygon_4326 JSONB NOT NULL,
  source_updated_at TIMESTAMP WITH TIME ZONE,
  raw_begin_lifespan_version TEXT,
  UNIQUE (admin_code, foglio)
);

CREATE INDEX IF NOT EXISTS idx_cadastral_sheets_lookup
  ON cadastral_sheets (admin_code, foglio);

ALTER TABLE cadastral_sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read access to cadastral sheets" ON cadastral_sheets;
CREATE POLICY "Allow anonymous read access to cadastral sheets" ON cadastral_sheets
  FOR SELECT USING (true);

-- Shared cadastral parcels dataset populated by an external updater.
CREATE TABLE IF NOT EXISTS cadastral_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  admin_code TEXT NOT NULL,
  comune TEXT NOT NULL,
  foglio TEXT NOT NULL,
  mappale TEXT NOT NULL,
  label TEXT NOT NULL,
  inspire_id TEXT,
  national_reference TEXT,
  bbox_4326 JSONB NOT NULL,
  polygon_4326 JSONB NOT NULL,
  source_updated_at TIMESTAMP WITH TIME ZONE,
  raw_begin_lifespan_version TEXT,
  UNIQUE (admin_code, foglio, mappale)
);

CREATE INDEX IF NOT EXISTS idx_cadastral_parcels_lookup
  ON cadastral_parcels (admin_code, foglio, mappale);

CREATE INDEX IF NOT EXISTS idx_cadastral_parcels_comune_lookup
  ON cadastral_parcels (comune, foglio, mappale);

ALTER TABLE cadastral_parcels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read access to cadastral parcels" ON cadastral_parcels;
CREATE POLICY "Allow anonymous read access to cadastral parcels" ON cadastral_parcels
  FOR SELECT USING (true);
