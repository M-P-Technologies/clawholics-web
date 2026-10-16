import { useClerk } from "@clerk/nextjs";
import clsx from "clsx";
import { ArrowLeft, LogOut } from "lucide-react";
import { SideBar as SideBarOrganism } from "@/components/organisms";
import { Button } from "@/components/atoms";
import { useAdminWideLayout } from "@/hooks/useMinWidth";
import AdminTabBar from "@/components/features/admin/shell/AdminTabBar";
import { NAV_GROUPS } from "@/components/features/admin/shell/adminNav";

// The admin's navigation, laid out like the client app's: the bottom tab bar on phones; from `sm` the
// sidebar, kept to its icon rail below `lg` (a tablet has no room for the full one)
export default function SideBar() {
  const clerk = useClerk();
  const wide = useAdminWideLayout();
  const logout = async () => {
    try {
      await clerk.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  return (
    <>
      <div className="sm:hidden">
        <AdminTabBar />
      </div>
      <div className="sticky top-0 hidden h-screen shrink-0 py-3 pl-3 sm:block md:py-6 md:pl-6">
        <SideBarOrganism
          label="Admin navigation"
          groups={NAV_GROUPS}
          storageKey="clawholics-admin-sidebar-collapsed"
          forceCollapsed={!wide}
          footer={(collapsed) => (
            <div className="flex flex-col gap-3">
              <Button variant="secondary" href="/" aria-label={collapsed ? "Back to site (opens in a new tab)" : undefined} className={clsx("w-full gap-3", collapsed && "px-0!")}>
                <ArrowLeft size={16} aria-hidden="true" />
                {!collapsed && "Back to site"}
              </Button>
              <Button type="button" onClick={logout} aria-label="Log out" className={clsx("w-full gap-3", collapsed && "px-0!")}>
                <LogOut size={16} aria-hidden="true" />
                {!collapsed && "Log out"}
              </Button>
            </div>
          )}
        />
      </div>
    </>
  );
}
