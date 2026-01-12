import React, { useEffect, useMemo, useState } from "react";

type Props = {
  channels: string[];          // your playlist of channels
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
  aspectRatio?: string;        // e.g. "16/9"
};

export default function TwitchChannelPlaylist({
  channels,
  autoplay = true,
  muted = true,
  className,
  aspectRatio = "16/9",
}: Props) {
  const safeChannels = useMemo(
    () => channels.map(c => c.trim()).filter(Boolean),
    [channels]
  );

  const [liveChannels, setLiveChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChannel, setCurrentChannel] = useState("chess");

  // Parent must match current domain (fixes domain-change breakage)
  const parent = typeof window !== "undefined" ? window.location.hostname : "";

  // Fetch live channels
  useEffect(() => {
    let cancelled = false;

    const fetchLiveChannels = async () => {
      try {
        const res = await fetch("/api/twitch/chess-tv");
        if (!res.ok) throw new Error("Failed to fetch live channels");
        const data = await res.json();

        if (cancelled) return;

        // If we have live data, pick the first live channel
        if (data?.live && data?.selected?.user_login) {
          const liveChannel = (data.selected.user_login as string).toLowerCase();
          setCurrentChannel(liveChannel);
          setLiveChannels([liveChannel]);
        } else {
          // Fallback to chess
          setCurrentChannel("chess");
          setLiveChannels(["chess"]);
        }
      } catch (error) {
        if (!cancelled) {
          // Fallback to chess on error
          setCurrentChannel("chess");
          setLiveChannels(["chess"]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchLiveChannels();

    return () => {
      cancelled = true;
    };
  }, []);

  const src = useMemo(() => {
    const base = `https://player.twitch.tv/?channel=${encodeURIComponent(
      currentChannel
    )}&parent=${encodeURIComponent(parent)}`;

    const params = `&autoplay=${autoplay ? "true" : "false"}&muted=${muted ? "true" : "false"}&playsinline=true`;

    return base + params;
  }, [currentChannel, parent, autoplay, muted]);

  if (loading) {
    return (
      <div className={className} style={{ padding: 16, borderRadius: 12, background: "#111", color: "#fff", fontSize: 14 }}>
        Loading stream...
      </div>
    );
  }

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Player only - no controls */}
      <div style={{ width: "100%", aspectRatio, borderRadius: 14, overflow: "hidden", background: "black", flex: 1 }}>
        <iframe
          key={`${currentChannel}-${parent}-${autoplay}-${muted}`}
          src={src}
          width="100%"
          height="100%"
          allowFullScreen
          frameBorder={0}
          scrolling="no"
          allow="autoplay; fullscreen"
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
    </div>
  );
}
