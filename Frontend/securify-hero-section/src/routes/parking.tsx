import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";

export const Route = createFileRoute("/parking")({
  head: () => ({ meta: [{ title: "parking allocation — stadie-park" }] }),
  component: ParkingPage,
});

function ParkingPage() {
  const slots = Array.from({ length: 96 }, (_, i) => ({
    id: i,
    state: i === 17 ? "new" : i % 4 === 0 ? "free" : "occupied",
  }));
  return (
    <PageShell title="parking allocation" description="white = free · dim = occupied · ringed = newly assigned">
      <div className="bg-neutral-900/90 backdrop-blur rounded-3xl p-6 border border-white/10">
        <div className="grid grid-cols-12 gap-2">
          {slots.map((s) => (
            <div
              key={s.id}
              className={`aspect-square rounded ${
                s.state === "free" ? "bg-white" : s.state === "new" ? "bg-white ring-2 ring-white/60 ring-offset-2 ring-offset-neutral-900" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
