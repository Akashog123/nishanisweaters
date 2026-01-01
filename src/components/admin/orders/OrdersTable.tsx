import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { OrderStatusBadge, PaymentStatusBadge } from "./OrderDetailsDialog";
import { OrdersTableProps, Order } from "./types";

// Order Row Component
const OrderRow = ({
  order,
  onViewOrder,
}: {
  order: Order;
  onViewOrder: (order: Order) => void;
}) => (
  <TableRow>
    <TableCell>
      <div className="font-medium">{order.orderNumber}</div>
      <div className="text-xs text-muted-foreground">
        {formatDate(order.createdAt)}
      </div>
    </TableCell>
    <TableCell>
      <div className="truncate max-w-[150px]">{order.userEmail}</div>
      <div className="text-xs text-muted-foreground">
        {order.shippingAddress.city}
      </div>
    </TableCell>
    <TableCell>
      <Badge variant="outline" className="capitalize">
        {order.orderType}
      </Badge>
    </TableCell>
    <TableCell>{order.items.length} items</TableCell>
    <TableCell className="font-medium">{formatCurrency(order.total)}</TableCell>
    <TableCell>
      <PaymentStatusBadge status={order.paymentStatus} />
    </TableCell>
    <TableCell>
      <OrderStatusBadge status={order.orderStatus} />
    </TableCell>
    <TableCell className="text-right">
      <Button variant="ghost" size="icon" onClick={() => onViewOrder(order)}>
        <Eye className="h-4 w-4" />
      </Button>
    </TableCell>
  </TableRow>
);

// Empty State Component
const EmptyState = () => (
  <TableRow>
    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
      <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No orders found</p>
      <p className="text-sm">Try adjusting your search or filters</p>
    </TableCell>
  </TableRow>
);

// Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  filteredCount,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  filteredCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredCount);

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {filteredCount} orders
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Main OrdersTable Component
export function OrdersTable({
  orders,
  filteredCount,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onViewOrder,
}: OrdersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order List</CardTitle>
        <CardDescription>{filteredCount} orders found</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <OrderRow
                  key={order._id}
                  order={order}
                  onViewOrder={onViewOrder}
                />
              ))
            ) : (
              <EmptyState />
            )}
          </TableBody>
        </Table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          filteredCount={filteredCount}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
        />
      </CardContent>
    </Card>
  );
}

export default OrdersTable;
