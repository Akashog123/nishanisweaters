import { useState, useRef, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Image as ImageIcon,
  Trash2,
  Loader2,
  Play,
  ExternalLink,
  Star,
} from "lucide-react";
import { MAX_FILE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from "@/lib/constants";
import { YouTubeVideoInput } from "./YouTubeVideoInput";
import { getYouTubeWatchUrl } from "@/lib/youtube";

interface ProductImage {
  url: string;
  storageId?: string;
  alt: string;
  order: number;
}

interface ProductVideo {
  youtubeId: string;
  title?: string;
  thumbnail: string;
  order: number;
}

interface ProductMediaUploadProps {
  productId: Id<"products">;
  images: ProductImage[];
  videos?: ProductVideo[];
  onImagesChange?: (images: ProductImage[]) => void;
  onVideosChange?: (videos: ProductVideo[]) => void;
  disabled?: boolean;
}

export function ProductMediaUpload({
  productId,
  images,
  videos = [],
  disabled = false,
}: ProductMediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.fileStorage.generateAdminUploadUrl);
  const saveImage = useAction(api.fileStorage.saveProductImage);
  const deleteImage = useMutation(api.fileStorage.deleteProductImage);
  const reorderImages = useMutation(api.fileStorage.reorderProductImages);
  const saveYouTubeVideo = useMutation(api.fileStorage.saveYouTubeVideo);
  const deleteYouTubeVideo = useMutation(api.fileStorage.deleteYouTubeVideo);

  const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
      };
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
      return {
        valid: false,
        error: "Only JPEG, PNG, and WebP images are allowed",
      };
    }

    return { valid: true };
  };

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Copy the files to an array immediately before clearing the input
    const filesList = event.target.files;
    if (!filesList || filesList.length === 0) return;

    // Create a static array of files so it doesn't get cleared when we reset the input
    const filesToUpload = Array.from(filesList);
    const totalFiles = filesToUpload.length;

    // Now it's safe to clear the input
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let skippedFiles = 0;
      let completedFiles = 0;
      console.log(`Starting upload process for ${totalFiles} file(s)`);

      for (const file of filesToUpload) {
        console.log(`Checking file: ${file.name} | type: "${file.type}" | size: ${file.size}`);
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          skippedFiles++;
          continue;
        }

        // Get upload URL
        setUploadProgress((completedFiles / totalFiles) * 50);
        let uploadUrl;
        try {
          uploadUrl = await generateUploadUrl();
        } catch (err) {
          console.error("Failed to get upload URL:", err);
          throw new Error("Failed to get upload URL. Are you an admin?");
        }

        // Upload file
        setUploadProgress((completedFiles / totalFiles) * 50 + 25);
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("File upload failed:", response.status, errorText);
          throw new Error(`Failed to upload ${file.name}: ${response.status}`);
        }

        const { storageId } = await response.json();
        if (!storageId) {
          console.error("No storageId in response:", await response.json());
          throw new Error("No storage ID returned from upload");
        }

        // Save to product
        try {
          await saveImage({
            storageId,
            productId,
            alt: file.name ? file.name.replace(/\.[^/.]+$/, "") : "Product Image",
            contentType: file.type || "image/jpeg",
          });
        } catch (err) {
          console.error("Failed to save image to product:", err);
          const errorMessage = err instanceof Error ? err.message : String(err);
          throw new Error(`Failed saving image: ${errorMessage}`);
        }

        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }

      if (skippedFiles > 0) {
        toast.warning(`Uploaded ${completedFiles} image(s). Skipped ${skippedFiles} invalid file(s).`);
      } else {
        toast.success(`Uploaded ${completedFiles} image(s)`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [generateUploadUrl, saveImage, productId]);

  const handleDeleteImage = useCallback(async (storageId: string) => {
    try {
      await deleteImage({ productId, storageId });
      toast.success("Image deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete image");
    }
  }, [deleteImage, productId]);

  const handleSetPrimaryImage = useCallback(async (imageToMakePrimary: ProductImage) => {
    try {
      if (!imageToMakePrimary.storageId) return; // Can't make placeholder primary

      const newOrder = images
        .filter((img): img is ProductImage & { storageId: string } => !!img.storageId)
        .map((img) => {
          if (img.storageId === imageToMakePrimary.storageId) {
            return { storageId: img.storageId, order: 0 };
          }
          // Shift other images down
          return { storageId: img.storageId, order: img.order + 1 };
        });

      await reorderImages({ productId, imageOrder: newOrder });
      toast.success("Primary image updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set primary image");
    }
  }, [reorderImages, productId, images]);

  const handleAddYouTubeVideo = useCallback(async (videoInfo: {
    youtubeId: string;
    thumbnail: string;
    title?: string;
  }) => {
    await saveYouTubeVideo({
      productId,
      youtubeId: videoInfo.youtubeId,
      thumbnail: videoInfo.thumbnail,
      title: videoInfo.title,
    });
  }, [saveYouTubeVideo, productId]);

  const handleDeleteYouTubeVideo = useCallback(async (youtubeId: string) => {
    try {
      await deleteYouTubeVideo({ productId, youtubeId });
      toast.success("Video removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove video");
    }
  }, [deleteYouTubeVideo, productId]);

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Product Images</h4>
          <span className="text-xs text-muted-foreground">
            {images.length} image(s)
          </span>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            disabled || isUploading
              ? "border-muted-foreground/20 bg-muted/50 cursor-not-allowed"
              : "border-muted-foreground/25 hover:border-primary/50 cursor-pointer"
          }`}
          onClick={() => !disabled && !isUploading && imageInputRef.current?.click()}
        >
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {isUploading ? (
            <div className="space-y-3">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
              <p className="text-sm font-medium">Uploading images...</p>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Click to upload product images
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP up to 20MB each. Multiple files supported.
              </p>
            </>
          )}
        </div>

        {/* Image Grid */}
        {images.filter(img => img.url !== "/placeholder.svg").length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images
              .filter(img => img.url !== "/placeholder.svg")
              .sort((a, b) => a.order - b.order)
              .map((image, index) => (
                <div
                  key={image.storageId || image.url}
                  className="relative group aspect-square rounded-lg overflow-hidden border"
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {image.storageId && index !== 0 && (
                      <Button
                        variant="secondary"
                        size="icon"
                        title="Set as Primary Image"
                        className="h-8 w-8 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimaryImage(image);
                        }}
                        disabled={disabled}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    {image.storageId && (
                      <Button
                        variant="destructive"
                        size="icon"
                        title="Delete Image"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.storageId!);
                        }}
                        disabled={disabled}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {index === 0 && (
                    <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded shadow-sm">
                      Primary
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* YouTube Videos Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Product Videos (YouTube)</h4>
          <span className="text-xs text-muted-foreground">
            {videos.length} video(s)
          </span>
        </div>

        {/* Add Video Form */}
        <YouTubeVideoInput
          onAdd={handleAddYouTubeVideo}
          disabled={disabled}
        />

        {/* Video List */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos
              .sort((a, b) => a.order - b.order)
              .map((video) => (
                <div
                  key={video.youtubeId}
                  className="relative group rounded-lg overflow-hidden border bg-muted"
                >
                  <div className="aspect-video relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title || "Product video"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-background">
                    <p className="text-sm font-medium truncate">
                      {video.title || `Video ${video.order + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID: {video.youtubeId}
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(getYouTubeWatchUrl(video.youtubeId), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteYouTubeVideo(video.youtubeId)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductMediaUpload;
