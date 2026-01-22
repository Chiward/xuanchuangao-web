import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 p-6 w-full">
        <SidebarTrigger />
        <div className="mt-4">{children}</div>
      </main>
    </SidebarProvider>
  );
}