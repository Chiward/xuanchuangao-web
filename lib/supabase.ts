import { createClient } from '@supabase/supabase-js';

// 需要在 .env.local 中配置以下环境变量
// NEXT_PUBLIC_SUPABASE_URL=your-project-url
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

let _client: any | null = null;

function getSupabaseClient() {
  if (_client) return _client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === "undefined") {
      return null;
    }
    throw new Error(
      "supabaseUrl is required. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel environment variables."
    );
  }

  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

export const supabase: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getSupabaseClient();
      if (!client) {
        throw new Error(
          "Supabase client is not available during server-side rendering. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured."
        );
      }
      return client[prop];
    },
  }
);
