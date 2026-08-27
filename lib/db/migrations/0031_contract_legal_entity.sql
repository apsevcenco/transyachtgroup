ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS renter_legal_entity TEXT;

COMMENT ON COLUMN contracts.renter_legal_entity IS
  'Optional legal entity/company name when a vehicle rental contract is made for a business.';
