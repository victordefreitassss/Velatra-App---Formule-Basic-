import React from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

/** Presentation only: all actions and facts are supplied by the existing Home. */
export function WidgetBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'violet' | 'rose' | 'green' }) {
  return <span className={`vd-widget-badge vd-widget-badge--${tone}`}>{children}</span>;
}

export function WidgetRow({ name, secondary, badges, leading, action, actions, children, icon }: {
  name: string; icon?: React.ReactNode; secondary?: React.ReactNode; badges?: React.ReactNode; leading?: React.ReactNode;
  action?: { label: string; text: string; onClick: () => void }; actions?: React.ReactNode; children?: React.ReactNode;
}) {
  return <div className={`vd-widget-row ${leading ? 'vd-widget-row--agenda' : ''} ${actions ? 'vd-widget-row--with-actions' : ''}`}>
    <div className="vd-widget-row-main">
      {leading && <div className="vd-widget-time">{leading}</div>}
      <span className="vd-widget-avatar" aria-hidden="true">{icon || name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</span>
      <div className="vd-widget-copy"><h3>{name}</h3>{secondary && <p>{secondary}</p>}{badges && <div className="vd-widget-badges">{badges}</div>}{children}</div>
      {action && <button type="button" className="vd-row-primary" aria-label={action.label} title={action.label} onClick={action.onClick}><span>{action.text}</span><ChevronRight size={14} aria-hidden="true" /></button>}
    </div>
    {actions && <details className="vd-row-more"><summary aria-label={`Autres actions pour ${name}`} title={`Autres actions pour ${name}`}><MoreHorizontal size={19} aria-hidden="true" /></summary><div className="vd-row-secondary">{actions}</div></details>}
  </div>;
}

export function WidgetStats({ items }: { items: { label: string; value: number; tone?: 'violet' | 'rose' }[] }) {
  return <dl className="vd-widget-stats">{items.map(item => <div key={item.label} className={item.tone ? `vd-widget-stat--${item.tone}` : undefined}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}
