import { useEffect, useRef, useState } from "react";

export type EngineEval =
  | { type: "cp"; value: number }
  | { type: "mate"; value: number };

export type EvalState = {
  eval: EngineEval | null;
  bestLine?: string;
  isThinking: boolean;
};

type Listener = (line: string) => void;

const supportsSharedBuffer =
  typeof SharedArrayBuffer === "function" && typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
// Prefer stability first; then fall back to other builds.
const ENGINE_CANDIDATES = [
  "/stockfish/stockfish-lite-single.js",
  "/stockfish/stockfish-asm.js",
  supportsSharedBuffer ? "/stockfish/stockfish.js" : null,
].filter(Boolean) as string[];

let engine: Worker | null = null;
let engineInitialized = false;
let engineInitTimer: number | null = null;
let engineCandidateIdx = 0;
let engineFailed = false;
const listeners = new Set<Listener>();

const resetEngineState = () => {
  engineInitialized = false;
  engineFailed = false;
  engineCandidateIdx = 0;
  clearInitTimer();
};
const resetEngineInstance = () => {
  try {
    engine?.terminate();
  } catch {
    /* ignore */
  }
  engine = null;
  resetEngineState();
};

const clearInitTimer = () => {
  if (engineInitTimer) {
    window.clearTimeout(engineInitTimer);
    engineInitTimer = null;
  }
};

const startEngine = (idx = 0): Worker | null => {
  if (typeof Worker === "undefined") {
    console.error("[SF] Web Workers are not supported in this environment.");
    engineFailed = true;
    return null;
  }
  if (idx >= ENGINE_CANDIDATES.length) {
    console.error("[SF] No Stockfish worker candidates succeeded.");
    engineFailed = true;
    return null;
  }

  const path = ENGINE_CANDIDATES[idx];
  console.info(`[SF] Loading evaluation engine from ${path}`);

  let worker: Worker | null = null;
  try {
    worker = new Worker(path, { type: "classic" });
  } catch (err) {
    console.warn(`[SF] Failed to start worker ${path}. Trying next fallback.`, err);
    return startEngine(idx + 1);
  }

  engineCandidateIdx = idx;
  engineInitialized = false;

  const fallback = () => {
    if (idx + 1 >= ENGINE_CANDIDATES.length) {
      console.error("[SF] Exhausted all Stockfish fallbacks.");
      clearInitTimer();
      engineFailed = true;
      return;
    }
    console.warn(`[SF] Falling back from ${path} to ${ENGINE_CANDIDATES[idx + 1]}`);
    resetEngineState();
    try {
      worker?.terminate();
    } catch {
      /* ignore */
    }
    engine = startEngine(idx + 1);
  };

  worker.onmessage = (e: MessageEvent) => {
    const line = String(e.data || "");
    if (line === "uciok" || line === "readyok") {
      engineInitialized = true;
      clearInitTimer();
    }
    listeners.forEach((fn) => fn(line));
  };
  worker.onerror = (e) => {
    console.error("[SF] Worker error", e);
    resetEngineState();
    fallback();
  };

  clearInitTimer();
  engineInitTimer = window.setTimeout(() => {
    console.warn(`[SF] Engine init timed out for ${path}.`);
    fallback();
  }, 2500);

  worker.postMessage("uci");
  worker.postMessage("isready");
  return worker;
};

function getEngine(): Worker | null {
  if (engineFailed) {
    resetEngineState();
  }
  if (!engine) {
    engine = startEngine(0);
  } else if (!engineInitialized && !engineInitTimer) {
    engineInitTimer = window.setTimeout(() => {
      const nextIdx = engineCandidateIdx + 1;
      if (nextIdx < ENGINE_CANDIDATES.length) {
        console.warn("[SF] Engine still not ready. Attempting fallback.");
        engine = startEngine(nextIdx);
      }
    }, 1200);
  }
  return engine;
}

const parseEval = (line: string): EngineEval | null => {
  if (!line.startsWith("info ")) return null;
  // Prefer mate if present
  const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);
  if (mateMatch) {
    const val = Number(mateMatch[1]);
    if (Number.isFinite(val)) return { type: "mate", value: val };
  }
  const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
  if (cpMatch) {
    const val = Number(cpMatch[1]);
    if (Number.isFinite(val)) return { type: "cp", value: val };
  }
  return null;
};

const normalizeEvalForFen = (ev: EngineEval, fen: string | null): EngineEval => {
  if (!fen) return ev;
  const side = fen.split(" ")[1];
  const sign = side === "b" ? -1 : 1;
  return { ...ev, value: ev.value * sign };
};

export function useStockfishEval(
  fen: string | null,
  opts: { depth?: number; throttleMs?: number; refreshKey?: number } = {},
): EvalState {
  const [state, setState] = useState<EvalState>({ eval: null, isThinking: false });
  const depth = opts.depth ?? 16;
  const refreshKey = opts.refreshKey ?? 0;
  const searchIdRef = useRef(0);
  const settleTimerRef = useRef<number | null>(null);
  const activeFenRef = useRef<string | null>(null);

  useEffect(() => {
    const eng = getEngine();
    if (!eng) {
      console.error("[SF] Engine unavailable - eval bar disabled.");
      setState({ eval: null, isThinking: false });
      return;
    }
    const handler = (line: string) => {
      if (!line) return;
      if (line === "uciok") return;
      if (line.startsWith("info ")) {
        console.log("[SF] msg:", line);
        const parsed = parseEval(line);
        if (parsed) {
          const normalized = normalizeEvalForFen(parsed, activeFenRef.current);
          setState((s) => ({ ...s, eval: normalized }));
        }
        return;
      }
      if (line.startsWith("bestmove")) {
        setState((s) => ({ ...s, isThinking: false }));
        if (settleTimerRef.current) {
          window.clearTimeout(settleTimerRef.current);
          settleTimerRef.current = null;
        }
      }
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [depth]);

  useEffect(() => {
    if (!fen) {
      activeFenRef.current = null;
      setState({ eval: null, isThinking: false });
      return;
    }
    // On refreshKey changes, hard-reset the engine to avoid any stuck state.
    if (refreshKey) {
      resetEngineInstance();
    }
    const eng = getEngine();
    if (!eng) {
      setState({ eval: null, isThinking: false });
      return;
    }
    activeFenRef.current = fen;
    console.log("[SF] analyze fen:", fen);
    console.log("[EVAL] fen changed:", fen, "refresh", refreshKey);
    const searchId = ++searchIdRef.current;
    setState((s) => ({ ...s, isThinking: true }));
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    console.log("[SF->] stop");
    eng.postMessage("stop");
    console.log("[SF->] position fen", fen);
    eng.postMessage(`position fen ${fen}`);
    console.log("[SF->] go movetime 250");
    eng.postMessage("go movetime 250");
    // Fallback: if the engine never emits bestmove, clear thinking state after a short window.
    settleTimerRef.current = window.setTimeout(() => {
      if (searchIdRef.current === searchId) {
        setState((s) => ({ ...s, isThinking: false }));
        settleTimerRef.current = null;
      }
    }, 2600);
  }, [fen, depth, refreshKey]);

  return state;
}
