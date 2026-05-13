import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";
import { StatBlock } from "@/components/ui-ext/StatBlock";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "about — stadie-park" },
      { name: "description", content: "About the Adaptive Priority Scheduling System for event-based parking facilities." },
      { property: "og:title", content: "about — stadie-park" },
      { property: "og:description", content: "Smart, fair, contactless stadium parking powered by adaptive priority scheduling." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell
      title="about stadie-park"
      description="an adaptive priority scheduling system for efficient parking allocation in event-based facilities"
    >
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="md:col-span-2 bg-neutral-900/90 backdrop-blur rounded-3xl p-8 border border-white/10">
          <h2 className="text-white text-xl md:text-2xl font-medium lowercase mb-3">the problem</h2>
          <p className="text-white/75 text-sm md:text-base leading-relaxed">
            large public venues like sports stadiums experience intense vehicular congestion during major events.
            arrivals are heterogeneous — private cars, public service vehicles, logistics trucks, emergency responders,
            and vvip convoys all converge at once. conventional parking is mostly manual or static, relying on
            first-come, first-served allocation that cannot react to time-critical conditions.
          </p>
        </div>
        <div className="bg-neutral-900/90 backdrop-blur rounded-3xl p-8 border border-white/10">
          <h2 className="text-white text-xl md:text-2xl font-medium lowercase mb-3">the project</h2>
          <p className="text-white/75 text-sm md:text-base leading-relaxed">
            stadie-park is a research-driven prototype built as part of a bsc business computing degree at jkuat,
            implementing an adaptive priority scheduling (aps) system for event-based parking.
          </p>
        </div>
      </div>

      <div className="bg-neutral-900/90 backdrop-blur rounded-3xl p-8 border border-white/10 mb-12">
        <h2 className="text-white text-xl md:text-2xl font-medium lowercase mb-6">how it works</h2>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-white/75 leading-relaxed">
          <div>
            <div className="text-white text-base lowercase mb-2">1. classify</div>
            arriving vehicles are sorted into five categories: emergency, vvip, public service, logistics, and private.
          </div>
          <div>
            <div className="text-white text-base lowercase mb-2">2. score</div>
            a dynamic priority score is computed using category weight, arrival urgency, zone load, and a waiting-time
            ageing factor — inspired by preemptive virtual scheduling (pvs).
          </div>
          <div>
            <div className="text-white text-base lowercase mb-2">3. allocate</div>
            vehicles are routed to parking zones in real time. emergency vehicles receive immediate preemptive access.
          </div>
          <div>
            <div className="text-white text-base lowercase mb-2">4. validate</div>
            an nfc-simulated entry module confirms payment and access at the gate, while a lightweight llm assistant
            supports attendant decision-making.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <StatBlock value="5" label="vehicle classes" divider="right" />
        <StatBlock value="4" label="evaluation metrics" divider="right" />
        <StatBlock value="-38%" label="avg entry delay" divider="right" />
        <StatBlock value="+99%" label="emergency throughput" divider="right" />
      </div>

      <div className="bg-neutral-900/90 backdrop-blur rounded-3xl p-8 border border-white/10">
        <h2 className="text-white text-xl md:text-2xl font-medium lowercase mb-3">credits</h2>
        <p className="text-white/75 text-sm leading-relaxed">
          research & development by <span className="text-white">zachariah gitahi wangari</span> · sct222-0150/2020 ·
          jomo kenyatta university of agriculture and technology · supervised by mr. sydney sichangi.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link to="/dashboard" className="bg-white text-black text-sm rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors">
            view dashboard
          </Link>
          <Link to="/ai-support" className="border border-white/20 text-white text-sm rounded-full px-6 py-3 hover:bg-white/5 transition-colors">
            ask the assistant
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
