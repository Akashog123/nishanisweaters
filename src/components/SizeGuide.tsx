import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ruler } from "lucide-react";

interface SizeGuideProps {
  productType?: "tops" | "bottoms" | "dresses" | "outerwear";
  triggerText?: string;
  triggerVariant?: "link" | "outline" | "ghost";
}

// Size data for different garment types
const sizeCharts = {
  tops: {
    name: "Tops & Sweaters",
    measurements: [
      { size: "XS", chest: "32-34", shoulder: "14", length: "24", sleeve: "23" },
      { size: "S", chest: "34-36", shoulder: "15", length: "25", sleeve: "24" },
      { size: "M", chest: "38-40", shoulder: "16", length: "26", sleeve: "25" },
      { size: "L", chest: "42-44", shoulder: "17", length: "27", sleeve: "26" },
      { size: "XL", chest: "46-48", shoulder: "18", length: "28", sleeve: "27" },
      { size: "XXL", chest: "50-52", shoulder: "19", length: "29", sleeve: "28" },
    ],
    unit: "inches",
    columns: ["Size", "Chest", "Shoulder", "Length", "Sleeve"],
  },
  bottoms: {
    name: "Pants & Trousers",
    measurements: [
      { size: "28", waist: "28", hip: "36", inseam: "30", thigh: "22" },
      { size: "30", waist: "30", hip: "38", inseam: "30", thigh: "23" },
      { size: "32", waist: "32", hip: "40", inseam: "31", thigh: "24" },
      { size: "34", waist: "34", hip: "42", inseam: "31", thigh: "25" },
      { size: "36", waist: "36", hip: "44", inseam: "32", thigh: "26" },
      { size: "38", waist: "38", hip: "46", inseam: "32", thigh: "27" },
    ],
    unit: "inches",
    columns: ["Size", "Waist", "Hip", "Inseam", "Thigh"],
  },
  dresses: {
    name: "Dresses & Skirts",
    measurements: [
      { size: "XS", bust: "32-33", waist: "24-25", hip: "34-35", length: "35" },
      { size: "S", bust: "34-35", waist: "26-27", hip: "36-37", length: "36" },
      { size: "M", bust: "36-37", waist: "28-29", hip: "38-39", length: "37" },
      { size: "L", bust: "38-40", waist: "30-32", hip: "40-42", length: "38" },
      { size: "XL", bust: "41-43", waist: "33-35", hip: "43-45", length: "39" },
    ],
    unit: "inches",
    columns: ["Size", "Bust", "Waist", "Hip", "Length"],
  },
  outerwear: {
    name: "Jackets & Coats",
    measurements: [
      { size: "S", chest: "36-38", shoulder: "16", length: "28", sleeve: "24" },
      { size: "M", chest: "40-42", shoulder: "17", length: "29", sleeve: "25" },
      { size: "L", chest: "44-46", shoulder: "18", length: "30", sleeve: "26" },
      { size: "XL", chest: "48-50", shoulder: "19", length: "31", sleeve: "27" },
      { size: "XXL", chest: "52-54", shoulder: "20", length: "32", sleeve: "28" },
    ],
    unit: "inches",
    columns: ["Size", "Chest", "Shoulder", "Length", "Sleeve"],
  },
};

// How to measure guide
const measurementGuide = [
  {
    name: "Chest/Bust",
    description: "Measure around the fullest part of your chest, keeping the tape horizontal.",
  },
  {
    name: "Waist",
    description: "Measure around your natural waistline, at the narrowest part of your torso.",
  },
  {
    name: "Hip",
    description: "Measure around the fullest part of your hips, about 8 inches below your waist.",
  },
  {
    name: "Shoulder",
    description: "Measure from shoulder seam to shoulder seam across the back.",
  },
  {
    name: "Sleeve",
    description: "Measure from the shoulder seam to the wrist with arm slightly bent.",
  },
  {
    name: "Inseam",
    description: "Measure from the crotch to the bottom of the leg.",
  },
];

export function SizeGuide({
  productType = "tops",
  triggerText = "Size Guide",
  triggerVariant = "ghost",
}: SizeGuideProps) {
  const [activeTab, setActiveTab] = useState(productType);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerVariant === "link" ? (
          <button className="text-sm text-primary underline-offset-4 hover:underline inline-flex items-center gap-1">
            <Ruler className="h-3 w-3" />
            {triggerText}
          </button>
        ) : (
          <Button variant={triggerVariant} size="sm" className="gap-1">
            <Ruler className="h-4 w-4" />
            {triggerText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Size Guide
          </DialogTitle>
          <DialogDescription>
            Find your perfect fit using our size charts. All measurements are in inches.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as keyof typeof sizeCharts)} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tops">Tops</TabsTrigger>
            <TabsTrigger value="bottoms">Bottoms</TabsTrigger>
            <TabsTrigger value="dresses">Dresses</TabsTrigger>
            <TabsTrigger value="outerwear">Outerwear</TabsTrigger>
          </TabsList>

          {Object.entries(sizeCharts).map(([key, chart]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold">{chart.name}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {chart.columns.map((col) => (
                          <TableHead key={col} className="text-center font-semibold">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chart.measurements.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-center font-medium">{row.size}</TableCell>
                          {Object.entries(row)
                            .filter(([k]) => k !== "size")
                            .map(([key, value]) => (
                              <TableCell key={key} className="text-center">
                                {value}"
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                  * All measurements are in {chart.unit}
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* How to Measure Section */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-4">How to Measure</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {measurementGuide.map((item) => (
              <div key={item.name} className="text-sm">
                <span className="font-medium">{item.name}:</span>{" "}
                <span className="text-muted-foreground">{item.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Sizing Tips</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• For a relaxed fit, size up from your regular size</li>
            <li>• Wool garments may shrink slightly - consider sizing up</li>
            <li>• If between sizes, choose the larger size for comfort</li>
            <li>• Our garments are designed with standard length - petite or tall customers may need alterations</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SizeGuide;
