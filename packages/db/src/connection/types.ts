export interface DatabaseConnectionInfo {
  url: string;
  source: 'DATABASE_URL' | 'DATABASE_URL_LOCAL' | 'DATABASE_URL_SUPABASE';
}
