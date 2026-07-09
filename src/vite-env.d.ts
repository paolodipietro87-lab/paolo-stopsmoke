/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OAuth Client ID di Google. Assente = backup Drive disattivato. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
