import type { PropsWithChildren, ReactNode } from "react";

type MainLayoutProps = PropsWithChildren<{
  header: ReactNode;
  sidebar: ReactNode;
}>;

export function MainLayout({ header, sidebar, children }: MainLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-950 text-slate-100">
      {header}
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-auto p-5">{children}</main>
        {sidebar}
      </div>
    </div>
  );
}
