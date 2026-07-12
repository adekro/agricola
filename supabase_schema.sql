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

ALTER TABLE farmlands ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE farmlands ADD COLUMN IF NOT EXISTS geometry JSONB;
UPDATE farmlands
SET name = COALESCE(NULLIF(TRIM(type), ''), NULLIF(TRIM(cadastral_parcel), ''), 'Terreno')
WHERE name IS NULL OR TRIM(name) = '';
ALTER TABLE farmlands ALTER COLUMN name SET NOT NULL;

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

-- Create the company_contacts table
CREATE TABLE IF NOT EXISTS company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('owner', 'technician', 'operator', 'supplier', 'client', 'cooperative', 'consortium')),
  name TEXT NOT NULL,
  role_label TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_primary BOOLEAN DEFAULT false
);

ALTER TABLE farmlands ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_company_contacts_company_id
  ON company_contacts (company_id);

CREATE INDEX IF NOT EXISTS idx_company_contacts_category
  ON company_contacts (category);

ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own company contacts" ON company_contacts;
CREATE POLICY "Allow users to manage their own company contacts" ON company_contacts
  FOR ALL USING (auth.uid() = owner_id);

-- Create the company_documents table
CREATE TABLE IF NOT EXISTS company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  document_type TEXT,
  reference_number TEXT,
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_company_documents_company_id
  ON company_documents (company_id);

ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own company documents" ON company_documents;
CREATE POLICY "Allow users to manage their own company documents" ON company_documents
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
  minimum_stock NUMERIC,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL
);

ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS minimum_stock NUMERIC;

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
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  crop TEXT,
  operator TEXT,
  product_id UUID REFERENCES inventory_products(id) ON DELETE SET NULL,
  inventory_batch_id UUID,
  quantity NUMERIC,
  unit_of_measure TEXT,
  machinery TEXT,
  notes TEXT,
  weather_conditions TEXT,
  withholding_period INTEGER, -- In days (for treatments)
  dose_per_hectare NUMERIC,
  fertilization_plan_id UUID,
  attachment_url TEXT,
  owner_id UUID NOT NULL
);

ALTER TABLE operations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS inventory_batch_id UUID;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS fertilization_plan_id UUID;

CREATE TABLE IF NOT EXISTS harvests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  harvest_date DATE NOT NULL,
  farmland_id UUID NOT NULL REFERENCES farmlands(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  crop TEXT NOT NULL,
  notes TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_harvests_company_id
  ON harvests (company_id);

CREATE INDEX IF NOT EXISTS idx_harvests_farmland_id
  ON harvests (farmland_id);

ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own harvests" ON harvests;
CREATE POLICY "Allow users to manage their own harvests" ON harvests
  FOR ALL USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS harvest_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  harvest_id UUID NOT NULL REFERENCES harvests(id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_of_measure TEXT,
  quality TEXT NOT NULL,
  notes TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_harvest_batches_harvest_id
  ON harvest_batches (harvest_id);

ALTER TABLE harvest_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own harvest batches" ON harvest_batches;
CREATE POLICY "Allow users to manage their own harvest batches" ON harvest_batches
  FOR ALL USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS harvest_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  harvest_batch_id UUID NOT NULL REFERENCES harvest_batches(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES company_contacts(id) ON DELETE RESTRICT,
  quantity NUMERIC NOT NULL,
  destination_type TEXT,
  notes TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_harvest_destinations_batch_id
  ON harvest_destinations (harvest_batch_id);

ALTER TABLE harvest_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own harvest destinations" ON harvest_destinations;
CREATE POLICY "Allow users to manage their own harvest destinations" ON harvest_destinations
  FOR ALL USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS fertilization_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  farmland_id UUID NOT NULL REFERENCES farmlands(id) ON DELETE CASCADE,
  recommended_date DATE,
  product_category TEXT CHECK (product_category IN ('Concime', 'Biostimolante', 'Altro')),
  target_n NUMERIC,
  target_p NUMERIC,
  target_k NUMERIC,
  organic_matter NUMERIC,
  notes TEXT,
  owner_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  purchase_date DATE,
  expiry_date DATE,
  initial_quantity NUMERIC DEFAULT 0,
  unit_of_measure TEXT,
  notes TEXT,
  owner_id UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  inventory_batch_id UUID NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('load', 'unload', 'adjustment')),
  quantity NUMERIC NOT NULL,
  movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  notes TEXT,
  owner_id UUID NOT NULL
);

ALTER TABLE operations
  DROP CONSTRAINT IF EXISTS operations_inventory_batch_id_fkey;
ALTER TABLE operations
  ADD CONSTRAINT operations_inventory_batch_id_fkey
  FOREIGN KEY (inventory_batch_id) REFERENCES inventory_batches(id) ON DELETE SET NULL;

ALTER TABLE operations
  DROP CONSTRAINT IF EXISTS operations_fertilization_plan_id_fkey;
ALTER TABLE operations
  ADD CONSTRAINT operations_fertilization_plan_id_fkey
  FOREIGN KEY (fertilization_plan_id) REFERENCES fertilization_plans(id) ON DELETE SET NULL;

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

ALTER TABLE crop_history ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE crop_history ADD COLUMN IF NOT EXISTS import_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS crop_history_import_key_uidx
  ON crop_history(import_key) WHERE import_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS cadastral_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  province TEXT NOT NULL DEFAULT '',
  municipality TEXT NOT NULL,
  sheet TEXT NOT NULL,
  parcel TEXT NOT NULL,
  subaltern TEXT NOT NULL DEFAULT '',
  UNIQUE (province, municipality, sheet, parcel, subaltern)
);

