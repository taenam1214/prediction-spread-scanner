"use client";

import { categoryBadgeClass } from "@/lib/format";

const CATEGORIES = ["all", "economics", "crypto", "sports", "markets"];

interface Props {
  selected: string;
  onChange: (category: string) => void;
}

export function CategoryFilter({ selected, onChange }: Props) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`badge ${cat === "all" ? "" : categoryBadgeClass(cat)}`}
          style={{
            cursor: "pointer",
            border:
              selected === cat
                ? "1px solid var(--accent-blue)"
                : "1px solid transparent",
            padding: "4px 12px",
            fontSize: 12,
            background:
              selected === cat ? "rgba(77, 159, 255, 0.1)" : undefined,
          }}
        >
          {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
      ))}
    </div>
  );
}
