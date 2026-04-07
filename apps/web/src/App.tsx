import { useMemo, useState } from "react";
import { ChatPanel } from "./components/ChatPanel";
import { CosmosCanvas } from "./game/CosmosCanvas";
import { useSocket } from "./game/useSocket";

const COLORS = ["#6c5ce7", "#00cec9", "#fdcb6e", "#e17055", "#d63031", "#0984e3"];

function makeId(): string {
  try {
    let id = sessionStorage.getItem("cosmos-uid");
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("cosmos-uid", id); }
    return id;
  } catch { return crypto.randomUUID(); }
}

export default function App() {
  const uid = useMemo(makeId, []);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]!);
  const [entered, setEntered] = useState(false);

  const { live, err, players, prox, msgs, join, emitMove, emitChat } = useSocket();

  const connectedSet = useMemo(() => new Set(prox.connectedPeers), [prox.connectedPeers]);
  const peerNames = useMemo(
    () => prox.connectedPeers.map((pid) => players.find((p) => p.id === pid)?.name ?? pid.slice(0, 6)),
    [prox.connectedPeers, players],
  );

  const effectiveName = name.trim() || `Traveler-${uid.slice(0, 4)}`;

  const handleEnter = () => {
    join(uid, effectiveName, color);
    setName(effectiveName);
    setEntered(true);
  };

  // ── Join screen ──
  if (!entered) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-slate-900/10 p-8 shadow-3xl shadow-black/50 backdrop-blur-sm">
          <h1 className="text-2xl font-bold tracking-tight">Virtual Cosmos</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Enter a shared 2D world. Move with WASD / arrow keys. Chat when your
            proximity circles overlap with other players.
          </p>

          <label className="mt-6 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Display name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Amrit"
            maxLength={24}
            className="mt-2 w-full rounded-lg border border-slate-600/60 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-700"
          />

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Avatar color
          </p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-10 w-10 rounded-full border-2 transition-all ${
                  color === c
                    ? "border-white/60 scale-110 shadow-lg"
                    : "border-transparent hover:border-white/20"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleEnter}
            className="mt-8 w-full rounded-xl bg-gradient-to-r from-slate-950 to-slate-900 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-900/30 transition hover:from-slate-950 hover:to-slate-800"
          >
            Enter Cosmos
          </button>
          <p className="mt-4 text-center font-mono text-[10px] text-slate-600">
            session id: {uid.slice(0, 12)}…
          </p>
        </div>
      </div>
    );
  }

  // ── Game screen ──
  return (
    <div className="min-h-screen p-4 text-slate-100 md:p-6">
      {err && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          <strong>Connection error:</strong> {err}
        </div>
      )}

      <header className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-2 text-2xl font-bold -tracking-wide">Virtual Cosmos</h1>

        <span className={`inline-flex items-center gap-2 rounded-md px-3 py-0.5 text-[11px] font-semibold ${
          live
            ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
            : "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/30"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          {live ? "Live" : "Connecting…"}
        </span>

        <span className="rounded-md bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-slate-300 ring-1 ring-white/[0.06]">
          Players: <strong className="text-white">{players.length}</strong>
        </span>

        {prox.connectedPeers.length > 0 && (
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-200 ring-1 ring-amber-500/25">
            Connected with: <strong className="text-amber-100">{prox.connectedPeers.length} user{prox.connectedPeers.length > 1 ? "s" : ""}</strong>
          </span>
        )}
      </header>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-shrink-0">
          <CosmosCanvas
            myId={uid}
            myName={effectiveName}
            myColor={color}
            players={players}
            connectedPeers={connectedSet}
            onMove={emitMove}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span>
              <kbd className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">WASD</kbd>
              {" / "}
              <kbd className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">Arrows</kbd>
              {" to move"}
            </span>
            <span className="text-slate-600">|</span>
            <span>Camera follows you</span>
            <span className="text-slate-600">|</span>
            <span>All players visible in real time</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            Open a second window in Incognito to test multiplayer.
            Click the canvas after typing in chat to resume movement.
          </p>
        </div>

        <div className="w-full lg:w-[340px]">
          <ChatPanel
            visible={prox.groupId !== null}
            peerNames={peerNames}
            messages={msgs}
            myId={uid}
            onSend={emitChat}
          />
        </div>
      </div>
    </div>
  );
}
