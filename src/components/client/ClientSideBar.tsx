"use client";

import { ArrowLeft, LogOut } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import clsx from "clsx";
import { Link, useLocation } from "@/lib/router";
import Button from "../ui/Button";
import logo from "../../assets/logo/logo-pink-transparent.png";
import { CLIENT_TABS, isTabActive } from "../../lib/client/clientNav";

// The desktop menu (from `lg` up): the logo, the four tabs, back to the public site, sign out
export default function ClientSideBar() {
  const { pathname } = useLocation();
  const { signOut } = useClerk();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-crimson-light/50 bg-milk px-4 py-6 lg:flex">
      <Link to="/" className="px-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- a static logo, sized by CSS */}
        <img src={logo.src} alt="Clawholics" className="h-10 w-auto" />
      </Link>
      <nav aria-label="App menu" className="flex flex-col gap-1">
        {CLIENT_TABS.map((tab) => {
          const active = isTabActive(tab, pathname);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors",
                active ? "bg-crimson text-milk shadow-petal" : "text-gray-red hover:bg-crimson-light/30",
              )}
            >
              <tab.Icon size={18} aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-crimson-light/50 pt-4 text-sm">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-gray-red hover:bg-crimson-light/30">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to site
        </Link>
        <Button variant="bare" type="button" onClick={() => signOut({ redirectUrl: "/" })} className="flex items-center gap-3 rounded-xl px-3 py-2 text-gray-red hover:bg-crimson-light/30">
          <LogOut size={16} aria-hidden="true" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
