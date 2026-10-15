import { useClerk } from "@clerk/nextjs";
import {
  CalendarCheck,
  CalendarDays,
  CircleHelp,
  FileText,
  Gem,
  House,
  Info,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Settings,
  ShieldCheck,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import Bow from "@/assets/bow.svg";
import { useLocation, useNavigate } from "@/lib/router";
import logo from "../../../assets/logo/logo-pink-transparent.png";
import emblem from "../../../assets/logo/emblem-pink.png";
import Button from "../../ui/Button";
import Pearls from "../../ui/Pearls";
import AdminTabBar from "./AdminTabBar";
import { NAV_GROUPS } from "./adminNav";

// Each screen's icon, shown when the sidebar is collapsed to a rail
const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/sales": Wallet,
  "/performance": TrendingUp,
  "/clients": CalendarCheck,
  "/schedule": CalendarDays,
  "/admin-scanner": QrCode,
  "/admin-directory": ShieldCheck,
  "/homepage": House,
  "/nail-services": Gem,
  "/nail-artists": Palette,
  "/about-us": Info,
  "/contact-info": Mail,
  "/faqs": CircleHelp,
  "/terms-and-conditions": FileText,
  "/privacy-policy": Lock,
  "/settings": Settings,
};

const COLLAPSED_KEY = "clawholics-admin-sidebar-collapsed";

const SideBar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const clerk = useClerk();
  // Collapsed to an icon rail, remembered in this browser. Open on the server and first render.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true);
    } catch {
      // storage blocked: it just opens expanded
    }
  }, []);

  const toggle = () => {
    setCollapsed((was) => {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, was ? "0" : "1");
      } catch {
        // storage blocked: the choice lasts until the page reloads
      }
      return !was;
    });
  };

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
      {/* PHONE: bottom tab bar */}
      <AdminTabBar />

      {/* LG+ SIDEBAR ONLY */}
      <div className="mr-5 hidden h-full shrink-0 lg:block">
        <aside
          data-collapsed={collapsed}
          className={clsx(
            "flex h-full flex-col overflow-clip rounded-2xl bg-milk py-6 shadow-petal transition-[width] duration-300",
            collapsed ? "w-[76px]" : "w-64",
          )}
        >
          <div className={clsx("flex shrink-0 gap-2", collapsed ? "flex-col items-center justify-center px-3" : "items-start px-5")}>
            {collapsed ? (
              // The emblem's circle sits in a margin of empty space, so the image is scaled up to show it
              <div className="relative mx-auto h-11 w-11 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- a bundled image, sized by CSS */}
                <img src={emblem.src} alt="Clawholics by Max" className="absolute inset-0 h-full w-full scale-[1.556] select-none object-contain" />
              </div>
            ) : (
              /* The logo file has a lot of empty space around it (the artwork is 3218 x 860 of a
                 3840 x 2160 image), so it is sized and offset to show just the artwork. */
              <div className="relative aspect-[3218/860] min-w-0 flex-1 shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- a bundled image, sized by CSS */}
                <img
                  src={logo.src}
                  alt="Clawholics by Max"
                  className="absolute max-w-none select-none"
                  style={{ width: "119.33%", left: "-8.48%", top: "-70.12%" }}
                />
              </div>
            )}
            <Button
              type="button"
              variant="bare"
              onClick={toggle}
              aria-label={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand" : "Collapse"}
              className="shrink-0 rounded-full p-1.5 text-gray-red/70 hover:bg-crimson-light/30 hover:text-berry"
            >
              {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
            </Button>
          </div>

          {!collapsed && <Pearls className="mx-5 my-4 shrink-0" />}

          {/* Only the menu scrolls, with its scrollbar on the left (rtl on the scroller, ltr
              inside), so it never sits on the highlighted item at the right edge */}
          <div className={clsx("sidebar-scroll min-h-0 flex-1 overflow-y-auto [direction:rtl]", collapsed && "mt-4")}>
            <nav aria-label="Admin navigation" className={clsx("flex flex-col py-1 [direction:ltr]", collapsed ? "gap-3 px-3" : "gap-4 pl-3 pr-4")}>
              {NAV_GROUPS.map((group, groupIndex) => (
                <div key={group.title} className="flex flex-col gap-0.5">
                  {collapsed ? (
                    groupIndex > 0 && <span aria-hidden="true" className="mx-auto mb-1 h-px w-8 bg-crimson-light/70" />
                  ) : (
                    <h3 className="px-3 pb-0.5 font-display text-[15px] text-gray-red/70">{group.title}</h3>
                  )}
                  <ul className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const active = pathname === item.path;
                      const Icon = NAV_ICONS[item.path] ?? LayoutDashboard;
                      return (
                        <li key={item.path}>
                          <Button
                            variant="bare"
                            type="button"
                            onClick={() => navigate(item.path)}
                            aria-current={active ? "page" : undefined}
                            aria-label={collapsed ? item.label : undefined}
                            title={collapsed ? item.label : undefined}
                            className={clsx(
                              "w-full whitespace-normal rounded-full text-left text-[14px] leading-snug transition-colors",
                              collapsed ? "h-10 justify-center px-0" : "justify-start gap-2 px-3 py-1.5",
                              active ? "bg-crimson-light/45 font-bold text-berry" : "text-gray-red hover:bg-crimson-light/25 hover:text-berry",
                            )}
                          >
                            {collapsed ? (
                              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                            ) : (
                              <>
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
                                  {active ? <Bow className="h-4 w-4 text-crimson" /> : <span className="h-1 w-1 rounded-full bg-crimson-light" />}
                                </span>
                                <span className="min-w-0">{item.label}</span>
                              </>
                            )}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className={clsx("shrink-0 border-t border-crimson-light/50 pt-4", collapsed ? "mx-3" : "mx-5")}>
            {collapsed ? (
              <Button type="button" onClick={logout} aria-label="Log out" title="Log out" className="h-10 w-full rounded-full !px-0">
                <LogOut size={18} aria-hidden="true" />
              </Button>
            ) : (
              <Button type="button" className="w-full rounded-full" onClick={logout}>
                Log out
              </Button>
            )}
          </div>
        </aside>
      </div>
    </>
  );
};

export default SideBar;
