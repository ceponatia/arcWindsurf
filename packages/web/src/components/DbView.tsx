import React, { useEffect, useRef, useState } from 'react';
import {
  getDbOverview,
  deleteDbRow,
  type DbOverview,
  type DbTableOverview,
} from '../api/client.js';
import { DB_TOOLS } from '../config.js';

function toDisplay(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return `${v}`;
  try {
    return (v as { toString: () => string }).toString();
  } catch {
    return '';
  }
}

// DB row type with common id variants plus index signature
interface DbRow {
  id?: unknown;
  ID?: unknown;
  Id?: unknown;
  [key: string]: unknown;
}

export const DbView: React.FC = () => {
  const [data, setData] = useState<DbOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reload = (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    return getDbOverview(signal)
      .then((d) => setData(d))
      .catch((e) => setError((e as Error).message || 'Failed to load DB overview'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void reload(ctrl.signal);
    return () => abortRef.current?.abort();
  }, []);

  if (loading)
    return (
      <div style={{ padding: 16 }}>
        <h2>Database</h2>
        <p>Loading…</p>
      </div>
    );
  if (error)
    return (
      <div style={{ padding: 16 }}>
        <h2>Database</h2>
        <p className="error">{error}</p>
      </div>
    );
  if (!data) return null;

  const TableCard: React.FC<{ table: DbTableOverview }> = ({ table }) => {
    const columns: string[] = table.sample.length
      ? Object.keys(table.sample[0]!)
      : table.columns.map((c) => c.name);

    return (
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          background: '#fff',
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {table.name}{' '}
          <span style={{ color: '#666', fontWeight: 400 }}>({table.rowCount} rows)</span>
        </h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 280 }}>
            <h4 style={{ marginBottom: 8 }}>Columns</h4>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={th}>name</th>
                  <th style={th}>type</th>
                  <th style={th}>id</th>
                  <th style={th}>required</th>
                  <th style={th}>list</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((c) => (
                  <tr key={c.name}>
                    <td style={td}>{c.name}</td>
                    <td style={td}>{c.type}</td>
                    <td style={td}>{c.isId ? 'yes' : 'no'}</td>
                    <td style={td}>{c.isRequired ? 'yes' : 'no'}</td>
                    <td style={td}>{c.isList ? 'yes' : 'no'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ flex: 1, minWidth: 420 }}>
            <h4 style={{ marginBottom: 8 }}>Recent Rows</h4>
            <div style={{ overflowX: 'auto' }}>
              {table.sample.length ? (
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr>
                      {columns.map((k) => (
                        <th key={k} style={th}>
                          {k}
                        </th>
                      ))}
                      {DB_TOOLS ? <th style={th}>actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {table.sample.map((row, i) => {
                      const rec = row as DbRow;
                      const idVal = rec.id ?? rec.ID ?? rec.Id ?? rec[columns[0]!]; // best-effort fallback
                      const idStr =
                        typeof idVal === 'string' || typeof idVal === 'number'
                          ? String(idVal)
                          : undefined;

                      return (
                        <tr key={i}>
                          {columns.map((k) => {
                            const val = rec[k];
                            const display = toDisplay(val);
                            return (
                              <td key={k} style={td}>
                                {display}
                              </td>
                            );
                          })}
                          {DB_TOOLS ? (
                            <td style={td}>
                              <button
                                disabled={!!deleting}
                                title={
                                  deleting ? `Deleting ${table.name}#${deleting}…` : 'Delete row'
                                }
                                onClick={() => {
                                  if (!idStr) {
                                    alert('No id column found for this row');
                                    return;
                                  }
                                  const ok = confirm(
                                    `Delete ${table.name}#${idStr}? This cannot be undone.`,
                                  );
                                  if (!ok) return;
                                  const run = async () => {
                                    setDeleting(idStr);
                                    try {
                                      await deleteDbRow(table.name, idStr);
                                      await reload();
                                    } catch (e: unknown) {
                                      const msg =
                                        e && typeof e === 'object' && 'message' in e
                                          ? String((e as { message?: unknown }).message)
                                          : 'Delete failed';
                                      alert(msg);
                                    } finally {
                                      setDeleting(null);
                                    }
                                  };
                                  void run();
                                }}
                              >
                                {deleting && idStr === deleting ? 'Deleting…' : 'Delete'}
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No rows</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Database Overview</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Showing tables, columns, and up to 50 most recent rows per table.
      </p>
      {data.tables.map((t) => (
        <TableCard key={t.name} table={t} />
      ))}
    </div>
  );
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: '1px solid #eee',
  fontWeight: 600,
  background: '#fafafa',
};

const td: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: '1px solid #f1f1f1',
  verticalAlign: 'top',
};

export default DbView;
