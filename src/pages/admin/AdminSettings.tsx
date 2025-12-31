import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Settings,
  Save,
  RotateCcw,
  History,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Clock,
  IndianRupee,
  Truck,
  ShoppingCart,
  ShieldCheck,
  LayoutList,
  Mail,
  Phone,
  Info,
  ArrowRight,
  Share2,
} from "lucide-react";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface SettingWithValue {
  key: string;
  label: string;
  description: string;
  category: string;
  valueType: string;
  value: string;
  defaultValue: string;
  minValue?: number;
  maxValue?: number;
  displayOrder: number;
  affectedAreas: string[];
  isModified: boolean;
  updatedAt?: number;
  updatedBy?: string;
}

interface PendingChange {
  key: string;
  label: string;
  oldValue: string;
  newValue: string;
  affectedAreas: string[];
  valueType: string;
}

interface CategoryInfo {
  key: string;
  label: string;
  description: string;
  icon: string;
  settingsCount: number;
  modifiedCount: number;
}

// ============================================
// ICON MAPPING
// ============================================

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  IndianRupee: IndianRupee,
  Truck: Truck,
  ShoppingCart: ShoppingCart,
  ShieldCheck: ShieldCheck,
  LayoutList: LayoutList,
  Clock: Clock,
  Mail: Mail,
  Phone: Phone,
  Share2: Share2,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatValue(value: string, valueType: string): string {
  const num = parseFloat(value);

  switch (valueType) {
    case "percentage":
      return `${(num * 100).toFixed(0)}%`;
    case "currency":
      return `₹${num.toLocaleString("en-IN")}`;
    case "duration_hours":
    case "duration_ms": {
      const hours = num / (60 * 60 * 1000);
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? "s" : ""}`;
      }
      if (hours >= 1) {
        return `${hours.toFixed(0)} hour${hours > 1 ? "s" : ""}`;
      }
      const minutes = num / (60 * 1000);
      return `${minutes.toFixed(0)} minute${minutes > 1 ? "s" : ""}`;
    }
    case "number":
      return num.toLocaleString("en-IN");
    case "boolean":
      return value === "true" ? "Enabled" : "Disabled";
    default:
      return value;
  }
}

function parseInputValue(value: string, valueType: string): string {
  switch (valueType) {
    case "percentage":
      return String(parseFloat(value) / 100);
    case "duration_hours": {
      // Input in hours, store in ms
      return String(parseFloat(value) * 60 * 60 * 1000);
    }
    default:
      return value;
  }
}

function formatForInput(value: string, valueType: string): string {
  const num = parseFloat(value);

  switch (valueType) {
    case "percentage":
      return String(num * 100);
    case "duration_hours":
    case "duration_ms":
      // Show in hours for editing
      return String(num / (60 * 60 * 1000));
    default:
      return value;
  }
}

// ============================================
// SETTING INPUT COMPONENT
// ============================================

interface SettingInputProps {
  setting: SettingWithValue;
  localValue: string;
  onChange: (value: string) => void;
}

function SettingInput({ setting, localValue, onChange }: SettingInputProps) {
  const inputValue = formatForInput(localValue, setting.valueType);

  switch (setting.valueType) {
    case "percentage":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={setting.minValue !== undefined ? setting.minValue * 100 : 0}
            max={setting.maxValue !== undefined ? setting.maxValue * 100 : 100}
            step="1"
            value={inputValue}
            onChange={(e) => onChange(parseInputValue(e.target.value, "percentage"))}
            className="w-24"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      );

    case "currency":
      return (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">₹</span>
          <Input
            type="number"
            min={setting.minValue ?? 0}
            max={setting.maxValue}
            step="1"
            value={localValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-32"
          />
        </div>
      );

    case "duration_hours":
    case "duration_ms":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={setting.minValue ? setting.minValue / (60 * 60 * 1000) : 0}
            step="1"
            value={inputValue}
            onChange={(e) => onChange(parseInputValue(e.target.value, "duration_hours"))}
            className="w-24"
          />
          <span className="text-muted-foreground">hours</span>
        </div>
      );

    case "number":
      return (
        <Input
          type="number"
          min={setting.minValue}
          max={setting.maxValue}
          step="1"
          value={localValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-32"
        />
      );

    case "email":
      return (
        <Input
          type="email"
          value={localValue}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-md"
        />
      );

    case "url":
      return (
        <Input
          type="url"
          value={localValue}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-lg"
        />
      );

    case "phone":
      return (
        <Input
          type="tel"
          value={localValue}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-xs"
        />
      );

    case "boolean":
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={localValue === "true"}
            onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
          />
          <span className="text-sm text-muted-foreground">
            {localValue === "true" ? "Enabled" : "Disabled"}
          </span>
        </div>
      );

    default:
      return (
        <Input
          type="text"
          value={localValue}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-md"
        />
      );
  }
}

// ============================================
// PREVIEW PANEL COMPONENT
// ============================================

function PreviewPanel({ affectedAreas }: { affectedAreas: string[] }) {
  if (affectedAreas.length === 0) return null;

  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-md border border-dashed">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-2">
        <Info className="h-3 w-3" />
        Affected Areas
      </div>
      <ul className="text-xs text-muted-foreground space-y-1">
        {affectedAreas.slice(0, 3).map((area, i) => (
          <li key={i} className="flex items-start gap-2">
            <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <code className="break-all">{area}</code>
          </li>
        ))}
        {affectedAreas.length > 3 && (
          <li className="text-muted-foreground/70 pl-5">
            +{affectedAreas.length - 3} more...
          </li>
        )}
      </ul>
    </div>
  );
}

// ============================================
// SAVE CONFIRMATION DIALOG
// ============================================

interface SaveDialogProps {
  open: boolean;
  onClose: () => void;
  changes: PendingChange[];
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}

function SaveConfirmationDialog({
  open,
  onClose,
  changes,
  onConfirm,
  isLoading,
}: SaveDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Confirm Changes
          </DialogTitle>
          <DialogDescription>
            Review the following {changes.length} change{changes.length > 1 ? "s" : ""} before
            applying. These changes will take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-64 overflow-y-auto py-2">
          {changes.map((change) => (
            <div key={change.key} className="border rounded-lg p-4 bg-muted/30">
              <div className="font-medium text-sm">{change.label}</div>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <Badge variant="outline" className="font-mono">
                  {formatValue(change.oldValue, change.valueType)}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="default" className="font-mono">
                  {formatValue(change.newValue, change.valueType)}
                </Badge>
              </div>
              {change.affectedAreas.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Affects: {change.affectedAreas.slice(0, 2).join(", ")}
                  {change.affectedAreas.length > 2 && ` +${change.affectedAreas.length - 2} more`}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Change Reason (optional)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why these changes are being made..."
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply {changes.length} Change{changes.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// HISTORY DIALOG
// ============================================

interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
  settingKey: string;
  settingLabel: string;
}

function HistoryDialog({ open, onClose, settingKey, settingLabel }: HistoryDialogProps) {
  const history = useQuery(
    api.settings.getSettingHistory,
    open ? { settingKey, limit: 20 } : "skip"
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Change History: {settingLabel}
          </DialogTitle>
          <DialogDescription>View all changes made to this setting</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No changes recorded for this setting
            </div>
          ) : (
            history.map((entry) => (
              <div key={entry._id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {entry.changedByName || entry.changedByEmail || "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">
                    {entry.previousValue}
                  </code>
                  <ArrowRight className="h-3 w-3" />
                  <code className="bg-primary/10 px-2 py-0.5 rounded text-xs">
                    {entry.newValue}
                  </code>
                </div>
                {entry.changeReason && (
                  <div className="mt-2 text-xs text-muted-foreground italic">
                    "{entry.changeReason}"
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminSettings() {
  // Fetch settings data
  const settingsData = useQuery(api.settings.listSettings, {});
  const updateSettings = useMutation(api.settings.updateSettings);
  const resetSetting = useMutation(api.settings.resetSetting);

  // Local state for edits
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>("pricing_tax");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    key: string;
    label: string;
  }>({ open: false, key: "", label: "" });

  // Initialize local values from server data
  const settings = settingsData?.settings ?? [];
  const categories = settingsData?.categories ?? [];

  // Calculate pending changes
  const pendingChanges = useMemo((): PendingChange[] => {
    return Object.entries(localValues)
      .filter(([key, value]) => {
        const setting = settings.find((s) => s.key === key);
        return setting && setting.value !== value;
      })
      .map(([key, newValue]) => {
        const setting = settings.find((s) => s.key === key)!;
        return {
          key,
          label: setting.label,
          oldValue: setting.value,
          newValue,
          affectedAreas: setting.affectedAreas,
          valueType: setting.valueType,
        };
      });
  }, [localValues, settings]);

  // Get current value (local override or server value)
  const getCurrentValue = useCallback(
    (key: string): string => {
      if (key in localValues) {
        return localValues[key];
      }
      const setting = settings.find((s) => s.key === key);
      return setting?.value ?? "";
    },
    [localValues, settings]
  );

  // Handle value change
  const handleValueChange = useCallback((key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Handle save
  const handleSave = async (reason: string) => {
    if (pendingChanges.length === 0) return;

    setIsSaving(true);
    try {
      await updateSettings({
        updates: pendingChanges.map((c) => ({ key: c.key, value: c.newValue })),
        reason: reason || undefined,
      });

      toast.success(`${pendingChanges.length} setting(s) updated successfully`);
      setLocalValues({});
      setShowSaveDialog(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset single setting
  const handleReset = async (key: string, label: string) => {
    try {
      await resetSetting({ key, reason: "Reset to default via admin panel" });
      // Clear local override if any
      setLocalValues((prev) => {
        const newValues = { ...prev };
        delete newValues[key];
        return newValues;
      });
      toast.success(`${label} reset to default`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset setting");
    }
  };

  // Discard all changes
  const handleDiscardAll = () => {
    setLocalValues({});
    toast.info("All changes discarded");
  };

  // Loading state
  if (!settingsData) {
    return (
      <AdminLayout breadcrumbs={[{ label: "Settings" }]}>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Get settings for active category
  const categorySettings = settings.filter((s) => s.category === activeTab);

  return (
    <AdminLayout breadcrumbs={[{ label: "Settings" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Settings className="h-8 w-8" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure store settings and business rules. Changes take effect immediately.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {pendingChanges.length > 0 && (
              <>
                <Button variant="outline" onClick={handleDiscardAll}>
                  Discard All
                </Button>
                <Button onClick={() => setShowSaveDialog(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save {pendingChanges.length} Change{pendingChanges.length > 1 ? "s" : ""}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Settings</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{settingsData.totalCount}</div>
              <p className="text-xs text-muted-foreground">Across {categories.length} categories</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modified</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{settingsData.modifiedCount}</div>
              <p className="text-xs text-muted-foreground">Changed from defaults</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
              <Save className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingChanges.length}</div>
              <p className="text-xs text-muted-foreground">Unsaved edits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <LayoutList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-muted-foreground">Configuration groups</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {categories.map((cat) => {
              const IconComponent = CATEGORY_ICON_MAP[cat.icon] || Settings;
              const hasPendingChanges = pendingChanges.some(
                (c) => settings.find((s) => s.key === c.key)?.category === cat.key
              );

              return (
                <TabsTrigger
                  key={cat.key}
                  value={cat.key}
                  className="flex items-center gap-2 relative"
                >
                  <IconComponent className="h-4 w-4" />
                  {cat.label}
                  {(cat.modifiedCount > 0 || hasPendingChanges) && (
                    <Badge
                      variant={hasPendingChanges ? "default" : "secondary"}
                      className="h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {hasPendingChanges
                        ? pendingChanges.filter(
                            (c) => settings.find((s) => s.key === c.key)?.category === cat.key
                          ).length
                        : cat.modifiedCount}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Settings Cards */}
          {categories.map((cat) => (
            <TabsContent key={cat.key} value={cat.key} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{cat.label}</CardTitle>
                  <CardDescription>{cat.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {settings
                    .filter((s) => s.category === cat.key)
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((setting) => {
                      const currentValue = getCurrentValue(setting.key);
                      const hasLocalChange =
                        setting.key in localValues && localValues[setting.key] !== setting.value;
                      const isModifiedFromDefault = setting.value !== setting.defaultValue;

                      return (
                        <div
                          key={setting.key}
                          className={`p-4 rounded-lg border ${
                            hasLocalChange
                              ? "border-blue-300 bg-blue-50/50"
                              : isModifiedFromDefault
                              ? "border-amber-200 bg-amber-50/30"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Label className="text-base font-medium">
                                  {setting.label}
                                </Label>
                                {hasLocalChange && (
                                  <Badge variant="default" className="text-xs">
                                    Unsaved
                                  </Badge>
                                )}
                                {!hasLocalChange && isModifiedFromDefault && (
                                  <Badge variant="secondary" className="text-xs">
                                    Modified
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {setting.description}
                              </p>

                              <div className="mt-3">
                                <SettingInput
                                  setting={setting}
                                  localValue={currentValue}
                                  onChange={(value) => handleValueChange(setting.key, value)}
                                />
                              </div>

                              {isModifiedFromDefault && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Default: {formatValue(setting.defaultValue, setting.valueType)}
                                </p>
                              )}

                              <PreviewPanel affectedAreas={setting.affectedAreas} />
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setHistoryDialog({
                                    open: true,
                                    key: setting.key,
                                    label: setting.label,
                                  })
                                }
                                title="View history"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              {(isModifiedFromDefault || hasLocalChange) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleReset(setting.key, setting.label)}
                                  title="Reset to default"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Save Confirmation Dialog */}
      <SaveConfirmationDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        changes={pendingChanges}
        onConfirm={handleSave}
        isLoading={isSaving}
      />

      {/* History Dialog */}
      <HistoryDialog
        open={historyDialog.open}
        onClose={() => setHistoryDialog({ open: false, key: "", label: "" })}
        settingKey={historyDialog.key}
        settingLabel={historyDialog.label}
      />
    </AdminLayout>
  );
}
