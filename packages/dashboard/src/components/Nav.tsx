"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Live View" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/backtest", label: "Backtest" },
  { href: "/analytics", label: "Analytics" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: 32,
        height: 56,
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 700,
          fontSize: 16,
          color: "var(--text-primary)",
          textDecoration: "none",
          marginRight: 16,
        }}
      >
        Spread Scanner
      </Link>

      {links.map((link) => {
        const isActive =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? "var(--accent-blue)" : "var(--text-secondary)",
              textDecoration: "none",
              borderBottom: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
              paddingBottom: 2,
            }}
          >
            {link.label}
          </Link>
        );
      })}

      <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
        Polymarket + Kalshi
      </div>
    </nav>
  );
}
