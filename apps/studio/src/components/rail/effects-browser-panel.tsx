"use client";

import { useState } from "react";
import { Search } from "lucide-react";

const CATEGORIES = ["Blur", "Zoom", "Retro", "Shake", "Rainbow"];

const TRENDING = [
  { name: "Sharpen Edge", gradient: "from-slate-500 to-slate-800" },
  { name: "Spooky Night", gradient: "from-purple-700 to-indigo-950" },
  { name: "Retro Shake", gradient: "from-amber-500 to-rose-700" },
  { name: "Auto Style", gradient: "from-cyan-500 to-blue-800" },
  { name: "Dark Night", gradient: "from-neutral-700 to-black" },
  { name: "Diamond", gradient: "from-sky-300 to-indigo-600" },
  { name: "Multi Pass", gradient: "from-pink-300 to-fuchsia-600" },
  { name: "Bright Camera", gradient: "from-yellow-300 to-orange-600" },
  { name: "Macbook Head", gradient: "from-zinc-400 to-zinc-700" },
] as const;

const FOR_YOU = [
  { name: "Play Day", gradient: "from-rose-300 to-pink-600" },
  { name: "Cartoon Style", gradient: "from-red-400 to-rose-700" },
  { name: "Second Water", gradient: "from-teal-400 to-emerald-700" },
  { name: "Betamax", gradient: "from-stone-400 to-stone-700" },
  { name: "Low Quality", gradient: "from-gray-400 to-gray-700" },
  { name: "Retro Shake 2", gradient: "from-orange-400 to-red-700" },
  { name: "Dizzy", gradient: "from-blue-300 to-cyan-700" },
  { name: "Retro Shake 3", gradient: "from-violet-400 to-purple-800" },
  { name: "Red Head", gradient: "from-red-500 to-rose-900" },
] as const;

function EffectTile({ name, gradient }: { name: string; gradient: string }): JSX.Element {
  return (
    <button
      type="button"
      className="flex flex-col gap-1 rounded-lg text-left text-[10px] text-editor-text-muted"
    >
      <div className={`aspect-square rounded-lg bg-gradient-to-br ${gradient}`} />
      <span className="truncate">{name}</span>
    </button>
  );
}

/**
 * Placeholder effects catalog (no real Effects Engine catalog exists yet —
 * see the M11 UI reskin plan). Static gradient tiles only, no engine wiring.
 */
export function EffectsBrowserPanel(): JSX.Element {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 text-xs">
      <div className="flex items-center gap-2 rounded-lg border border-editor-border bg-editor-bg px-2 py-1.5">
        <Search className="h-3.5 w-3.5 text-editor-text-muted" aria-hidden />
        <input
          type="text"
          placeholder="Search effects"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full bg-transparent text-editor-text placeholder:text-editor-text-muted focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(activeCategory === category ? undefined : category)}
            className={`rounded-full px-2.5 py-1 text-[11px] ${
              activeCategory === category
                ? "bg-editor-accent text-white"
                : "bg-editor-surface-raised text-editor-text-muted"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-editor-text-muted">
          TRENDING
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {TRENDING.map((item) => (
            <EffectTile key={item.name} {...item} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-editor-text-muted">
          FOR YOU
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {FOR_YOU.map((item) => (
            <EffectTile key={item.name} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
