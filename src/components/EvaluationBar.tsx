import React, { useEffect, useMemo, useRef } from "react";
import type { EngineEval } from "../hooks/useStockfishEval";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function cpToFraction(cp: number) {
  const scale = 400;
  const x = cp / scale;
  const y = Math.tanh(x);
  return (y + 1) / 2;
}

function evalToFraction(ev: EngineEval | null) {
  if (!ev) return 0.5;
  if (ev.type === "mate") return ev.value > 0 ? 0.99 : 0.01;
  return clamp(cpToFraction(ev.value), 0.01, 0.99);
}

function evalLabel(ev: EngineEval | null) {
  if (!ev) return "0.0";
  if (ev.type === "mate") {
    const n = Math.abs(ev.value);
    return ev.value > 0 ? `M${n}` : `-M${n}`;
  }
  const pawns = ev.value / 100;
  const rounded = Math.round(pawns * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}`;
}

export function EvaluationBar({
  eval: ev,
  isThinking = false,
  height = 520,
  width = 24,
}: {
  eval: EngineEval | null;
  isThinking?: boolean;
  height?: number;
  width?: number;
}) {
  const lastEvalRef = useRef<EngineEval | null>(null);

  useEffect(() => {
    if (ev) lastEvalRef.current = ev;
  }, [ev]);

  const displayEval = ev ?? lastEvalRef.current;
  const fraction = useMemo(() => evalToFraction(displayEval), [displayEval]);
  const label = useMemo(() => evalLabel(displayEval), [displayEval]);
  const whiteFillPct = fraction * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <div
        style={{
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
          fontSize: 12,
          opacity: 0.9,
          userSelect: "none",
        }}
      >
        {label}
      </div>

      <div
        style={{
          height,
          width,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.55)",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}
        aria-label="Engine evaluation bar"
        title={`Eval: ${label}`}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            height: `${whiteFillPct}%`,
            transition: "height 180ms ease",
            background: "rgba(255,255,255,0.92)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            width: "100%",
            height: 1,
            background: "rgba(255,255,255,0.18)",
            transform: "translateY(-0.5px)",
          }}
        />
      </div>
    </div>
  );
}
