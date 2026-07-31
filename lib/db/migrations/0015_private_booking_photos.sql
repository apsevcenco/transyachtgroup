-- Booking/handover photos contain personal data and must never use a public bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'booking_private',
  'booking_private',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- No anon/authenticated policies are intentionally created. Only the API's
-- service-role client may upload or sign these objects.

-- Remove legacy browser-write policies for the public catalog bucket. Public
-- reads remain available because the bucket itself is public; writes now pass
-- only through the authenticated API and its service-role client.
DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
      AND (COALESCE(qual, '') || COALESCE(with_check, '')) ILIKE '%vehicle_images%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_row.policyname);
  END LOOP;
END $$;
