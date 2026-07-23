-- Adds booking_photos (jsonb array of Supabase storage URLs) to bookings
-- and rental_history, mirroring vehicles.images. Uploaded under the
-- existing "vehicle_images" bucket, prefixed "booking-photos/{bookingId}/"
-- to keep them separate from vehicle catalog photos.

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_photos" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "booking_photos" jsonb DEFAULT '[]'::jsonb;
