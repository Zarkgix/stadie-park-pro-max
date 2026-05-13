import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";

export const Route = createFileRoute("/queue")({
  head: () => ({ meta: [{ title: "priority queue — stadie-park" }] }),
  component: QueuePage,
});

const rows = [
  ["kca 001a", "ambulance", 10, "0:42", 98, "paid"],
  ["kbz 555v", "vip", 9, "1:10", 86, "paid"],
  ["ktw 220p", "bus", 6, "3:24", 64, "paid"],
  ["kdj 901m", "private", 3, "5:08", 42, "paid"],
  ["khq 778w", "service", 4, "4:55", 38, "pending"],
] as const;

function QueuePage() {
  return (
    <PageShell title="priority queue" description="adaptive scoring across all incoming vehicles">
      <div className="bg-neutral-900/90 backdrop-blur rounded-3xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-white/60 text-xs lowercase">
            <tr className="border-b border-white/10">
              <th className="text-left px-6 py-4">plate</th>
              <th className="text-left px-6 py-4">type</th>
              <th className="text-left px-6 py-4">urgency</th>
              <th className="text-left px-6 py-4">wait</th>
              <th className="text-left px-6 py-4">score</th>
              <th className="text-left px-6 py-4">payment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-b border-white/5 last:border-0">
                <td className="px-6 py-4 text-white">{r[0]}</td>
                <td className="px-6 py-4 text-white/80">{r[1]}</td>
                <td className="px-6 py-4 text-white/80">{r[2]}</td>
                <td className="px-6 py-4 text-white/80">{r[3]}</td>
                <td className="px-6 py-4 text-white">{r[4]}</td>
                <td className="px-6 py-4 text-white/80">{r[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
