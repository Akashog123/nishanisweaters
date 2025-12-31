import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, FileText, Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DocumentUpload from "@/components/DocumentUpload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Validation schema for wholesale application
const wholesaleFormSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  businessEmail: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  gstNumber: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
      message: "Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)",
    })
    .optional()
    .or(z.literal("")),
  street: z
    .string()
    .min(5, "Street address must be at least 5 characters")
    .max(200, "Street address must be less than 200 characters"),
  city: z
    .string()
    .min(2, "City must be at least 2 characters")
    .max(50, "City must be less than 50 characters"),
  state: z
    .string()
    .min(2, "State must be at least 2 characters")
    .max(50, "State must be less than 50 characters"),
  postalCode: z
    .string()
    .regex(/^[0-9]{6}$/, "Please enter a valid 6-digit postal code"),
  country: z.string().min(2, "Please select a country"),
  website: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

type WholesaleFormValues = z.infer<typeof wholesaleFormSchema>;

const WholesaleRegistration = () => {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{
    type: "reseller_certificate" | "business_license" | "gst_certificate" | "other";
    storageId: string;
    url: string;
    fileName: string;
    uploadedAt: number;
  }>>([]);

  // Handle document upload callback
  const handleDocumentUploaded = useCallback((doc: typeof uploadedDocuments[0]) => {
    setUploadedDocuments(prev => [...prev, doc]);
  }, []);

  // Handle document removal callback
  const handleDocumentRemoved = useCallback((storageId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.storageId !== storageId));
  }, []);

  // Check for existing application
  const existingApplication = useQuery(
    api.wholesaleApplications.getUserApplication,
    isSignedIn ? {} : "skip"
  );

  // SECURITY: Use server-side identity verification - never pass client clerkId
  const userProfile = useQuery(
    api.users.getUserByClerkId,
    user ? {} : "skip"
  );

  // Submit mutation
  const submitApplication = useMutation(api.wholesaleApplications.submitWholesaleApplication);

  const form = useForm<WholesaleFormValues>({
    resolver: zodResolver(wholesaleFormSchema),
    defaultValues: {
      companyName: "",
      businessEmail: user?.emailAddresses?.[0]?.emailAddress || "",
      gstNumber: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
      website: "",
    },
  });

  const onSubmit = async (values: WholesaleFormValues) => {
    if (!user?.id) {
      setSubmitError("You must be signed in to submit an application");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare documents for submission
      const documentsPayload = uploadedDocuments.map(doc => ({
        type: doc.type,
        url: doc.url,
        storageId: doc.storageId,
      }));

      await submitApplication({
        companyName: values.companyName,
        businessEmail: values.businessEmail || undefined,
        gstNumber: values.gstNumber || undefined,
        businessAddress: {
          street: values.street,
          city: values.city,
          state: values.state,
          postalCode: values.postalCode,
          country: values.country,
        },
        website: values.website || undefined,
        documents: documentsPayload.length > 0 ? documentsPayload : undefined,
      });

      setSubmitSuccess(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit application. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (!isUserLoaded) {
    return (
      <Layout>
        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <Layout>
        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to apply for a wholesale account.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/sign-in">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Already has pending or approved application
  if (existingApplication && existingApplication.status !== "rejected") {
    return (
      <Layout>
        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              {existingApplication.status === "approved" ? (
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              ) : (
                <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
              )}
              <CardTitle>
                {existingApplication.status === "approved"
                  ? "Application Approved"
                  : "Application Pending"}
              </CardTitle>
              <CardDescription>
                {existingApplication.status === "approved"
                  ? "Congratulations! Your wholesale application has been approved."
                  : "Your wholesale application is currently under review."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Status</span>
                <Badge
                  variant={
                    existingApplication.status === "approved"
                      ? "default"
                      : existingApplication.status === "under_review"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {existingApplication.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Company</span>
                <span className="text-sm">{existingApplication.companyName}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">Submitted</span>
                <span className="text-sm">
                  {new Date(existingApplication.submittedAt).toLocaleDateString()}
                </span>
              </div>
              {existingApplication.status === "approved" && (
                <Button asChild className="w-full">
                  <Link to="/wholesale/dashboard">Go to Dashboard</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Submission success
  if (submitSuccess) {
    return (
      <Layout>
        <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <CardTitle>Application Submitted</CardTitle>
              <CardDescription>
                Thank you for your application! We will review your information
                and get back to you within 2-3 business days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full">
                <Link to="/">Return to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-20">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Building2 className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">
              Wholesale Partner Application
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join our wholesale program and get access to exclusive pricing,
              dedicated support, and priority shipping for your business.
            </p>
          </div>

          {/* Benefits Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Wholesale Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="font-bold text-2xl text-primary mb-1">Exclusive</p>
                  <p className="text-sm text-muted-foreground">
                    Wholesale Pricing
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="font-bold text-2xl text-primary mb-1">Net 30</p>
                  <p className="text-sm text-muted-foreground">
                    Payment Terms
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="font-bold text-2xl text-primary mb-1">24/7</p>
                  <p className="text-sm text-muted-foreground">
                    Dedicated Support
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Form */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Please provide your business details to apply for wholesale access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Company Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      Company Details
                    </h3>

                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your company name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="businessEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="business@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gstNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GST Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="22AAAAA0000A1Z5"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              15-digit GST identification number
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder="https://www.yourcompany.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Business Address */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      Business Address
                    </h3>

                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your full street address"
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City *</FormLabel>
                            <FormControl>
                              <Input placeholder="Mumbai" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State *</FormLabel>
                            <FormControl>
                              <Input placeholder="Maharashtra" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code *</FormLabel>
                            <FormControl>
                              <Input placeholder="400001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="India">India</SelectItem>
                                <SelectItem value="Nepal">Nepal</SelectItem>
                                <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                                <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Document Upload */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      Documents
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Upload your business documents to help us verify your application faster.
                    </p>

                    <DocumentUpload
                      onDocumentUploaded={handleDocumentUploaded}
                      onDocumentRemoved={handleDocumentRemoved}
                      existingDocuments={uploadedDocuments}
                      maxDocuments={5}
                      disabled={isSubmitting}
                    />

                    <p className="text-xs text-muted-foreground">
                      Accepted: Business license, GST certificate, reseller certificate, or other relevant documents.
                    </p>
                  </div>

                  {/* Error Display */}
                  {submitError && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-sm font-medium">{submitError}</p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Submit Application
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By submitting this application, you agree to our wholesale
                    terms and conditions.
                  </p>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default WholesaleRegistration;
