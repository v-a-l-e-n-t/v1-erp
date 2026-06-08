// =============================================================================
// Client Supabase FICTIF pour le mode démonstration.
// Imite l'API utilisée par l'app (query-builder chaînable + thenable) mais ne
// fait AUCUN appel réseau : tout est résolu localement depuis demoData.
// =============================================================================

import { getDemoTable } from './demoData';

type Filter = { op: string; col: string; val: any };

const resolvePath = (row: any, path: string): any =>
  path.split('.').reduce((o: any, k) => (o == null ? undefined : o[k]), row);

function passes(row: any, f: Filter): boolean {
  const a = resolvePath(row, f.col);
  if (a === undefined) return true; // lenient : chemin absent => on ne filtre pas
  switch (f.op) {
    case 'eq': return a === f.val || String(a) === String(f.val);
    case 'neq': return String(a) !== String(f.val);
    case 'gte': return a >= f.val;
    case 'lte': return a <= f.val;
    case 'gt': return a > f.val;
    case 'lt': return a < f.val;
    case 'in': return Array.isArray(f.val) && f.val.map(String).includes(String(a));
    case 'is': return a === f.val || (f.val === null && (a === null || a === undefined));
    case 'like':
    case 'ilike': {
      const re = new RegExp('^' + String(f.val).replace(/%/g, '.*').replace(/_/g, '.') + '$', f.op === 'ilike' ? 'i' : '');
      return re.test(String(a));
    }
    default: return true;
  }
}

class DemoQuery implements PromiseLike<{ data: any; error: null; count: number | null }> {
  private filters: Filter[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private limitN: number | null = null;
  private wantSingle: 'single' | 'maybe' | null = null;
  private write: { rows: any[] } | null = null;

  constructor(private table: string) {}

  // --- terminaux d'écriture (no-op) ---
  insert(payload: any) {
    const rows = (Array.isArray(payload) ? payload : [payload]).map((r, i) => ({
      id: r?.id ?? `demo-new-${Date.now()}-${i}`, ...r,
    }));
    this.write = { rows };
    return this;
  }
  update(payload: any) { this.write = { rows: [{ ...payload }] }; return this; }
  upsert(payload: any) { return this.insert(payload); }
  delete() { this.write = { rows: [] }; return this; }

  // --- sélection / filtres (chaînables) ---
  select(_cols?: string, _opts?: any) { return this; }
  eq(col: string, val: any) { this.filters.push({ op: 'eq', col, val }); return this; }
  neq(col: string, val: any) { this.filters.push({ op: 'neq', col, val }); return this; }
  gte(col: string, val: any) { this.filters.push({ op: 'gte', col, val }); return this; }
  lte(col: string, val: any) { this.filters.push({ op: 'lte', col, val }); return this; }
  gt(col: string, val: any) { this.filters.push({ op: 'gt', col, val }); return this; }
  lt(col: string, val: any) { this.filters.push({ op: 'lt', col, val }); return this; }
  in(col: string, val: any[]) { this.filters.push({ op: 'in', col, val }); return this; }
  is(col: string, val: any) { this.filters.push({ op: 'is', col, val }); return this; }
  like(col: string, val: any) { this.filters.push({ op: 'like', col, val }); return this; }
  ilike(col: string, val: any) { this.filters.push({ op: 'ilike', col, val }); return this; }
  contains() { return this; }
  match(obj: Record<string, any>) { Object.entries(obj).forEach(([col, val]) => this.eq(col, val)); return this; }
  or() { return this; }
  filter(col: string, op: string, val: any) { this.filters.push({ op, col, val }); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.orderCol = col; this.orderAsc = opts?.ascending !== false; return this; }
  limit(n: number) { this.limitN = n; return this; }
  range(from: number, to: number) { this.rangeFrom = from; this.rangeTo = to; return this; }
  single() { this.wantSingle = 'single'; return this; }
  maybeSingle() { this.wantSingle = 'maybe'; return this; }

  private resolve(): { data: any; error: null; count: number | null } {
    if (this.write) {
      const data = this.wantSingle ? (this.write.rows[0] ?? null) : this.write.rows;
      return { data, error: null, count: this.write.rows.length };
    }
    let rows = getDemoTable(this.table);
    for (const f of this.filters) rows = rows.filter((r) => passes(r, f));
    if (this.orderCol) {
      const col = this.orderCol;
      rows.sort((a, b) => {
        const av = resolvePath(a, col), bv = resolvePath(b, col);
        if (av === bv) return 0;
        const r = av > bv ? 1 : -1;
        return this.orderAsc ? r : -r;
      });
    }
    const count = rows.length;
    if (this.rangeFrom != null && this.rangeTo != null) rows = rows.slice(this.rangeFrom, this.rangeTo + 1);
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    if (this.wantSingle) return { data: rows[0] ?? null, error: null, count };
    return { data: rows, error: null, count };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: null; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected);
  }
}

// ---- functions.invoke ----
const demoFunctions = {
  invoke: async (name: string, _opts?: any) => {
    if (name === 'get-mapbox-token') {
      const token = (import.meta as any).env?.VITE_MAPBOX_DEMO_TOKEN ?? null;
      return { data: token ? { token } : null, error: null };
    }
    if (name === 'chat-assistant') {
      return { data: { reply: "Réponse de démonstration : posez vos questions une fois la plateforme déployée." }, error: null };
    }
    return { data: null, error: null };
  },
};

// ---- auth (stubs sûrs) ----
const demoAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  signOut: async () => ({ error: null }),
};

// ---- realtime (noop) ----
const demoChannel = () => {
  const ch: any = { on: () => ch, subscribe: () => ch, unsubscribe: () => {} };
  return ch;
};

export const demoClient = {
  from: (table: string) => new DemoQuery(table),
  rpc: async () => ({ data: null, error: null }),
  functions: demoFunctions,
  auth: demoAuth,
  channel: demoChannel,
  removeChannel: () => {},
};
