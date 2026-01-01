import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  ORDER_TYPE_OPTIONS,
} from "@/lib/constants/orderStatus";
import {
  OrderFiltersProps,
  OrderStatusFilter,
  PaymentStatusFilter,
  OrderTypeFilter,
} from "./types";

export function OrderFilters({
  searchQuery,
  statusFilter,
  paymentFilter,
  typeFilter,
  onSearchChange,
  onStatusChange,
  onPaymentChange,
  onTypeChange,
}: OrderFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number or email..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex gap-2 flex-wrap">
            {/* Order Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => onStatusChange(value as OrderStatusFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ORDER_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Payment Status Filter */}
            <Select
              value={paymentFilter}
              onValueChange={(value) => onPaymentChange(value as PaymentStatusFilter)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Order Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(value) => onTypeChange(value as OrderTypeFilter)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Order Type" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default OrderFilters;
