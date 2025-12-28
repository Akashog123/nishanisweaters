import { useState } from "react";
import { Play } from "lucide-react";
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from "@/lib/youtube";

interface YouTubePlayerProps {
  videoId: string;
  title?: string;
  thumbnail?: string;
  className?: string;
}

/**
 * Lazy-loading YouTube player component.
 * Shows a thumbnail with play button initially, loads iframe on click.
 */
export function YouTubePlayer({
  videoId,
  title,
  thumbnail,
  className = "",
}: YouTubePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Use provided thumbnail or generate from video ID
  const thumbnailUrl = thumbnail || getYouTubeThumbnail(videoId, "maxresdefault");
  const embedUrl = getYouTubeEmbedUrl(videoId, true); // autoplay when loaded

  if (isPlaying) {
    return (
      <div className={`aspect-video w-full ${className}`}>
        <iframe
          src={embedUrl}
          title={title || "Product video"}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsPlaying(true)}
      className={`relative aspect-video w-full group ${className}`}
      aria-label={`Play ${title || "video"}`}
      type="button"
    >
      <img
        src={thumbnailUrl}
        alt={title || "Video thumbnail"}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to lower quality thumbnail if maxres doesn't exist
          const img = e.target as HTMLImageElement;
          if (img.src.includes("maxresdefault")) {
            img.src = getYouTubeThumbnail(videoId, "hqdefault");
          }
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
          <Play className="h-8 w-8 lg:h-10 lg:w-10 text-white ml-1" fill="white" />
        </div>
      </div>
    </button>
  );
}

export default YouTubePlayer;
