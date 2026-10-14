import type { ReactNode } from 'react';

export function Seal({ children }: { children: ReactNode }) {
  return <span className="seal">{children}</span>;
}

export function SectionTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail?: string }) {
  return <div className="section-title"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{detail && <p>{detail}</p>}</div>;
}
