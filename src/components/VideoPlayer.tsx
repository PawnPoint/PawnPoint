import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

type VideoPlayerProps = {
  src: string;
  title?: string;
  className?: string;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function VideoPlayer({ src, title = "Video lesson", className = "" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
    setDuration(0);
    setProgress(0);
  }, [src]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      await video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  };

  const seekTo = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setProgress(value);
  };

  const skip = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    seekTo(Math.min(Math.max(video.currentTime + delta, 0), duration || video.duration || 0));
  };

  const updateVolume = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const enterFullscreen = () => {
    const video = videoRef.current;
    const container = video?.parentElement;
    container?.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className={`group relative aspect-video w-full overflow-hidden rounded-[18px] bg-black ${className}`}>
      <video
        ref={videoRef}
        key={src}
        src={src}
        title={title}
        className="h-full w-full object-contain"
        playsInline
        crossOrigin="anonymous"
        muted={muted}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/45 bg-white/20 text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-white/28"
          aria-label="Play video"
        >
          <Play className="ml-1 h-8 w-8" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/88 via-black/45 to-transparent px-4 pb-4 pt-16">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-white">
          <span>{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.1)}
            step="0.1"
            value={Math.min(progress, duration || 0)}
            onChange={(event) => seekTo(Number(event.target.value))}
            className="h-1 min-w-0 flex-1 accent-white"
            aria-label="Video progress"
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => skip(-10)} className="p-1.5 text-white/80 transition hover:text-white" aria-label="Back 10 seconds">
              <SkipBack className="h-4 w-4" />
            </button>
            <button type="button" onClick={togglePlay} className="p-1.5 text-white/90 transition hover:text-white" aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button type="button" onClick={() => skip(10)} className="p-1.5 text-white/80 transition hover:text-white" aria-label="Forward 10 seconds">
              <SkipForward className="h-4 w-4" />
            </button>
            <button type="button" onClick={toggleMute} className="p-1.5 text-white/80 transition hover:text-white" aria-label={muted ? "Unmute" : "Mute"}>
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => updateVolume(Number(event.target.value))}
              className="hidden w-20 accent-white sm:block"
              aria-label="Volume"
            />
          </div>
          <button type="button" onClick={enterFullscreen} className="p-1.5 text-white/80 transition hover:text-white" aria-label="Fullscreen">
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
