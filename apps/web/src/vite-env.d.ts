/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DASHBOARD_DATA_SOURCE?: 'mock' | 'api';
  readonly VITE_BOOKS_DATA_SOURCE?: 'mock' | 'api';
  readonly VITE_LOANS_DATA_SOURCE?: 'mock' | 'api';
}
