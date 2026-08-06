/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Soft pre-launch gate only — visible in the client bundle. Empty = no gate. */
  readonly VITE_ACCESS_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
