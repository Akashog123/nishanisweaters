import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AdminLayout } from "@/components/AdminLayout";
import {
  OrderDetailsDialog,
  OrderFilters,
  OrdersTable,
  OrderStatsCards,
  useOrderFilters,
  useOrderMutations,
  Order,
} from "@/components/admin/orders";

const ITEMS_PER_PAGE = 10;

const AdminOrders = () => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Use custom hooks for filters and mutations
  const {
    searchQuery,
    statusFilter,
    paymentFilter,
    typeFilter,
    currentPage,
    setSearchQuery,
    setStatusFilter,
    setPaymentFilter,
    setTypeFilter,
    setCurrentPage,
    setFilters,
    filterOrders,
    getOrderCounts,
    getPaginatedOrders,
    getTotalPages,
  } = useOrderFilters();

  const { updateOrderStatus } = useOrderMutations();

  // Fetch orders
  const ordersResult = useQuery(api.orders.listAllOrders, { limit: 500 });
  const allOrders = ordersResult?.orders ?? [];

  // Compute filtered and paginated orders
  const filteredOrders = filterOrders(allOrders);
  const paginatedOrders = getPaginatedOrders(filteredOrders, ITEMS_PER_PAGE);
  const totalPages = getTotalPages(filteredOrders, ITEMS_PER_PAGE);
  const orderCounts = getOrderCounts(allOrders);

  // Handle status update from dialog
  const handleUpdateStatus = async (
    orderId: Parameters<typeof updateOrderStatus>[0]["orderId"],
    status: string,
    trackingNumber?: string,
    shippingCarrier?: string,
    adminNotes?: string
  ) => {
    await updateOrderStatus({
      orderId,
      orderStatus: status as Parameters<typeof updateOrderStatus>[0]["orderStatus"],
      trackingNumber,
      shippingCarrier,
      adminNotes,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">Manage customer orders</p>
          </div>
        </div>

        {/* Stats Cards */}
        <OrderStatsCards
          counts={orderCounts}
          statusFilter={statusFilter}
          paymentFilter={paymentFilter}
          onFilterChange={setFilters}
        />

        {/* Filters */}
        <OrderFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          paymentFilter={paymentFilter}
          typeFilter={typeFilter}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onPaymentChange={setPaymentFilter}
          onTypeChange={setTypeFilter}
        />

        {/* Orders Table */}
        <OrdersTable
          orders={paginatedOrders}
          filteredCount={filteredOrders.length}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          onViewOrder={setSelectedOrder}
        />

        {/* Order Details Dialog */}
        <OrderDetailsDialog
          order={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => {
            if (!open) setSelectedOrder(null);
          }}
          onUpdateStatus={handleUpdateStatus}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
