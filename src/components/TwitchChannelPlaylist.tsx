import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  channels?: string[];
  startIndex?: number;
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
  aspectRatio?: string;
  rotateMs?: number;
  refreshMs?: number;
};

const DEFAULT_CHANNELS = [
  "gmhikaru",
  "gothamchess",
  "botezlive",
  "chess",
  "chess24",
  "imrosen",
  "penguingm1",
  "annacramling",
  "chessdojo",
  "thebelenkaya",
  "wittyalien",
  "akanemsko",
  "afrchess",
  "keithonsky",
];

const clampIndex = (index: number, length: number) => {
  if (!Number.isFinite(index) || length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
};

const normalizeChannel = (value: string) => value.trim().replace(/^@/, "").toLowerCase();
const isElementVisible = (node: HTMLElement | null) => {
  if (!node || typeof window === "undefined") return false;
  let current: HTMLElement | null = node;
  while (current) {
    const styles = window.getComputedStyle(current);
    const opacity = Number(styles.opacity);
    if (styles.display === "none" || styles.visibility === "hidden" || opacity <= 0.01) {
      return false;
    }
    current = current.parentElement;
  }
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  return rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
};

export default function TwitchChannelPlaylist({
  channels,
  startIndex = 0,
  autoplay = true,
  muted = true,
  className,
  aspectRatio = "16/9",
  rotateMs = 120000,
  refreshMs = 90000,
}: Props) {
  const sourceChannels = channels && channels.length ? channels : DEFAULT_CHANNELS;
  const playlist = useMemo(
    () =>
      sourceChannels
        .map((channel) => normalizeChannel(String(channel)))
        .filter((channel) => channel.length > 0),
    [sourceChannels],
  );

  const [currentIndex, setCurrentIndex] = useState(() => clampIndex(startIndex, playlist.length));
  const [liveChannels, setLiveChannels] = useState<string[]>([]);
  const [playerState, setPlayerState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [userActivated, setUserActivated] = useState(false);

  useEffect(() => {
    setCurrentIndex(clampIndex(startIndex, playlist.length));
  }, [startIndex, playlist.length]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const updateVisibility = () => setIsVisible(isElementVisible(node));
    updateVisibility();
    if (typeof window === "undefined") return;
    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.target === node) {
              updateVisibility();
            }
          });
        },
        { threshold: 0.35 },
      );
      observer.observe(node);
    }
    const interval = window.setInterval(updateVisibility, 500);
    return () => {
      if (observer) observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const parents = useMemo(() => {
    const base = ["pawnpoint.app", "www.pawnpoint.app", "localhost", "127.0.0.1"];
    if (typeof window === "undefined") return base;
    const hostname = window.location.hostname;
    if (hostname && !base.includes(hostname)) base.push(hostname);
    return base;
  }, []);

  useEffect(() => {
    if (!playlist.length) return;
    let cancelled = false;
    const controller = new AbortController();

    const loadLive = async () => {
      try {
        const params = new URLSearchParams({ channels: playlist.join(",") });
        const res = await fetch(`/api/twitch/chess-tv?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Twitch status ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const liveList = Array.isArray(data?.liveList) ? data.liveList : [];
        const liveFromList = liveList
          .map((entry) => normalizeChannel(entry?.user_login))
          .filter((entry) => entry && playlist.includes(entry));
        const selected =
          typeof data?.selected?.user_login === "string" ? normalizeChannel(data.selected.user_login) : "";
        const combined = selected ? [selected, ...liveFromList] : liveFromList;
        const unique = Array.from(new Set(combined));
        setLiveChannels(data?.live ? unique : []);
      } catch {
        if (!cancelled) setLiveChannels([]);
      }
    };

    loadLive();
    const interval = window.setInterval(loadLive, Math.max(refreshMs, 30000));
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
  }, [playlist, refreshMs]);

  const activeList = useMemo(
    () => (liveChannels.length ? liveChannels : userActivated ? playlist : []),
    [liveChannels, userActivated, playlist],
  );
  const activeListKey = activeList.join("|");

  useEffect(() => {
    setCurrentIndex(clampIndex(0, activeList.length));
  }, [activeListKey, activeList.length]);

  useEffect(() => {
    if (activeList.length < 2 || rotateMs <= 0) return;
    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeList.length);
    }, rotateMs);
    return () => clearInterval(interval);
  }, [activeListKey, activeList.length, rotateMs]);

  const activeChannel = activeList[currentIndex] ?? "";
  const shouldMount = isVisible && activeList.length > 0;
  const shouldAutoplay = (autoplay && isVisible && activeList.length > 0) || userActivated;
  const src = useMemo(() => {
    if (!activeChannel || !shouldMount) return "";
    const params = new URLSearchParams();
    params.set("channel", activeChannel.toLowerCase());
    parents.forEach((parent) => params.append("parent", parent));
    params.set("autoplay", shouldAutoplay ? "true" : "false");
    params.set("muted", muted ? "true" : "false");
    params.set("playsinline", "true");
    return `https://player.twitch.tv/?${params.toString()}`;
  }, [activeChannel, parents, shouldAutoplay, muted, shouldMount]);

  useEffect(() => {
    if (!src || !shouldMount) {
      setPlayerState("idle");
      return;
    }
    setPlayerState("loading");
  }, [src, shouldMount]);

  const handleError = () => {
    setPlayerState("error");
    if (activeList.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % activeList.length);
    }
  };

  if (!playlist.length) {
    return (
      <div className={className} style={{ padding: 16, borderRadius: 12, background: "#111", color: "#fff", fontSize: 14 }}>
        No channels configured.
      </div>
    );
  }

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          aspectRatio,
          borderRadius: 14,
          overflow: "hidden",
          background: "black",
          flex: 1,
          position: "relative",
        }}
      >
        {!shouldMount && (
          <button
            type="button"
            onClick={() => setUserActivated(true)}
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontSize: 14,
              background: "rgba(0,0,0,0.35)",
              zIndex: 1,
              border: "none",
              width: "100%",
              cursor: "pointer",
            }}
          >
            {!isVisible
              ? "Scroll to load Chess TV."
              : liveChannels.length
                ? "Tap to open Chess TV."
                : "No live channels right now. Tap to browse all channels."}
          </button>
        )}
        {shouldMount && playerState !== "ready" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontSize: 14,
              background: "rgba(0,0,0,0.4)",
              zIndex: 1,
            }}
          >
            {playerState === "error" ? "Reloading stream..." : "Loading stream..."}
          </div>
        )}
        {shouldMount && (
          <iframe
            key={`${activeChannel}-${shouldAutoplay}-${muted}`}
            src={src}
            width="100%"
            height="100%"
            frameBorder={0}
            scrolling="no"
            allow="autoplay; fullscreen"
            onLoad={() => setPlayerState("ready")}
            onError={handleError}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        )}
      </div>
    </div>
  );
}
