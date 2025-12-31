import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Star, ThumbsUp, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ProductReviewsProps {
  productId: Id<"products">;
}

// Star Rating Component
function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = "md",
}: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRatingChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hoverRating || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// Review Card Component
function ReviewCard({
  review,
  onHelpful,
}: {
  review: {
    _id: Id<"reviews">;
    rating: number;
    title?: string;
    comment: string;
    userName: string;
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: number;
  };
  onHelpful: (reviewId: Id<"reviews">) => void;
}) {
  return (
    <div className="py-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={review.rating} readonly size="sm" />
            {review.title && (
              <span className="font-semibold">{review.title}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{review.userName}</span>
            {review.isVerifiedPurchase && (
              <Badge variant="secondary" className="text-xs gap-1">
                <CheckCircle className="h-3 w-3" />
                Verified Purchase
              </Badge>
            )}
            <span>-</span>
            <span>{format(new Date(review.createdAt), "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm">{review.comment}</p>
      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1"
          onClick={() => onHelpful(review._id)}
        >
          <ThumbsUp className="h-4 w-4" />
          Helpful ({review.helpfulCount})
        </Button>
      </div>
    </div>
  );
}

// Write Review Dialog
function WriteReviewDialog({
  productId,
  isVerifiedPurchase,
  onSuccess,
}: {
  productId: Id<"products">;
  isVerifiedPurchase: boolean;
  onSuccess: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReview = useMutation(api.reviews.submitReview);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (comment.trim().length < 10) {
      toast.error("Review must be at least 10 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      await submitReview({
        productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });

      toast.success("Review submitted! It will appear after approval.");
      setIsOpen(false);
      setRating(0);
      setTitle("");
      setComment("");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Write a Review</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            Share your experience with this product
            {isVerifiedPurchase && (
              <Badge variant="secondary" className="ml-2 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified Purchase
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRating rating={rating} onRatingChange={setRating} size="lg" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder="Summarize your review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Review</Label>
            <Textarea
              id="comment"
              placeholder="What did you like or dislike about this product?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground">
              {comment.length}/500 characters (minimum 10)
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main ProductReviews Component
export function ProductReviews({ productId }: ProductReviewsProps) {
  const { user, isSignedIn } = useUser();
  const reviews = useQuery(api.reviews.getProductReviews, { productId });
  const stats = useQuery(api.reviews.getProductReviewStats, { productId });
  const canReview = useQuery(
    api.reviews.canUserReview,
    user ? { productId } : "skip"
  );
  const markHelpful = useMutation(api.reviews.markHelpful);

  // Check if current user is admin (to hide write review button)
  const dbUser = useQuery(api.users.getCurrentUser, isSignedIn ? {} : "skip");
  const isAdmin = dbUser?.role === "admin";

  const handleHelpful = async (reviewId: Id<"reviews">) => {
    try {
      await markHelpful({ reviewId });
      toast.success("Thanks for your feedback!");
    } catch {
      toast.error("Failed to mark as helpful");
    }
  };

  if (reviews === undefined || stats === undefined) {
    return (
      <div className="py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

      {/* Review Stats */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <StarRating rating={stats.averageRating} readonly size="md" />
            <p className="text-sm text-muted-foreground mt-1">
              {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingDistribution[star as 1 | 2 | 3 | 4 | 5];
              const percentage = stats.totalReviews > 0
                ? (count / stats.totalReviews) * 100
                : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm w-12">{star} star</span>
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="text-sm text-muted-foreground w-8">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center md:justify-end">
          {/* Hide write review section for admin users */}
          {!isAdmin && (
            user ? (
              canReview?.canReview ? (
                <WriteReviewDialog
                  productId={productId}
                  isVerifiedPurchase={canReview.isVerifiedPurchase || false}
                  onSuccess={() => {}}
                />
              ) : canReview?.reason === "already_reviewed" ? (
                <p className="text-muted-foreground">
                  You have already reviewed this product
                </p>
              ) : canReview?.reason === "not_purchased" ? (
                <p className="text-muted-foreground text-sm">
                  Only customers who have purchased this product can write a review
                </p>
              ) : null
            ) : (
              <p className="text-muted-foreground">
                Sign in to write a review
              </p>
            )
          )}
        </div>
      </div>

      <Separator />

      {/* Reviews List */}
      <div className="mt-6">
        {reviews.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          <div className="divide-y">
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                onHelpful={handleHelpful}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
