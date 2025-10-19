// src/dataStore.ts
import { supabase } from './supabaseClient';

const USER_EMAIL_KEY = 'userEmail';
const IS_LOGGED_IN_KEY = 'isLoggedIn';
const LOCAL_ENTRY_PREFIX = 'local-journal-entry-';

export function countWords(text: string): number {
   if (!text) return 0;
   return text.trim().split(/\s+/).filter(Boolean).length;
}

const dataStore = {
  async login(email: string): Promise<void> {
    localStorage.setItem(USER_EMAIL_KEY, email);
    localStorage.setItem(IS_LOGGED_IN_KEY, 'true');
  },

  async logout(): Promise<void> {
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(IS_LOGGED_IN_KEY);
  },

  async isLoggedIn(): Promise<boolean> {
    return !!localStorage.getItem(IS_LOGGED_IN_KEY);
  },

  async getEntry(dateKey: string): Promise<string | null> {
    const email = localStorage.getItem(USER_EMAIL_KEY);
    if (!email) return null;

    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('content')
        .eq('user_email', email)
        .eq('date_key', dateKey)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      const content = data?.content || '';
      // Cache locally
      localStorage.setItem(`${LOCAL_ENTRY_PREFIX}${dateKey}`, content);
      return content;
    } catch (error) {
      console.warn('Supabase offline, using local cache:', error);
      return localStorage.getItem(`${LOCAL_ENTRY_PREFIX}${dateKey}`) || '';
    }
  },

  async saveEntry(dateKey: string, content: string): Promise<void> {
    const email = localStorage.getItem(USER_EMAIL_KEY);
    if (!email) throw new Error('Not logged in');

    const word_count = countWords(content);

    // Save locally first
    localStorage.setItem(`${LOCAL_ENTRY_PREFIX}${dateKey}`, content);

    try {
      const { error } = await supabase
        .from('journal_entries')
        .upsert({
          user_email: email,
          date_key: dateKey,
          content,
          word_count,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_email,date_key' });

      if (error) throw error;
    } catch (error) {
      console.warn('Supabase offline, saved locally:', error);
    }
  },

  async getAllEntries(): Promise<Map<string, number>> {
    const email = localStorage.getItem(USER_EMAIL_KEY);
    const map = new Map<string, number>();
    if (!email) return map;

    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('date_key, word_count')
        .eq('user_email', email);

      if (error) throw error;

      (data || []).forEach((r: any) => {
        map.set(r.date_key, r.word_count);
      });

      // Merge local entries that aren't in Supabase
      const localKeys = Object.keys(localStorage).filter(key => key.startsWith(LOCAL_ENTRY_PREFIX));
      localKeys.forEach(key => {
        const dateKey = key.replace(LOCAL_ENTRY_PREFIX, '');
        if (!map.has(dateKey)) {
          const content = localStorage.getItem(key) || '';
          const wordCount = countWords(content);
          if (wordCount > 0) {
            map.set(dateKey, wordCount);
          }
        }
      });
    } catch (error) {
      console.warn('Supabase offline, using local data:', error);
      // Use only local data
      const localKeys = Object.keys(localStorage).filter(key => key.startsWith(LOCAL_ENTRY_PREFIX));
      localKeys.forEach(key => {
        const dateKey = key.replace(LOCAL_ENTRY_PREFIX, '');
        const content = localStorage.getItem(key) || '';
        const wordCount = countWords(content);
        if (wordCount > 0) {
          map.set(dateKey, wordCount);
        }
      });
    }

    return map;
  }
};

export default dataStore;