CREATE TABLE IF NOT EXISTS farmland_cadastral_identifiers (
  farmland_id UUID NOT NULL REFERENCES farmlands(id) ON DELETE CASCADE,
  cadastral_identifier_id UUID NOT NULL REFERENCES cadastral_identifiers(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  PRIMARY KEY (farmland_id, cadastral_identifier_id)
);

CREATE TABLE IF NOT EXISTS farmland_annual_sau (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  farmland_id UUID NOT NULL REFERENCES farmlands(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year BETWEEN 1900 AND 2200),
  sau NUMERIC NOT NULL CHECK (sau >= 0),
  owner_id UUID NOT NULL,
  UNIQUE (farmland_id, year)
);

ALTER TABLE cadastral_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmland_cadastral_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmland_annual_sau ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read cadastral identifiers" ON cadastral_identifiers;
CREATE POLICY "Allow authenticated users to read cadastral identifiers" ON cadastral_identifiers
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to create cadastral identifiers" ON cadastral_identifiers;
CREATE POLICY "Allow authenticated users to create cadastral identifiers" ON cadastral_identifiers
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to manage farmland cadastral links" ON farmland_cadastral_identifiers;
CREATE POLICY "Allow users to manage farmland cadastral links" ON farmland_cadastral_identifiers
  FOR ALL
  USING (
    auth.uid() = owner_id AND EXISTS (
      SELECT 1 FROM farmlands
      WHERE farmlands.id = farmland_id AND farmlands.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = owner_id AND EXISTS (
      SELECT 1 FROM farmlands
      WHERE farmlands.id = farmland_id AND farmlands.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Allow users to manage farmland annual SAU" ON farmland_annual_sau;
CREATE POLICY "Allow users to manage farmland annual SAU" ON farmland_annual_sau
  FOR ALL
  USING (
    auth.uid() = owner_id AND EXISTS (
      SELECT 1 FROM farmlands
      WHERE farmlands.id = farmland_id AND farmlands.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = owner_id AND EXISTS (
      SELECT 1 FROM farmlands
      WHERE farmlands.id = farmland_id AND farmlands.owner_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION import_cadastral_rows(import_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  target_company companies%ROWTYPE;
  row_data JSONB;
  assignment JSONB;
  cadastral_id UUID;
  target_farmland_id UUID;
  new_name TEXT;
  polygon JSONB;
  link_exists BOOLEAN;
  imported_crops INTEGER := 0;
  created_farmlands INTEGER := 0;
  sau_totals JSONB := '{}'::JSONB;
  sau_entry RECORD;
  created_current BOOLEAN;
  campaign_year INTEGER := (import_payload->>'campaignYear')::INTEGER;
BEGIN
  SELECT * INTO target_company
  FROM companies
  WHERE id = (import_payload->>'companyId')::UUID AND owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Azienda non valida o non autorizzata'; END IF;

  FOR row_data IN SELECT value FROM jsonb_array_elements(import_payload->'rows') LOOP
    created_current := FALSE;
    assignment := row_data->'assignment';
    IF assignment IS NULL OR NOT COALESCE((row_data->>'valid')::BOOLEAN, FALSE) THEN
      RAISE EXCEPTION 'Riga non valida o non assegnata';
    END IF;

    IF assignment->>'type' = 'existing' THEN
      target_farmland_id := (assignment->>'farmlandId')::UUID;
      IF NOT EXISTS (SELECT 1 FROM farmlands WHERE id = target_farmland_id AND owner_id = auth.uid() AND (company_id = target_company.id OR owner_display_name = target_company.name)) THEN
        RAISE EXCEPTION 'Terreno non autorizzato';
      END IF;
    ELSE
      new_name := TRIM(assignment->>'name');
      IF new_name = '' THEN RAISE EXCEPTION 'Nome terreno mancante'; END IF;
      SELECT id INTO target_farmland_id FROM farmlands
      WHERE owner_id = auth.uid() AND company_id = target_company.id AND name = new_name
      ORDER BY created_at LIMIT 1;
      IF target_farmland_id IS NULL THEN
        polygon := row_data->'polygon';
        INSERT INTO farmlands (name, type, area, owner_display_name, owner_id, company_id, coordinates, geometry)
        VALUES (new_name, 'Importato da catasto', (row_data->>'superficie')::NUMERIC, target_company.name, auth.uid(), target_company.id, polygon,
          jsonb_build_object('type', 'MultiPolygon', 'coordinates', jsonb_build_array(jsonb_build_array(polygon))))
        RETURNING id INTO target_farmland_id;
        created_farmlands := created_farmlands + 1;
        created_current := TRUE;
      END IF;
    END IF;

    SELECT id INTO cadastral_id FROM cadastral_identifiers
    WHERE province = COALESCE(row_data->>'provincia','')
      AND municipality = row_data->>'comune'
      AND sheet = row_data->>'foglio'
      AND parcel = row_data->>'mappale'
      AND subaltern = '';
    IF cadastral_id IS NULL THEN
      INSERT INTO cadastral_identifiers (province, municipality, sheet, parcel, subaltern)
      VALUES (COALESCE(row_data->>'provincia',''), row_data->>'comune', row_data->>'foglio', row_data->>'mappale', '')
      RETURNING id INTO cadastral_id;
    END IF;

    SELECT EXISTS (SELECT 1 FROM farmland_cadastral_identifiers WHERE farmland_id = target_farmland_id AND cadastral_identifier_id = cadastral_id) INTO link_exists;
    INSERT INTO farmland_cadastral_identifiers (farmland_id, cadastral_identifier_id, owner_id)
    VALUES (target_farmland_id, cadastral_id, auth.uid()) ON CONFLICT DO NOTHING;

    IF assignment->>'type' = 'new' AND NOT link_exists AND NOT created_current THEN
      UPDATE farmlands SET geometry = CASE
        WHEN geometry IS NULL THEN jsonb_build_object('type','MultiPolygon','coordinates',jsonb_build_array(jsonb_build_array(row_data->'polygon')))
        ELSE jsonb_set(geometry, '{coordinates}', (geometry->'coordinates') || jsonb_build_array(jsonb_build_array(row_data->'polygon')))
      END WHERE id = target_farmland_id;
    END IF;

    INSERT INTO crop_history (farmland_id, company_id, crop, agea_code, agea_label, area, year, foglio, mappale, owner_id, import_key)
    VALUES (target_farmland_id, target_company.id, row_data->>'crop', row_data->>'ageaCode', row_data->>'crop', (row_data->>'superficie')::NUMERIC,
      campaign_year, row_data->>'foglio', row_data->>'mappale', auth.uid(),
      target_company.id::TEXT || '|' || campaign_year || '|' || row_data->>'rowKey')
    ON CONFLICT (import_key) WHERE import_key IS NOT NULL DO UPDATE
      SET farmland_id = EXCLUDED.farmland_id, crop = EXCLUDED.crop, agea_code = EXCLUDED.agea_code, agea_label = EXCLUDED.agea_label, area = EXCLUDED.area;
    imported_crops := imported_crops + 1;
    sau_totals := jsonb_set(sau_totals, ARRAY[target_farmland_id::TEXT],
      to_jsonb(COALESCE((sau_totals->>target_farmland_id::TEXT)::NUMERIC, 0) + (row_data->>'superficie')::NUMERIC));
  END LOOP;

  FOR sau_entry IN SELECT key, value FROM jsonb_each_text(sau_totals) LOOP
    INSERT INTO farmland_annual_sau (farmland_id, year, sau, owner_id)
    VALUES (sau_entry.key::UUID, campaign_year, sau_entry.value::NUMERIC, auth.uid())
    ON CONFLICT (farmland_id, year) DO UPDATE SET sau = EXCLUDED.sau;
    UPDATE farmlands SET area = sau_entry.value::NUMERIC WHERE id = sau_entry.key::UUID;
  END LOOP;
  RETURN jsonb_build_object('farmlands', created_farmlands, 'crops', imported_crops);
END;
$$;

-- Create the soil_analysis_history table
CREATE TABLE IF NOT EXISTS soil_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  farmland_id UUID NOT NULL REFERENCES farmlands(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  texture TEXT,
  ph NUMERIC,
  organic_matter NUMERIC,
  nitrogen NUMERIC,
  phosphorus NUMERIC,
  potassium NUMERIC,
  notes TEXT,
  owner_id UUID NOT NULL
);

ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE soil_analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fertilization_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own crop history" ON crop_history;
CREATE POLICY "Allow users to manage their own crop history" ON crop_history
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Allow users to manage their own operations" ON operations;
CREATE POLICY "Allow users to manage their own operations" ON operations
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Allow users to manage their own soil analysis history" ON soil_analysis_history;
CREATE POLICY "Allow users to manage their own soil analysis history" ON soil_analysis_history
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Allow users to manage their own fertilization plans" ON fertilization_plans;
CREATE POLICY "Allow users to manage their own fertilization plans" ON fertilization_plans
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Allow users to manage their own inventory batches" ON inventory_batches;
CREATE POLICY "Allow users to manage their own inventory batches" ON inventory_batches
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Allow users to manage their own inventory movements" ON inventory_movements;
CREATE POLICY "Allow users to manage their own inventory movements" ON inventory_movements
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
