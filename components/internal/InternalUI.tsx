import React from 'react';
import './internal.css';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="vi-page-header"><div><span className="vi-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><div className="vi-actions">{actions}</div></header>;
}
export function ViewTabs<T extends string>({ label, items, active, onChange }: { label: string; items: readonly (readonly [T, string])[]; active: T; onChange: (value: T) => void }) {
  return <nav className="vi-tabs" aria-label={label}>{items.map(([id, title]) => <button type="button" key={id} aria-pressed={active === id} onClick={() => onChange(id)}>{title}</button>)}</nav>;
}
export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return <div className="vi-empty"><strong>{title}</strong><p>{children}</p>{action}</div>;
}
export function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className="vi-badge" data-tone={tone}>{children}</span>;
}
export function Pagination({ page, total, size, onChange }: { page: number; total: number; size: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="vi-pagination"><span>{total} résultat{total > 1 ? 's' : ''} · Page {page + 1} / {pages}</span><div className="vi-actions"><button className="vi-button" disabled={!page} onClick={() => onChange(page - 1)}>Précédente</button><button className="vi-button" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>Suivante</button></div></div>;
}
