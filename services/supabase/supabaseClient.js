/**
 * Supabase Client
 * Initializes the Supabase connection for all NGCC services.
 */

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
