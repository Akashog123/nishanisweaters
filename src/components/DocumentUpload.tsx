import { useState, useRef, useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { MAX_FILE_SIZE_BYTES, ALLOWED_DOCUMENT_TYPES } from "@/lib/constants";

/**
 * Type guard to check if a content type is an allowed document type
 */
function isAllowedDocumentType(contentType: string): contentType is typeof ALLOWED_DOCUMENT_TYPES[number] {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(contentType);
}

type DocumentType = "reseller_certificate" | "business_license" | "gst_certificate" | "other";

interface UploadedDocument {
  type: DocumentType;
  storageId: string;
  url: string;
  fileName: string;
  uploadedAt: number;
}

interface DocumentUploadProps {
  onDocumentUploaded?: (doc: UploadedDocument) => void;
  onDocumentRemoved?: (storageId: string) => void;
  existingDocuments?: UploadedDocument[];
  maxDocuments?: number;
  disabled?: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  reseller_certificate: "Reseller Certificate",
  business_license: "Business License",
  gst_certificate: "GST Certificate",
  other: "Other Document",
};

export function DocumentUpload({
  onDocumentUploaded,
  onDocumentRemoved,
  existingDocuments = [],
  maxDocuments = 5,
  disabled = false,
}: DocumentUploadProps) {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>(existingDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedType, setSelectedType] = useState<DocumentType>("gst_certificate");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);
  const saveDocument = useAction(api.fileStorage.saveDocument);
  const deleteFile = useMutation(api.fileStorage.deleteFile);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
      };
    }

    // Check file type
    if (!isAllowedDocumentType(file.type)) {
      return {
        valid: false,
        error: "Only PDF, JPEG, and PNG files are allowed",
      };
    }

    return { valid: true };
  };

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Check max documents
    if (uploadedDocs.length >= maxDocuments) {
      toast.error(`Maximum ${maxDocuments} documents allowed`);
      return;
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get upload URL
      setUploadProgress(20);
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      setUploadProgress(40);
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();
      setUploadProgress(70);

      // Step 3: Save document reference
      const result = await saveDocument({
        storageId,
        documentType: selectedType,
        contentType: file.type,
      });

      setUploadProgress(100);

      const newDoc: UploadedDocument = {
        type: selectedType,
        storageId,
        url: result.documentUrl,
        fileName: file.name,
        uploadedAt: Date.now(),
      };

      setUploadedDocs((prev) => [...prev, newDoc]);
      onDocumentUploaded?.(newDoc);
      toast.success("Document uploaded successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload document"
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [generateUploadUrl, saveDocument, selectedType, uploadedDocs.length, maxDocuments, onDocumentUploaded]);

  const handleRemoveDocument = useCallback(async (storageId: string) => {
    try {
      await deleteFile({
        storageId: storageId as Id<"_storage">,
      });

      setUploadedDocs((prev) => prev.filter((doc) => doc.storageId !== storageId));
      onDocumentRemoved?.(storageId);
      toast.success("Document removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove document"
      );
    }
  }, [deleteFile, onDocumentRemoved]);

  return (
    <div className="space-y-4">
      {/* Document Type Selection */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            disabled={disabled || isUploading}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedType === type
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {DOCUMENT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          disabled || isUploading
            ? "border-muted-foreground/20 bg-muted/50 cursor-not-allowed"
            : "border-muted-foreground/25 hover:border-primary/50 cursor-pointer"
        }`}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
            <p className="text-sm font-medium">Uploading...</p>
            <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Click to upload {DOCUMENT_TYPE_LABELS[selectedType]}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, JPEG, or PNG up to 5MB
            </p>
          </>
        )}
      </div>

      {/* Uploaded Documents List */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Uploaded Documents ({uploadedDocs.length}/{maxDocuments})
          </p>
          {uploadedDocs.map((doc) => (
            <div
              key={doc.storageId}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{doc.fileName || DOCUMENT_TYPE_LABELS[doc.type]}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_TYPE_LABELS[doc.type]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveDocument(doc.storageId);
                  }}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Remaining slots info */}
      {uploadedDocs.length < maxDocuments && uploadedDocs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          You can upload {maxDocuments - uploadedDocs.length} more document(s)
        </p>
      )}
    </div>
  );
}

export default DocumentUpload;
