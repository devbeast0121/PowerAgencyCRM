declare const __firebase_config: string;
declare const __app_id: string;
declare const __initial_auth_token: string;

interface ImportMetaEnv {
  readonly VITE_ZOOM_ACCOUNT_ID: string;
  readonly VITE_ZOOM_CLIENT_ID: string;
  readonly VITE_ZOOM_CLIENT_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
