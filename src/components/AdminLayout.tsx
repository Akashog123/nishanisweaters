import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAdminSidebarState } from "@/hooks/use-admin-sidebar-state";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function AdminLayout({ children, breadcrumbs }: AdminLayoutProps) {
  const { isOpen, setIsOpen } = useAdminSidebarState();

  return (
    <SidebarProvider open={isOpen} onOpenChange={setIsOpen}>
      <AdminSidebar />
      <SidebarInset className="bg-muted/30">
        <AdminHeader breadcrumbs={breadcrumbs} />
        <div className="flex-1 p-6 overflow-auto">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default AdminLayout;
