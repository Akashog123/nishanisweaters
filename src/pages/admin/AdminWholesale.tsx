import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Mail,
  Globe,
  MapPin,
  Calendar,
  Crown,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/formatting";
import { logger } from "@/lib/logger";

// Application Status Configuration
const statusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { variant: "outline", label: "Pending", icon: Clock },
  under_review: { variant: "secondary", label: "Under Review", icon: Eye },
  approved: { variant: "default", label: "Approved", icon: CheckCircle },
  rejected: { variant: "destructive", label: "Rejected", icon: XCircle },
};

// Status Badge
const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] || { variant: "outline" as const, label: status, icon: Clock };
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Tier Badge
const TierBadge = ({ tier }: { tier?: string }) => {
  if (!tier) return <span className="text-muted-foreground">-</span>;

  const tierConfig: Record<string, { label: string; className: string }> = {
    tier1: { label: "Tier 1", className: "bg-amber-100 text-amber-800 border-amber-300" },
    tier2: { label: "Tier 2", className: "bg-gray-100 text-gray-800 border-gray-300" },
    tier3: { label: "Tier 3", className: "bg-orange-100 text-orange-800 border-orange-300" },
  };

  const config = tierConfig[tier] || { label: tier, className: "" };

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${config.className}`}>
      <Crown className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Define wholesale document type
interface WholesaleDocument {
  type: string;
  url: string;
  storageId: string;
  uploadedAt: number;
}

// Application Details Dialog
const ApplicationDetailsDialog = ({
  application,
  open,
  onOpenChange,
  onReview,
}: {
  application: Doc<"wholesaleApplications"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview: (
    applicationId: Id<"wholesaleApplications">,
    status: "approved" | "rejected" | "under_review",
    assignedTier?: string,
    reviewNotes?: string,
    rejectionReason?: string
  ) => void;
}) => {
  const [assignedTier, setAssignedTier] = useState(application?.requestedTier || "tier1");
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  if (!application) return null;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onReview(application._id, "approved", assignedTier, reviewNotes);
      onOpenChange(false);
    } catch (error) {
      logger.error("Error approving application", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReview(
        application._id,
        "rejected",
        undefined,
        reviewNotes,
        rejectionReason
      );
      setShowRejectDialog(false);
      onOpenChange(false);
    } catch (error) {
      logger.error("Error rejecting application", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkUnderReview = async () => {
    setIsProcessing(true);
    try {
      await onReview(application._id, "under_review", undefined, reviewNotes);
    } catch (error) {
      logger.error("Error updating application", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {application.companyName}
              <StatusBadge status={application.status} />
            </DialogTitle>
            <DialogDescription>
              Submitted on {formatDateTime(application.submittedAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Business Information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Company Name</Label>
                    <p className="font-medium">{application.companyName}</p>
                  </div>
                  {application.businessEmail && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Business Email
                        </Label>
                        <p>{application.businessEmail}</p>
                      </div>
                    </div>
                  )}
                  {application.gstNumber && (
                    <div>
                      <Label className="text-xs text-muted-foreground">GST Number</Label>
                      <p className="font-mono">{application.gstNumber}</p>
                    </div>
                  )}
                  {application.website && (
                    <div className="flex items-start gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <Label className="text-xs text-muted-foreground">Website</Label>
                        <a
                          href={application.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline block"
                        >
                          {application.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Business Address */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Business Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{application.businessAddress.street}</p>
                <p>
                  {application.businessAddress.city},{" "}
                  {application.businessAddress.state}{" "}
                  {application.businessAddress.postalCode}
                </p>
                <p>{application.businessAddress.country}</p>
              </CardContent>
            </Card>

            {/* Documents */}
            {application.documents && application.documents.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Uploaded Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {application.documents.map((doc: WholesaleDocument, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">
                            {doc.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View Document
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Requested Tier */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Tier Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Requested:</span>
                  <TierBadge tier={application.requestedTier} />
                </div>
              </CardContent>
            </Card>

            {/* Review Section */}
            {application.status === "pending" || application.status === "under_review" ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Review Application</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Assign Tier (if approved)</Label>
                    <Select value={assignedTier} onValueChange={setAssignedTier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tier1">Tier 1 (Basic - 20% discount)</SelectItem>
                        <SelectItem value="tier2">Tier 2 (Standard - 30% discount)</SelectItem>
                        <SelectItem value="tier3">Tier 3 (Premium - 40% discount)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Review Notes (Internal)</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add any notes about this application..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Review Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {application.reviewedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Reviewed: {formatDateTime(application.reviewedAt)}</span>
                    </div>
                  )}
                  {application.reviewNotes && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <p className="text-sm">{application.reviewNotes}</p>
                    </div>
                  )}
                  {application.rejectionReason && (
                    <div>
                      <Label className="text-xs text-muted-foreground text-red-600">
                        Rejection Reason
                      </Label>
                      <p className="text-sm text-red-600">{application.rejectionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {(application.status === "pending" || application.status === "under_review") && (
              <>
                {application.status === "pending" && (
                  <Button
                    variant="secondary"
                    onClick={handleMarkUnderReview}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Mark as Under Review
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isProcessing}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={isProcessing}>
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ThumbsUp className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this wholesale application.
              This will be communicated to the applicant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label>Rejection Reason</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectionReason.trim() || isProcessing}
              className="bg-red-500 hover:bg-red-600"
            >
              {isProcessing ? "Rejecting..." : "Reject Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const AdminWholesale = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApplication, setSelectedApplication] = useState<Doc<"wholesaleApplications"> | null>(null);
  const itemsPerPage = 10;

  // Fetch applications
  const applicationsResult = useQuery(api.wholesaleApplications.listApplications, {});

  // Mutations
  const reviewApplication = useMutation(api.wholesaleApplications.reviewApplication);

  // Extract applications array from paginated result
  const allApplications = applicationsResult?.applications ?? [];

  // Filter applications
  const filteredApplications = allApplications.filter((app) => {
    const matchesSearch = app.companyName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle review
  const handleReview = async (
    applicationId: Id<"wholesaleApplications">,
    status: "approved" | "rejected" | "under_review",
    assignedTier?: string,
    reviewNotes?: string,
    rejectionReason?: string
  ) => {
    try {
      await reviewApplication({
        applicationId,
        status,
        assignedTier: assignedTier as "tier1" | "tier2" | "tier3" | undefined,
        reviewNotes,
        rejectionReason,
        reviewedBy: "admin",
      });
      toast.success(
        `Application ${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "updated"} successfully`
      );
    } catch (error) {
      toast.error("Failed to update application");
      throw error;
    }
  };

  // Count applications by status
  const statusCounts = {
    all: allApplications.length,
    pending: allApplications.filter((a) => a.status === "pending").length,
    under_review: allApplications.filter((a) => a.status === "under_review").length,
    approved: allApplications.filter((a) => a.status === "approved").length,
    rejected: allApplications.filter((a) => a.status === "rejected").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Wholesale Applications
            </h1>
            <p className="text-muted-foreground">
              Review and manage wholesale account applications
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "all" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setStatusFilter("all")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">All</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.all}</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "pending" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setStatusFilter("pending")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600">
                <Clock className="h-4 w-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {statusCounts.pending}
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "under_review" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setStatusFilter("under_review")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-600">
                <Eye className="h-4 w-4" />
                Under Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statusCounts.under_review}
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "approved" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setStatusFilter("approved")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statusCounts.approved}
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              statusFilter === "rejected" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setStatusFilter("rejected")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statusCounts.rejected}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by company name..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Application List</CardTitle>
            <CardDescription>
              {filteredApplications.length} applications found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Business Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Requested Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedApplications.map((app) => (
                  <TableRow key={app._id}>
                    <TableCell>
                      <div className="font-medium">{app.companyName}</div>
                      {app.gstNumber && (
                        <div className="text-xs text-muted-foreground font-mono">
                          GST: {app.gstNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-[180px]">
                        {app.businessEmail || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {app.businessAddress.city}, {app.businessAddress.state}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={app.requestedTier} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(app.submittedAt)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedApplication(app)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {app.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => {
                                setSelectedApplication(app);
                              }}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedApplication(app);
                              }}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedApplications.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No applications found</p>
                      <p className="text-sm">
                        Try adjusting your search or filters
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredApplications.length)}{" "}
                  of {filteredApplications.length} applications
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Details Dialog */}
        <ApplicationDetailsDialog
          application={selectedApplication}
          open={!!selectedApplication}
          onOpenChange={(open) => {
            if (!open) setSelectedApplication(null);
          }}
          onReview={handleReview}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminWholesale;
