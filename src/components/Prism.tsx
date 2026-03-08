import type { CSSProperties } from "react";

type AnimationType = "rotate" | "pulse" | "none";

interface PrismProps {
  animationType?: AnimationType;
  timeScale?: number;
  height?: number;
  baseWidth?: number;
  scale?: number;
  hueShift?: number;
  colorFrequency?: number;
  noise?: number;
  glow?: number;
  className?: string;
  style?: CSSProperties;
}

export default function Prism({
  animationType = "rotate",
  timeScale = 1,
  height = 3.5,
  baseWidth = 5.5,
  scale = 3.6,
  hueShift = 0,
  colorFrequency = 1,
  noise = 0,
  glow = 1,
  className = "",
  style,
}: PrismProps) {
  const safeTimeScale = Math.max(0.1, timeScale);
  const rotateDuration = `${Math.max(10, 32 / safeTimeScale)}s`;
  const pulseDuration = `${Math.max(4, 10 / safeTimeScale)}s`;
  const moveDuration = `${Math.max(6, 18 / safeTimeScale)}s`;
  const topBandHeight = `${Math.max(52, 28 * height)}px`;
  const topBandInset = `${Math.max(18, 26 * baseWidth)}px`;
  const beamWidth = `${Math.max(90, 34 * baseWidth)}px`;
  const beamHeight = `${Math.max(280, 150 * height)}px`;
  const beamBlur = `${Math.max(12, 18 * scale)}px`;
  const glowBlur = `${Math.max(32, 52 * glow)}px`;
  const saturation = 100 + colorFrequency * 35;

  const wrapperAnimation =
    animationType === "rotate"
      ? `prism-rotate ${rotateDuration} linear infinite`
      : animationType === "pulse"
        ? `prism-pulse ${pulseDuration} ease-in-out infinite`
        : undefined;

  return (
    <div
      className={`prism-root absolute inset-0 overflow-hidden pointer-events-none ${className}`.trim()}
      style={{ ...style }}
      aria-hidden="true"
    >
      <div
        className="prism-layer"
        style={{
          animation: wrapperAnimation,
          filter: `hue-rotate(${hueShift}deg) saturate(${saturation}%)`,
        }}
      >
        <div
          className="prism-top-band"
          style={{
            top: "24px",
            left: topBandInset,
            right: topBandInset,
            height: topBandHeight,
            boxShadow: `0 0 ${glowBlur} rgba(112, 88, 255, ${0.25 + glow * 0.22})`,
          }}
        />
        <div
          className="prism-beam"
          style={{
            width: beamWidth,
            height: beamHeight,
            filter: `blur(${beamBlur})`,
            opacity: 0.74,
            animation: `prism-drift ${moveDuration} ease-in-out infinite`,
          }}
        />
        <div
          className="prism-falloff"
          style={{
            boxShadow: `0 0 ${glowBlur} rgba(177, 89, 255, ${0.16 + glow * 0.14})`,
          }}
        />
      </div>
      {noise > 0 ? (
        <div
          className="prism-noise"
          style={{
            opacity: Math.min(0.2, noise * 0.12),
          }}
        />
      ) : null}

      <style>{`
        .prism-root {
          z-index: 0;
        }
        .prism-layer {
          position: absolute;
          inset: 0;
          transform-origin: 50% 20%;
        }
        .prism-top-band {
          position: absolute;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background:
            radial-gradient(ellipse at 62% 50%, rgba(130, 102, 255, 0.7), rgba(130, 102, 255, 0.18) 28%, rgba(12, 8, 28, 0.88) 62%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.02));
          backdrop-filter: blur(8px);
        }
        .prism-beam {
          position: absolute;
          top: -20px;
          left: 60%;
          border-radius: 999px;
          transform: translateX(-50%) rotate(5deg);
          background:
            linear-gradient(180deg,
              rgba(141, 131, 255, 0.05) 0%,
              rgba(141, 131, 255, 0.9) 22%,
              rgba(169, 112, 255, 0.85) 48%,
              rgba(98, 66, 255, 0.2) 100%);
        }
        .prism-falloff {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(55% 45% at 78% 28%, rgba(119, 82, 255, 0.2), transparent 68%),
            radial-gradient(60% 50% at 72% 32%, rgba(158, 90, 255, 0.18), transparent 70%);
        }
        .prism-noise {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(rgba(255, 255, 255, 0.35) 0.6px, transparent 0.8px);
          background-size: 3px 3px;
          mix-blend-mode: overlay;
        }
        @keyframes prism-rotate {
          0% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(3deg) scale(1.01);
          }
          100% {
            transform: rotate(0deg) scale(1);
          }
        }
        @keyframes prism-pulse {
          0%,
          100% {
            opacity: 0.85;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes prism-drift {
          0%,
          100% {
            transform: translateX(-50%) rotate(5deg);
          }
          50% {
            transform: translateX(-43%) rotate(8deg);
          }
        }
      `}</style>
    </div>
  );
}
