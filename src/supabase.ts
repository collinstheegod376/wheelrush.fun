import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lekfrvhancoffkejearr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxla2ZydmhhbmNvZmZrZWplYXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMzg2NzAsImV4cCI6MjA5NDcxNDY3MH0.erWp64iHuXaBtgpwWYlqRCwroLte-JXEm8fOdxZvg08';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
