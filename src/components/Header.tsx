"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PixelIcon } from "./PixelIcon";

const NAV = [
  { href: "/problems", label: "Problems" },
  { href: "/forest", label: "Forest" },
  { href: "/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="flex h-14 items-center justify-between border-b-2 border-line-strong bg-panel px-5">
      <Link href="/" className="flex items-center gap-3" aria-label="voxelcode home">
        <span className="flex h-9 w-9 items-center justify-center border-2 border-line-strong bg-bg shadow-[2px_2px_0_var(--shadow)]">
          <PixelIcon name="logo" px={2} />
        </span>
        <span className="font-pixel text-[16px] font-bold tracking-wide text-ink">voxelcode</span>
      </Link>
      <nav aria-label="Primary" className="flex items-center gap-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={"btn px-3.5 py-1.5 text-[12px] " + (active ? "btn-on" : "")}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
