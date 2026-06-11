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
  owner_id UUID -- Optional: for linking to a users table if needed
);

-- Set up Row Level Security (RLS)
-- For now, we'll allow public access for demonstration, but in a real app,
-- you'd restrict this to authenticated users.
ALTER TABLE farmlands ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read farmlands (change to authenticated as needed)
CREATE POLICY "Allow public read access" ON farmlands
  FOR SELECT USING (true);

-- Policy: Allow anyone to insert farmlands (change to authenticated as needed)
CREATE POLICY "Allow public insert access" ON farmlands
  FOR INSERT WITH CHECK (true);

-- Policy: Allow anyone to update farmlands (change to authenticated as needed)
CREATE POLICY "Allow public update access" ON farmlands
  FOR UPDATE USING (true);

-- Policy: Allow anyone to delete farmlands (change to authenticated as needed)
CREATE POLICY "Allow public delete access" ON farmlands
  FOR DELETE USING (true);
