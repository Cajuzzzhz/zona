import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente do seu arquivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// O '!' no final diz ao TypeScript: "Confie em mim, essa variável existe."
export const supabase = createClient(supabaseUrl, supabaseKey);