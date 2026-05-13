import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Send, X } from "lucide-react";
import { apiUrl } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi, I am your Stadie-Park assistant. Ask me about parking, vehicles, payments, approvals, or dashboard controls.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");

    const token = localStorage.getItem("stadie_park_token");
    if (!token) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: "Please log in first so I can help with your Stadie-Park account." },
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
        setMessages((current) => [
          ...current,
          { role: "assistant", text: "Please log in again before chatting with me." },
        ]);
        return;
      }

      const data = await response.json();
      setMessages((current) => [...current, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: "I cannot reach the assistant service right now. Make sure the backend is running." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open ? (
        <div className="fixed bottom-20 right-4 z-50 flex h-[540px] max-h-[calc(100vh-6rem)] w-[min(350px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[26px] border border-white/15 bg-neutral-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-neutral-900/90 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                <MessageCircle size={18} />
              </div>
              <div>
                <h2 className="text-sm font-medium text-white">Stadie assistant</h2>
                <p className="text-xs text-white/50">parking support</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[82%] rounded-2xl rounded-br-sm bg-white px-4 py-3 text-sm text-black"
                      : "max-w-[82%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                  }
                >
                  {message.text}
                  {message.text.includes("log in first") ? (
                    <div className="mt-3">
                      <Link to="/login" onClick={() => setOpen(false)} className="text-xs font-medium text-white underline underline-offset-4">
                        Go to login
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? <p className="text-xs text-white/50">Assistant is typing...</p> : null}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 bg-neutral-900 p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything..."
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-neutral-800 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open Stadie assistant"
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-xl shadow-black/40 backdrop-blur-md transition-all hover:scale-105 hover:bg-white/25"
      >
        <MessageCircle size={22} />
      </button>
    </>
  );
}
