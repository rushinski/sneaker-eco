"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import type { NexusData, NexusType } from "@/types/domain/nexus";

export default function NexusTrackerClient() {
  const [data, setData] = useState<NexusData>({ states: [] });
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingState, setSavingState] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/nexus/summary", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) {
      setData(result);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (stateCode: string, nexusType: NexusType, isRegistered: boolean) => {
    setSavingState(stateCode);
    try {
      const response = await fetch("/api/admin/nexus/nexus-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stateCode, nexusType, isRegistered }),
      });
      if (!response.ok) {
        throw new Error("Failed to save nexus setting");
      }
      await load();
    } finally {
      setSavingState("");
    }
  };

  const states = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return data.states;
    }
    return data.states.filter(
      (state) =>
        state.stateName.toLowerCase().includes(normalized) ||
        state.stateCode.toLowerCase().includes(normalized),
    );
  }, [data.states, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white">Nexus Settings</h1>
        <p className="text-gray-400">Manage state registrations manually.</p>
      </div>

      <label className="flex max-w-sm items-center gap-2 rounded border border-zinc-800 bg-zinc-900 px-3 py-2">
        <Search className="h-4 w-4 text-gray-500" />
        <span className="sr-only">Search states</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search states"
          className="w-full bg-transparent text-sm text-white outline-none"
        />
      </label>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded border border-zinc-800 bg-zinc-900">
          {states.map((state) => (
            <div
              key={state.stateCode}
              className="grid gap-3 border-b border-zinc-800 p-4 sm:grid-cols-[1fr_180px_140px] sm:items-center"
            >
              <div>
                <span className="font-semibold text-white">{state.stateName}</span>
                <span className="ml-2 text-sm text-gray-500">{state.stateCode}</span>
              </div>
              <select
                value={state.nexusType}
                disabled={savingState === state.stateCode}
                onChange={(event) =>
                  void save(
                    state.stateCode,
                    event.target.value as NexusType,
                    state.isRegistered,
                  )
                }
                className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
              >
                <option value="economic">Economic</option>
                <option value="physical">Physical</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={state.isRegistered}
                  disabled={savingState === state.stateCode}
                  onChange={(event) =>
                    void save(state.stateCode, state.nexusType, event.target.checked)
                  }
                />
                Registered
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
