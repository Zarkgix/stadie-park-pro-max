import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { apiUrl } from "@/lib/api";

export const Route = createFileRoute("/ai-support")({
  head: () => ({ meta: [{ title: "ai support - stadie-park" }] }),
  component: AiSupportPage,
});

type Msg = { role: "user" | "assistant"; text: string };

function AiSupportPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi, I am your local Stadie-Park assistant. Ask me about queue priorities, payments, parking, or what your account can do.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");

    const token = localStorage.getItem("stadie_park_token");
    if (!token) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Please log in first so I can answer using your Stadie-Park role and account data." },
      ]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl("/ai/chat"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: "Please log in again before using AI support." },
        ]);
        return;
      }

      const data = await response.json();
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "I cannot reach the assistant service right now. Make sure the backend and Ollama are running." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="ai support" description="local llm assistant - privacy-first explanations">
      <div className="bg-neutral-900/90 backdrop-blur rounded-3xl border border-white/10 flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "bg-white text-black rounded-2xl rounded-br-sm px-4 py-3 text-sm max-w-[75%]"
                    : "bg-transparent border border-white/15 text-white rounded-2xl rounded-bl-sm px-4 py-3 text-sm max-w-[75%]"
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading ? <p className="text-xs text-white/50">Assistant is thinking...</p> : null}
        </div>
        <div className="border-t border-white/10 p-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="ask anything..."
            className="flex-1 bg-neutral-800 border border-white/10 rounded-full px-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
          />
          <button
            onClick={send}
            disabled={loading}
            className="bg-white text-black text-sm rounded-full px-6 py-3 hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            {loading ? "thinking..." : "send"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
