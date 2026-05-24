import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'site-assets';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: existingBucket, error: getError } = await supabase.storage.getBucket(BUCKET_NAME);
  if (getError && getError.code !== '404') {
    console.error('Failed to check existing bucket:', getError.message || getError);
    process.exit(1);
  }

  if (existingBucket) {
    console.log(`Bucket '${BUCKET_NAME}' already exists.`);
    console.log('Make sure it is configured as public in the Supabase dashboard.');
    return;
  }

  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
  if (error) {
    console.error('Failed to create bucket:', error.message || error);
    process.exit(1);
  }

  console.log(`Created bucket '${BUCKET_NAME}' successfully.`);
  console.log('Public image uploads can now be stored in this bucket.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
