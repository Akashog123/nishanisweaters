import { describe, it, expect } from "vitest";
import {
  extractYouTubeVideoId,
  isValidYouTubeUrl,
  isValidYouTubeVideoId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  getYouTubeWatchUrl,
  parseYouTubeUrl,
} from "./youtube";

describe("YouTube utilities", () => {
  const VALID_VIDEO_ID = "dQw4w9WgXcQ";

  describe("extractYouTubeVideoId", () => {
    it("extracts ID from standard youtube.com URL", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
        .toBe(VALID_VIDEO_ID);
    });

    it("extracts ID from youtube.com URL without www", () => {
      expect(extractYouTubeVideoId("https://youtube.com/watch?v=dQw4w9WgXcQ"))
        .toBe(VALID_VIDEO_ID);
    });

    it("extracts ID from youtu.be short URL", () => {
      expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ"))
        .toBe(VALID_VIDEO_ID);
    });

    it("extracts ID from embed URL", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"))
        .toBe(VALID_VIDEO_ID);
    });

    it("extracts ID from shorts URL", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"))
        .toBe(VALID_VIDEO_ID);
    });

    it("extracts ID from URL with additional parameters", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s"))
        .toBe(VALID_VIDEO_ID);
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest"))
        .toBe(VALID_VIDEO_ID);
    });

    it("extracts ID from URL with parameters before v", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?list=PLtest&v=dQw4w9WgXcQ"))
        .toBe(VALID_VIDEO_ID);
    });

    it("returns the input if already a valid video ID", () => {
      expect(extractYouTubeVideoId("dQw4w9WgXcQ"))
        .toBe(VALID_VIDEO_ID);
    });

    it("returns null for invalid URLs", () => {
      expect(extractYouTubeVideoId("https://example.com")).toBeNull();
      expect(extractYouTubeVideoId("https://vimeo.com/12345")).toBeNull();
      expect(extractYouTubeVideoId("not a url")).toBeNull();
      expect(extractYouTubeVideoId("")).toBeNull();
    });

    it("returns null for null/undefined input", () => {
      expect(extractYouTubeVideoId(null as unknown as string)).toBeNull();
      expect(extractYouTubeVideoId(undefined as unknown as string)).toBeNull();
    });

    it("handles URLs with whitespace", () => {
      expect(extractYouTubeVideoId("  https://youtu.be/dQw4w9WgXcQ  "))
        .toBe(VALID_VIDEO_ID);
    });

    it("handles video IDs with underscores and hyphens", () => {
      expect(extractYouTubeVideoId("https://youtu.be/abc_def-123"))
        .toBe("abc_def-123");
    });
  });

  describe("isValidYouTubeUrl", () => {
    it("returns true for valid YouTube URLs", () => {
      expect(isValidYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
      expect(isValidYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
      expect(isValidYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true);
    });

    it("returns false for invalid URLs", () => {
      expect(isValidYouTubeUrl("https://example.com")).toBe(false);
      expect(isValidYouTubeUrl("not a url")).toBe(false);
      expect(isValidYouTubeUrl("")).toBe(false);
    });

    it("returns true for standalone valid video ID", () => {
      expect(isValidYouTubeUrl("dQw4w9WgXcQ")).toBe(true);
    });
  });

  describe("isValidYouTubeVideoId", () => {
    it("returns true for valid 11-character video IDs", () => {
      expect(isValidYouTubeVideoId("dQw4w9WgXcQ")).toBe(true);
      expect(isValidYouTubeVideoId("abc_def-123")).toBe(true);
    });

    it("returns false for invalid video IDs", () => {
      expect(isValidYouTubeVideoId("too_short")).toBe(false);
      expect(isValidYouTubeVideoId("this_is_way_too_long")).toBe(false);
      expect(isValidYouTubeVideoId("")).toBe(false);
      expect(isValidYouTubeVideoId("abc!def@123")).toBe(false);
    });
  });

  describe("getYouTubeThumbnail", () => {
    it("generates correct thumbnail URL with default quality", () => {
      expect(getYouTubeThumbnail("dQw4w9WgXcQ"))
        .toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    });

    it("supports different quality options", () => {
      expect(getYouTubeThumbnail("dQw4w9WgXcQ", "default"))
        .toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg");
      expect(getYouTubeThumbnail("dQw4w9WgXcQ", "mqdefault"))
        .toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg");
      expect(getYouTubeThumbnail("dQw4w9WgXcQ", "sddefault"))
        .toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/sddefault.jpg");
      expect(getYouTubeThumbnail("dQw4w9WgXcQ", "maxresdefault"))
        .toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg");
    });
  });

  describe("getYouTubeEmbedUrl", () => {
    it("generates correct embed URL without autoplay", () => {
      expect(getYouTubeEmbedUrl("dQw4w9WgXcQ"))
        .toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    });

    it("generates correct embed URL with autoplay", () => {
      expect(getYouTubeEmbedUrl("dQw4w9WgXcQ", true))
        .toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1");
    });
  });

  describe("getYouTubeWatchUrl", () => {
    it("generates correct watch URL", () => {
      expect(getYouTubeWatchUrl("dQw4w9WgXcQ"))
        .toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    });
  });

  describe("parseYouTubeUrl", () => {
    it("parses valid YouTube URL and returns video info", () => {
      const result = parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result).toEqual({
        videoId: "dQw4w9WgXcQ",
        thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      });
    });

    it("returns null for invalid URL", () => {
      expect(parseYouTubeUrl("https://example.com")).toBeNull();
      expect(parseYouTubeUrl("")).toBeNull();
    });
  });
});
