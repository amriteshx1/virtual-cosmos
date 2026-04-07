import type { ChatMsgPayload } from "@virtual-cosmos/shared";
import { useEffect, useRef, useState } from "react";

type Props = {
  visible: boolean;
  peerNames: string[];
  messages: ChatMsgPayload[];
  myId: string;
  onSend: (text: string) => void;
};

export function ChatPanel({ visible, peerNames, messages, myId, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft("");
  };

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-white/[0.06] bg-slate-900/10 shadow-inner shadow-black/20 backdrop-blur-sm">
      <div className="border-b border-white/[0.06] px-4 py-3.5">
        <h2 className="text-sm font-semibold text-slate-100">Proximity Chat</h2>
        {visible ? (
          <p className="mt-1 text-xs text-emerald-400/80">
            Connected with: {peerNames.join(", ")}
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            Move closer to someone to start chatting
          </p>
        )}
      </div>

      {!visible ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/60 text-2xl">
            ✉️
          </div>
          <p className="text-sm text-slate-500">
            No one is within your proximity range yet.
          </p>
          <p className="text-xs text-slate-600">
            Move your avatar closer to another player to connect.
          </p>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-600">
                You are connected! Say hi 👋
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={`${m.ts}-${m.from}-${i}`}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    m.from === myId
                      ? "ml-8 bg-sky-600/20 text-sky-50"
                      : "mr-8 bg-white/[0.04] text-slate-100"
                  }`}
                >
                  <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {m.from === myId ? "You" : m.fromName}
                    <span className="ml-2 normal-case font-normal text-slate-600">
                      {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-white/[0.06] p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Type a message…"
                className="min-w-0 flex-1 rounded-lg border border-slate-600/50 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
