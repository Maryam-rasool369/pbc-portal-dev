import { useEffect, useRef, useState } from "react";
import { HiPause, HiPlay } from "react-icons/hi";

interface VoiceMessagePlayerProps {
  url: string;
  duration?: number | null;
  isMine: boolean;
}

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function VoiceMessagePlayer({ url, duration, isMine }: VoiceMessagePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) setTotalDuration(audio.duration);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      void audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !totalDuration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * totalDuration;
    setCurrentTime(audio.currentTime);
  };

  const progress = totalDuration ? Math.min(1, currentTime / totalDuration) : 0;
  const playButtonClasses = isMine
    ? "bg-gray-900/15 text-gray-900 hover:bg-gray-900/25"
    : "bg-gold-500/20 text-gold-400 hover:bg-gold-500/30";
  const trackFillClass = isMine ? "bg-gray-900/70" : "bg-gold-400";
  const trackBaseClass = isMine ? "bg-gray-900/20" : "bg-gray-700";
  const timeClass = isMine ? "text-gray-800/70" : "text-gray-400";

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] py-0.5">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${playButtonClasses}`}
      >
        {isPlaying ? (
          // @ts-ignore
          <HiPause className="w-4 h-4" />
        ) : (
          // @ts-ignore
          <HiPlay className="w-4 h-4 ml-0.5" />
        )}
      </button>

      <div
        ref={trackRef}
        onClick={handleSeek}
        className={`relative flex-1 h-1.5 rounded-full cursor-pointer ${trackBaseClass}`}
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${trackFillClass}`}
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow ${trackFillClass}`}
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <span className={`text-[11px] tabular-nums flex-shrink-0 ${timeClass}`}>
        {formatTime(isPlaying || currentTime > 0 ? currentTime : totalDuration)}
      </span>
    </div>
  );
}
