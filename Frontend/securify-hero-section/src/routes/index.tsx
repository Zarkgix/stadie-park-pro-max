import { createFileRoute } from "@tanstack/react-router";
import { AppNavbar } from "@/components/layout/AppNavbar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "stadie-park — park with ease" },
      { name: "description", content: "Adaptive priority scheduling and contactless access for smart stadium parking." },
      { property: "og:title", content: "stadie-park — park with ease" },
      { property: "og:description", content: "Adaptive priority scheduling for heterogeneous stadium traffic." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-black">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4"
      />
      <div className="absolute inset-0 bg-black/30" />
      <AppNavbar />

      <div className="relative h-screen w-full">
        <h1 className="hero-title absolute text-white font-medium text-[18vw] md:text-[13vw] left-4 md:left-10 top-[20%] md:top-[18%]">park</h1>
        <h1 className="hero-title absolute text-white font-medium text-[18vw] md:text-[13vw] right-4 md:right-10 top-[38%]">with</h1>
        <h1 className="hero-title absolute text-white font-medium text-[18vw] md:text-[13vw] left-[14%] md:left-[28%] top-[56%] md:top-[58%]">ease</h1>

        <p className="absolute left-6 md:left-10 top-[44%] md:top-[46%] max-w-[220px] md:max-w-[260px] text-[13px] md:text-[15px] leading-snug text-white/90">
          smart stadium parking — adaptive priority for every vehicle, contactless entry, zero queue chaos.
        </p>

        <div className="hidden sm:block absolute right-6 md:right-24 top-[14%]">
          <div className="flex items-center gap-3 justify-end">
            <div className="hidden md:block h-px w-24 bg-white/40 rotate-[20deg]" />
            <div className="text-3xl md:text-5xl font-medium tracking-tight text-white">+12k</div>
          </div>
          <div className="text-xs md:text-sm text-white/70 mt-1 text-right">vehicles routed</div>
        </div>

        <div className="absolute left-6 md:left-20 bottom-24 md:bottom-24">
          <div className="flex items-center gap-3">
            <div className="text-3xl md:text-5xl font-medium tracking-tight text-white">-38%</div>
            <div className="hidden md:block h-px w-24 bg-white/40 rotate-[-20deg]" />
          </div>
          <div className="text-xs md:text-sm text-white/70 mt-1">avg entry delay</div>
        </div>

        <div className="absolute right-6 md:right-20 bottom-24 md:bottom-20">
          <div className="flex items-center gap-3 justify-end">
            <div className="hidden md:block h-px w-24 bg-white/40 rotate-[-20deg]" />
            <div className="text-3xl md:text-5xl font-medium tracking-tight text-white">+99%</div>
          </div>
          <div className="text-xs md:text-sm text-white/70 mt-1 text-right">emergency throughput</div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-black" />
    </section>
  );
}
