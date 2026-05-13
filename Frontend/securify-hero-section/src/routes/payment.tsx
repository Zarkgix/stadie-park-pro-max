import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/layout/PageShell";

export const Route = createFileRoute("/payment")({
  head: () => ({ meta: [{ title: "contactless payment — stadie-park" }] }),
  component: PaymentPage,
});

function PaymentPage() {
  return (
    <PageShell title="contactless payment" description="simulated nfc tap-to-pay at the gate">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
          <div className="relative h-48 w-48 rounded-full bg-white flex items-center justify-center">
            <span className="text-black text-sm lowercase">tap to pay</span>
          </div>
        </div>
        <p className="text-white/70 text-sm mt-10 lowercase">hold device near reader</p>
        <button className="mt-6 bg-neutral-900/90 backdrop-blur text-white border border-white/10 rounded-full px-6 py-3 text-sm hover:text-white transition-colors">
          simulate tap
        </button>
      </div>
    </PageShell>
  );
}
