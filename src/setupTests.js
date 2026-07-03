// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('./lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => {
      const query = {
        select: vi.fn(() => query),
        order: vi.fn(() => query),
        insert: vi.fn(() => query),
        upsert: vi.fn(() => query),
        update: vi.fn(() => query),
        delete: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        gte: vi.fn(() => query),
        lte: vi.fn(() => query),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
      return query;
    }),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));
