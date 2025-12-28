import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Youtube, X, Check, Play, Loader2 } from "lucide-react";
import { parseYouTubeUrl, isValidYouTubeUrl } from "@/lib/youtube";

interface YouTubeVideoInputProps {
  onAdd: (videoInfo: { youtubeId: string; thumbnail: string; title?: string }) => Promise<void>;
  disabled?: boolean;
}

export function YouTubeVideoInput({ onAdd, disabled }: YouTubeVideoInputProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState<{ videoId: string; thumbnail: string; embedUrl: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    setPreview(null);
    setShowPreview(false);

    // Auto-parse valid URLs
    if (isValidYouTubeUrl(value)) {
      const parsed = parseYouTubeUrl(value);
      if (parsed) {
        setPreview(parsed);
      }
    }
  }, []);

  const handlePreview = useCallback(() => {
    if (!preview) {
      toast.error("Please enter a valid YouTube URL first");
      return;
    }
    setShowPreview(true);
  }, [preview]);

  const handleAdd = useCallback(async () => {
    if (!preview) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }

    setIsAdding(true);
    try {
      await onAdd({
        youtubeId: preview.videoId,
        thumbnail: preview.thumbnail,
        title: title || undefined,
      });
      // Reset form
      setUrl("");
      setTitle("");
      setPreview(null);
      setShowPreview(false);
      toast.success("YouTube video added successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add video");
    } finally {
      setIsAdding(false);
    }
  }, [preview, title, onAdd]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <Youtube className="h-5 w-5 text-red-600" />
        <h4 className="font-medium">Add YouTube Video</h4>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="youtube-url">YouTube URL</Label>
          <Input
            id="youtube-url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
            disabled={disabled || isAdding}
          />
          {url && !preview && (
            <p className="text-xs text-destructive">Invalid YouTube URL format</p>
          )}
          {preview && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Valid YouTube URL detected (ID: {preview.videoId})
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-title">Title (optional)</Label>
          <Input
            id="video-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Product Demo, Styling Guide"
            disabled={disabled || isAdding}
          />
        </div>

        {/* Thumbnail Preview */}
        {preview && !showPreview && (
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <img
              src={preview.thumbnail}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to lower quality thumbnail if maxres doesn't exist
                const img = e.target as HTMLImageElement;
                if (img.src.includes("hqdefault")) {
                  img.src = preview.thumbnail.replace("hqdefault", "mqdefault");
                }
              }}
            />
            <button
              onClick={handlePreview}
              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
              type="button"
            >
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </button>
          </div>
        )}

        {/* Embedded Video Preview */}
        {showPreview && preview && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Video Preview</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(false)}
                type="button"
              >
                <X className="h-4 w-4 mr-1" /> Close Preview
              </Button>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                src={preview.embedUrl}
                title="YouTube video preview"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        <Button
          onClick={handleAdd}
          disabled={!preview || disabled || isAdding}
          className="w-full"
          type="button"
        >
          {isAdding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Video to Product"
          )}
        </Button>
      </div>
    </div>
  );
}

export default YouTubeVideoInput;
