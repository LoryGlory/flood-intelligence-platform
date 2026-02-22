"use client";

import { useState, useRef, useEffect } from "react";
import type { StationConfig } from "@flood/core";

interface Props {
  readonly stations: StationConfig[];
  readonly value: string;
  readonly onChange: (id: string) => void;
}

function ChevronIcon({ open }: { readonly open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-4 h-4 text-blue-600 shrink-0"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function StationConfigSelect({ stations, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = stations.find((s) => s.id === value) ?? stations[0];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function select(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-48">
      <p className="text-xs font-medium text-slate-500 mb-1.5" id="station-label">
        StationConfig
      </p>

      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="station-label"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white text-sm font-medium text-slate-800 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer text-left"
      >
        <span className="truncate">
          {selected?.name}
          <span className="font-normal text-slate-400 ml-1">— {selected?.riverName}</span>
        </span>
        <ChevronIcon open={open} />
      </button>

      {/* Panel */}
      {open && (
        <ul
          role="listbox"
          aria-labelledby="station-label"
          className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          {stations.map((s) => {
            const isSelected = s.id === value;
            return (
              <li
                key={s.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => select(s.id)}
                className={`flex items-start justify-between gap-3 px-3 py-3 cursor-pointer transition-colors ${
                  isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${isSelected ? "text-blue-700" : "text-slate-800"}`}
                  >
                    {s.name}
                    <span className="font-normal text-slate-400 ml-1">— {s.riverName}</span>
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                    {s.locationName} &middot; warn {s.warningLevelM} m &middot; danger{" "}
                    {s.dangerLevelM} m
                  </p>
                </div>
                {isSelected && <CheckIcon />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
