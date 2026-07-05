import type { ReactNode } from "react";

type DashboardLayoutProps = {
  standings: ReactNode;
  workspace: ReactNode;
};

export default function DashboardLayout({
  standings,
  workspace,
}: DashboardLayoutProps) {
  return (
    <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[330px_minmax(0,1fr)] lg:p-4">
      {standings}
      {workspace}
    </div>
  );
}
