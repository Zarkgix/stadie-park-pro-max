import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { StatBlock } from "@/components/ui-ext/StatBlock";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "reports — stadie-park" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <PageShell title="reports" description="simulation summaries and event analytics">
      <div className="grid md:grid-cols-3 gap-10">
        <StatBlock value="+12k" label="vehicles processed" divider="right" />
        <StatBlock value="-38%" label="avg entry delay" divider="right" />
        <StatBlock value="+99%" label="emergency throughput" divider="right" />
      </div>
    </PageShell>
  );
}
