// KV Store module for database operations
// Uses Supabase PostgreSQL with key-value pattern

import { createClient } from 'jsr:@supabase/supabase-js@2';

const getSupabaseClient = () => {
  // Current code expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
  // User has set SERVICE_URL_SUPABASEKONG and SERVICE_SUPABASESERVICE_KEY
  const url = Deno.env.get('SUPABASE_URL') || Deno.env.get('SERVICE_URL_SUPABASEKONG');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_SUPABASESERVICE_KEY');

  if (!url || !key) {
    console.error('KV MODULE: MISSING ENV VARS', { url: !!url, key: !!key });
  }

  return createClient(url || '', key || '');
};

const TABLE_NAME = 'kv_store_3cb71dae';

export async function set(key: string, value: any): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert({ key, value });

  if (error) {
    throw new Error(`KV set error: ${error.message}`);
  }
}

export async function get(key: string): Promise<any> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('value')
    .eq('key', key)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw new Error(`KV get error: ${error.message}`);
  }

  return data?.value || null;
}

export async function del(key: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('key', key);

  if (error) {
    throw new Error(`KV delete error: ${error.message}`);
  }
}

export async function getByPrefix(prefix: string): Promise<any[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('value')
    .like('key', `${prefix}%`);

  if (error) {
    throw new Error(`KV getByPrefix error: ${error.message}`);
  }

  return data?.map(row => row.value) || [];
}