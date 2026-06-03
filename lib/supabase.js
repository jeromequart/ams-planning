import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kctgwnvifmoendwmtipr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjdGd3bnZpZm1vZW5kd210aXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0ODcxNjcsImV4cCI6MjA5NjA2MzE2N30._mvQngwM-sYRxJVcCCBp192JiY8GpBQD2nlNef4Ymsg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
