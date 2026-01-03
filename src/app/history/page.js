"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/history", { cache: "no-store" })
      .then(res => res.ok ? res.json() : [])
      .then(setHistory)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[70dvh] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Historique de mes parties</h1>
          <Link href="/" className="text-sm underline">Accueil</Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-neutral-100 dark:bg-neutral-800">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Room</th>
                <th className="px-4 py-2 text-left">Gagnant</th>
                <th className="px-4 py-2 text-left">Participants</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="text-center py-8 opacity-60">Chargement…</td></tr>
              )}
              {!loading && history.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 opacity-60">Aucune partie jouée</td></tr>
              )}
              {history.map((g) => {
                let players = [];
                try { players = JSON.parse(g.playersJson); } catch {}
                const winner = players.find(p => p.id === g.winnerId);
                return (
                  <tr key={g.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-2">{new Date(g.playedAt).toLocaleString()}</td>
                    <td className="px-4 py-2 font-mono text-xs">{g.roomId.slice(0, 8)}…</td>
                    <td className="px-4 py-2 font-semibold text-green-700 dark:text-green-400">{winner ? winner.name : '—'}</td>
                    <td className="px-4 py-2">
                      <ul className="flex flex-wrap gap-2">
                        {players.map(p => (
                          <li key={p.id} className="bg-neutral-200 dark:bg-neutral-800 rounded px-2 py-1">
                            {p.name} {p.points ? <span className="text-xs text-green-600 font-bold">+{p.points}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
