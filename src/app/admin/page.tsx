import type { Metadata } from "next";
import Link from "next/link";
import { AdminDashboard } from "./AdminDashboard";

export const metadata: Metadata = {
  title: "Administration — Bulle",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-lg font-semibold">Administration Bulle</h1>
            <p className="text-sm text-[var(--muted)]">
              Sites, indexation et statistiques
            </p>
          </div>
          <Link href="/" className="text-sm text-[var(--muted)] hover:underline">
            Retour
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <AdminDashboard />
      </section>
    </main>
  );
}
