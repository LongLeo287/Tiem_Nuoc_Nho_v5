/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL /exec của Google Apps Script. Để trống thì nhập tay trong Cài đặt. */
  readonly VITE_GAS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
