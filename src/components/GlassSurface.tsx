import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type SurfaceSize = number | string;

interface GlassSurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
  width?: SurfaceSize;
  height?: SurfaceSize;
  borderRadius?: SurfaceSize;
  displace?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  brightness?: number;
  opacity?: number;
  mixBlendMode?: CSSProperties["mixBlendMode"];
}

const toSize = (value?: SurfaceSize) => {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
};

export default function GlassSurface({
  children,
  width,
  height,
  borderRadius = 18,
  displace = 0.35,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  brightness = 50,
  opacity = 0.93,
  mixBlendMode = "normal",
  className,
  style,
  ...rest
}: GlassSurfaceProps) {
  const blurStrength = Math.max(8, Math.abs(distortionScale) * 0.08 + displace * 8);
  const saturation = Math.max(115, 120 + brightness * 0.9);
  const colorShift = Math.min(0.45, Math.max(0.12, (redOffset + greenOffset + blueOffset) / 95));

  return (
    <div
      className={clsx(
        "relative overflow-hidden border border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.05)_100%)] shadow-[0_12px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.35)]",
        className,
      )}
      style={{
        width: toSize(width),
        height: toSize(height),
        borderRadius: toSize(borderRadius),
        opacity,
        mixBlendMode,
        backdropFilter: `blur(${blurStrength}px) saturate(${saturation}%)`,
        WebkitBackdropFilter: `blur(${blurStrength}px) saturate(${saturation}%)`,
        ...style,
      }}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.12) 35%, rgba(255,255,255,0.02) 100%)",
          opacity: 0.55 + colorShift,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow:
            "inset 0 1px 1px rgba(255,255,255,0.55), inset 0 -1px 2px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
