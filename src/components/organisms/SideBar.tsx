"use client";

import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import Bow from "@/assets/bow.svg";
import { useLocation, useNavigate } from "@/lib/router";
import logo from "../../assets/logo/logo-pink-transparent.png";
import emblem from "../../assets/logo/emblem-pink.png";
import { Button, Pearls } from "../atoms";
import { nav } from "../tokens";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

interface SideBarProps {
  /** The navigation's accessible name */
  label: string;
  groups: NavGroup[];
  /** Whether an item is the current screen; the default is an exact match of the path */
  isActive?: (path: string, pathname: string) => boolean;
  /** The localStorage key that remembers the collapsed rail */
  storageKey: string;
  /** Below the menu, for example Log out; gets whether the sidebar is collapsed to a rail */
  footer: (collapsed: boolean) => ReactNode;
  /** Layout only, for example where the sidebar shows */
  className?: string;
}

// The signed-in areas' sidebar: the logo, the grouped menu and a footer. It collapses to an icon rail.
export default function SideBar({ label, groups, isActive = (path, current) => path === current, storageKey, footer, className }: SideBarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Collapsed to an icon rail, remembered in this browser. Open on the server and first render.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) === "1") setCollapsed(true);
    } catch {
      // storage blocked: it just opens expanded
    }
  }, [storageKey]);

  const toggle = () => {
    setCollapsed((was) => {
      try {
        window.localStorage.setItem(storageKey, was ? "0" : "1");
      } catch {
        // storage blocked: the choice lasts until the page reloads
      }
      return !was;
    });
  };

  return (
    <aside
      data-collapsed={collapsed}
      className={clsx(
        "flex h-full flex-col overflow-clip rounded-2xl bg-milk py-6 shadow-petal transition-[width] duration-300",
        collapsed ? "w-[76px]" : "w-64",
        className,
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
        <nav aria-label={label} className={clsx("flex flex-col py-1 [direction:ltr]", collapsed ? "gap-3 px-3" : "gap-4 pl-3 pr-4")}>
          {groups.map((group, groupIndex) => (
            <div key={group.title ?? groupIndex} className="flex flex-col gap-0.5">
              {collapsed ? (
                groupIndex > 0 && <span aria-hidden="true" className="mx-auto mb-1 h-px w-8 bg-crimson-light/70" />
              ) : group.title ? (
                <h3 className="px-3 pb-0.5 font-display text-[15px] text-gray-red/70">{group.title}</h3>
              ) : null}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.path, pathname);
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <Button
                        variant="bare"
                        type="button"
                        onClick={() => navigate(item.path)}
                        aria-current={active ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        title={collapsed ? item.label : undefined}
                        className={nav.item(active, collapsed)}
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

      <div className={clsx("shrink-0 border-t border-crimson-light/50 pt-4", collapsed ? "mx-3" : "mx-5")}>{footer(collapsed)}</div>
    </aside>
  );
}
