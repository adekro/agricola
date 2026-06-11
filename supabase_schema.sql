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
  owner_id UUID -- Mandatory for linking to authenticated users
);

-- Set up Row Level Security (RLS)
ALTER TABLE farmlands ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to read their own farmlands
CREATE POLICY "Allow users to read their own farmlands" ON farmlands
  FOR SELECT USING (auth.uid() = owner_id);

-- Policy: Allow users to insert their own farmlands
CREATE POLICY "Allow users to insert their own farmlands" ON farmlands
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Policy: Allow users to update their own farmlands
CREATE POLICY "Allow users to update their own farmlands" ON farmlands
  FOR UPDATE USING (auth.uid() = owner_id);

-- Policy: Allow users to delete their own farmlands
CREATE POLICY "Allow users to delete their own farmlands" ON farmlands
  FOR DELETE USING (auth.uid() = owner_id);
