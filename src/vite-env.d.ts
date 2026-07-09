/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** OAuth Client ID di Google. Assente = backup Drive disattivato. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Iniettata a build time: hash del commit + data. Vedi `define` in vite.config.ts. */
declare const __APP_VERSION__: string;
