import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Star,
  CheckCircle,
  XCircle,
  Eye,
  ThumbsUp,
  ShieldCheck,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";

type ReviewStatus = "pending" | "approved" | "rejected";

// Star Rating display component
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: ReviewStatus }) {
  const variants = {
    pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
    approved: { color: "bg-green-100 text-green-800", icon: CheckCircle },
    rejected: { color: "bg-red-100 text-red-800", icon: XCircle },
  };

  const { color, icon: Icon } = variants[status];

  return (
    <Badge variant="outline" className={`${color} border-0 gap-1`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// Review detail dialog
function ReviewDetailDialog({
  review,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isLoading,
}: {
  review: {
    _id: Id<"reviews">;
    rating: number;
    title?: string;
    comment: string;
    userName: string;
    userEmail: string;
    productName: string;
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    status: ReviewStatus;
    createdAt: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}) {
  if (!review) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Review Details
            <StatusBadge status={review.status} />
          </DialogTitle>
          <DialogDescription>
            Review for {review.productName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rating and Title */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StarDisplay rating={review.rating} />
              <span className="text-sm text-muted-foreground">
                ({review.rating}/5)
              </span>
            </div>
            {review.title && (
              <h4 className="font-semibold text-lg">{review.title}</h4>
            )}
          </div>

          {/* Review Content */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm leading-relaxed">{review.comment}</p>
          </div>

          {/* Reviewer Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Reviewer</p>
              <p className="font-medium">{review.userName}</p>
              <p className="text-muted-foreground">{review.userEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Submitted</p>
              <p className="font-medium">
                {format(new Date(review.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex gap-2 flex-wrap">
            {review.isVerifiedPurchase && (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                Verified Purchase
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <ThumbsUp className="h-3 w-3" />
              {review.helpfulCount} found helpful
            </Badge>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {review.status === "pending" && (
            <>
              <Button
                variant="destructive"
                onClick={onReject}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
              <Button onClick={onApprove} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>
            </>
          )}
          {review.status !== "pending" && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminReviews() {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("pending");
  const [selectedReview, setSelectedReview] = useState<Parameters<typeof ReviewDetailDialog>[0]["review"]>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch reviews with filter
  const reviews = useQuery(
    api.reviews.listAllReviews,
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  const moderateReview = useMutation(api.reviews.moderateReview);

  const handleModerate = async (reviewId: Id<"reviews">, status: "approved" | "rejected") => {
    setIsLoading(true);
    try {
      await moderateReview({ reviewId, status });
      toast.success(`Review ${status}`);
      setIsDetailOpen(false);
      setSelectedReview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to moderate review");
    } finally {
      setIsLoading(false);
    }
  };

  const openReviewDetail = (review: NonNullable<typeof selectedReview>) => {
    setSelectedReview(review);
    setIsDetailOpen(true);
  };

  // Get counts for quick stats
  const pendingCount = reviews?.filter((r) => r.status === "pending").length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reviews</h1>
            <p className="text-muted-foreground">
              Moderate customer reviews before they appear on the store
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-base px-3 py-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {pendingCount} pending
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ReviewStatus | "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reviews</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reviews Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews === undefined ? (
                // Loading state
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <p className="text-muted-foreground">
                      {statusFilter === "pending"
                        ? "No pending reviews to moderate"
                        : "No reviews found"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => (
                  <TableRow key={review._id}>
                    <TableCell className="font-medium max-w-[150px] truncate">
                      {review.productName}
                    </TableCell>
                    <TableCell>
                      <StarDisplay rating={review.rating} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {review.userName}
                        {review.isVerifiedPurchase && (
                          <ShieldCheck className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {review.title || review.comment}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={review.status as ReviewStatus} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(review.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openReviewDetail({
                            ...review,
                            status: review.status as ReviewStatus,
                          })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {review.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleModerate(review._id, "approved")}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleModerate(review._id, "rejected")}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Review Detail Dialog */}
        <ReviewDetailDialog
          review={selectedReview}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedReview(null);
          }}
          onApprove={() => selectedReview && handleModerate(selectedReview._id, "approved")}
          onReject={() => selectedReview && handleModerate(selectedReview._id, "rejected")}
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  );
}
