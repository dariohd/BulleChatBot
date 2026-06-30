"use client";

import { useCallback, useEffect, useState } from "react";

interface SiteQuotas {
  maxChatsPerDay?: number;
  maxSyncsPerDay?: number;
}

interface SiteAlert {
  level: "warn" | "critical";
  code: string;
  message: string;
}

interface OpsError {
  route: string;
  status: number;
  message: string;
  timestamp: string;
  host?: string;
}

interface SiteOverview {
  id: string;
  name: string;
  domain: string;
  siteKey: string;
  createdAt: string;
  quotas: SiteQuotas | null;
  index: {
    indexed: boolean;
    indexedAt?: string;
    pageCount?: number;
    chunkCount?: number;
    stale?: boolean;
    baseUrl?: string;
  };
  analytics: {
    totalChats: number;
    totalSyncs: number;
    chatsToday: number;
    syncsToday: number;
    lastChatAt?: string;
    lastSyncAt?: string;
  };
  alerts: SiteAlert[];
  recentErrors: OpsError[];
  errors24h: number;
}

interface PlatformInfo {
  distributedRateLimit: boolean;
  chatRateLimitPerMin: number;
  syncRateLimitPerHour: number;
  defaultMaxChatsPerDay: number;
  defaultMaxSyncsPerDay: number;
  alertCount: number;
  errors24h: number;
}

interface EditForm {
  name: string;
  domain: string;
  welcomeMessage: string;
  instructions: string;
  suggestions: string;
  primaryColor: string;
  webhookUrl: string;
  maxChatsPerDay: string;
  maxSyncsPerDay: string;
  logConversations: boolean;
}

const defaultEdit: EditForm = {
  name: "",
  domain: "",
  welcomeMessage: "",
  instructions: "",
  suggestions: "",
  primaryColor: "#2563eb",
  webhookUrl: "",
  maxChatsPerDay: "",
  maxSyncsPerDay: "",
  logConversations: false,
};

function formatWhen(iso?: string): string {
  if (!iso) return "jamais";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "jamais";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UsageGauge({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max?: number;
}) {
  if (!max) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-[var(--muted)]">
          <span>{label}</span>
          <span>{used} aujourd&apos;hui · illimité</span>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((used / max) * 100));
  const tone =
    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-[var(--accent)]";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-[var(--muted)]">
        <span>{label}</span>
        <span>
          {used} / {max} aujourd&apos;hui
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-2 rounded-full transition-all ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

export function AdminDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [secret, setSecret] = useState("");
  const [sites, setSites] = useState<SiteOverview[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSite, setNewSite] = useState({ name: "", domain: "" });
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(defaultEdit);
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/overview");
      if (!res.ok) throw new Error("Accès refusé");
      const data = await res.json();
      setSites(data.sites ?? []);
      setPlatform(data.platform ?? null);
      setLoggedIn(true);
      setError("");
    } catch {
      setLoggedIn(false);
      setError("Session expirée ou accès refusé.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (!res.ok) {
        setError("Secret invalide.");
        return;
      }
      setSecret("");
      await loadOverview();
    } catch {
      setError("Erreur de connexion.");
    }
  }

  async function handleLogout() {
    await adminFetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setSites([]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading("create");
    try {
      const res = await adminFetch("/api/sites", {
        method: "POST",
        body: JSON.stringify(newSite),
      });
      if (!res.ok) throw new Error();
      setNewSite({ name: "", domain: "" });
      setShowCreate(false);
      await loadOverview();
    } catch {
      setError("Impossible de créer le site.");
    } finally {
      setActionLoading(null);
    }
  }

  async function openEdit(site: SiteOverview) {
    setEditingKey(site.siteKey);
    setActionLoading(`load-${site.siteKey}`);
    try {
      const res = await adminFetch(
        `/api/sites?siteKey=${encodeURIComponent(site.siteKey)}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEditForm({
        name: data.name ?? site.name,
        domain: data.domain ?? site.domain,
        welcomeMessage: data.welcomeMessage ?? "",
        instructions: data.instructions ?? "",
        suggestions: Array.isArray(data.suggestions)
          ? data.suggestions.join("\n")
          : "",
        primaryColor: data.primaryColor ?? "#2563eb",
        webhookUrl: data.webhookUrl ?? "",
        maxChatsPerDay: data.quotas?.maxChatsPerDay?.toString() ?? "",
        maxSyncsPerDay: data.quotas?.maxSyncsPerDay?.toString() ?? "",
        logConversations: Boolean(data.logConversations),
      });
    } catch {
      setError("Impossible de charger la configuration du site.");
      setEditingKey(null);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingKey) return;
    setActionLoading(`edit-${editingKey}`);
    try {
      const body: Record<string, unknown> = {
        siteKey: editingKey,
        name: editForm.name,
        domain: editForm.domain,
        welcomeMessage: editForm.welcomeMessage || undefined,
        instructions: editForm.instructions || undefined,
        primaryColor: editForm.primaryColor || undefined,
        webhookUrl: editForm.webhookUrl || undefined,
        logConversations: editForm.logConversations,
      };
      const suggestionLines = editForm.suggestions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 3);
      body.suggestions = suggestionLines;
      const quotas: SiteQuotas = {};
      if (editForm.maxChatsPerDay) {
        quotas.maxChatsPerDay = Number(editForm.maxChatsPerDay);
      }
      if (editForm.maxSyncsPerDay) {
        quotas.maxSyncsPerDay = Number(editForm.maxSyncsPerDay);
      }
      if (Object.keys(quotas).length > 0) {
        body.quotas = quotas;
      }
      const res = await adminFetch("/api/sites", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setEditingKey(null);
      await loadOverview();
    } catch {
      setError("Impossible de mettre à jour le site.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReindex(siteKey: string) {
    setActionLoading(siteKey);
    try {
      const res = await adminFetch("/api/admin/reindex", {
        method: "POST",
        body: JSON.stringify({ siteKey, force: true }),
      });
      if (!res.ok) throw new Error();
      await loadOverview();
    } catch {
      setError("Impossible de ré-indexer.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRotate(siteKey: string) {
    if (!confirm("Générer une nouvelle clé ? L'ancienne ne fonctionnera plus.")) {
      return;
    }
    setActionLoading(`rotate-${siteKey}`);
    try {
      const res = await adminFetch("/api/admin/rotate-key", {
        method: "POST",
        body: JSON.stringify({ siteKey }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      alert(`Nouvelle clé : ${data.siteKey}`);
      await loadOverview();
    } catch {
      setError("Impossible de faire tourner la clé.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(siteKey: string) {
    if (!confirm("Supprimer ce site ?")) return;
    setActionLoading(`delete-${siteKey}`);
    try {
      const res = await adminFetch("/api/sites", {
        method: "DELETE",
        body: JSON.stringify({ siteKey }),
      });
      if (!res.ok) throw new Error();
      await loadOverview();
    } catch {
      setError("Impossible de supprimer.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePurgeLogs(siteKey: string) {
    if (!confirm("Supprimer tous les logs de conversation ?")) return;
    setActionLoading(`purge-${siteKey}`);
    try {
      const res = await adminFetch("/api/admin/logs", {
        method: "DELETE",
        body: JSON.stringify({ siteKey }),
      });
      if (!res.ok) throw new Error();
      alert("Logs supprimés.");
    } catch {
      setError("Impossible de purger les logs.");
    } finally {
      setActionLoading(null);
    }
  }

  if (!loggedIn) {
    return (
      <form onSubmit={handleLogin} className="mx-auto max-w-md space-y-4">
        <p className="text-sm text-[var(--muted)]">
          Connexion sécurisée par cookie httpOnly.
        </p>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="BULLE_ADMIN_SECRET"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white"
        >
          Se connecter
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {loading ? "Chargement..." : `${sites.length} site(s)`}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={loading}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
          >
            Actualiser
          </button>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm"
          >
            Nouveau site
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-[var(--muted)] underline"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {platform && (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="font-semibold">Plateforme</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Rate limit : {platform.chatRateLimitPerMin} chats / min ·{" "}
            {platform.syncRateLimitPerHour} syncs / h ·{" "}
            {platform.distributedRateLimit
              ? "Upstash actif"
              : "mémoire par instance (défaut)"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Quotas par défaut des nouveaux sites :{" "}
            {platform.defaultMaxChatsPerDay} chats / jour ·{" "}
            {platform.defaultMaxSyncsPerDay} syncs / jour
          </p>
          {(platform.alertCount > 0 || platform.errors24h > 0) && (
            <div className="mt-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {platform.alertCount > 0 && (
                <p>
                  {platform.alertCount} alerte
                  {platform.alertCount > 1 ? "s" : ""} quota sur les sites
                </p>
              )}
              {platform.errors24h > 0 && (
                <p>
                  {platform.errors24h} erreur
                  {platform.errors24h > 1 ? "s" : ""} API en 24 h
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
        >
          <h2 className="font-semibold">Créer un site</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={newSite.name}
              onChange={(e) =>
                setNewSite((s) => ({ ...s, name: e.target.value }))
              }
              placeholder="Nom"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              required
            />
            <input
              value={newSite.domain}
              onChange={(e) =>
                setNewSite((s) => ({ ...s, domain: e.target.value }))
              }
              placeholder="domaine.fr"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={actionLoading === "create"}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Créer
          </button>
        </form>
      )}

      {editingKey && (
        <form
          onSubmit={handleSaveEdit}
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
        >
          <h2 className="font-semibold">Modifier le site</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={editForm.name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Nom"
              className="rounded-lg border px-3 py-2 text-sm"
              required
            />
            <input
              value={editForm.domain}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, domain: e.target.value }))
              }
              placeholder="domaine.fr"
              className="rounded-lg border px-3 py-2 text-sm"
              required
            />
            <input
              value={editForm.welcomeMessage}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, welcomeMessage: e.target.value }))
              }
              placeholder="Message d'accueil"
              className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              value={editForm.instructions}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, instructions: e.target.value }))
              }
              placeholder="Instructions Bulle (périmètre, ton, précisions métier…)"
              rows={5}
              className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              value={editForm.suggestions}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, suggestions: e.target.value }))
              }
              placeholder="Suggestions rapides (1 par ligne, max 3)"
              rows={3}
              className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              value={editForm.primaryColor}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, primaryColor: e.target.value }))
              }
              placeholder="#2563eb"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={editForm.maxChatsPerDay}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, maxChatsPerDay: e.target.value }))
              }
              placeholder="Quota chats / jour"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={editForm.maxSyncsPerDay}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, maxSyncsPerDay: e.target.value }))
              }
              placeholder="Quota syncs / jour"
              className="rounded-lg border px-3 py-2 text-sm"
            />
            <input
              value={editForm.webhookUrl}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, webhookUrl: e.target.value }))
              }
              placeholder="https://webhook..."
              className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={editForm.logConversations}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    logConversations: e.target.checked,
                  }))
                }
              />
              Journaliser les conversations (RGPD)
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={Boolean(actionLoading)}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setEditingKey(null)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {sites.map((site) => (
          <article
            key={site.siteKey}
            className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold">{site.name}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{site.domain}</p>
                <p className="mt-2 break-all font-mono text-xs">{site.siteKey}</p>
              </div>
              <span className="text-xs">
                {site.index.indexed
                  ? site.index.stale
                    ? "Index obsolète"
                    : `${site.index.pageCount ?? 0} pages`
                  : "Non indexé"}
              </span>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Total : {site.analytics.totalChats} conversations ·{" "}
              {site.analytics.totalSyncs} syncs
            </p>
            <div className="mt-4 space-y-3">
              {site.alerts?.length > 0 && (
                <div className="space-y-2">
                  {site.alerts.map((alert) => (
                    <p
                      key={`${alert.code}-${alert.level}`}
                      className={`rounded-lg px-3 py-2 text-xs ${
                        alert.level === "critical"
                          ? "bg-red-50 text-red-800"
                          : "bg-amber-50 text-amber-900"
                      }`}
                    >
                      {alert.message}
                    </p>
                  ))}
                </div>
              )}
              <UsageGauge
                label="Conversations"
                used={site.analytics.chatsToday}
                max={site.quotas?.maxChatsPerDay}
              />
              <UsageGauge
                label="Synchronisations"
                used={site.analytics.syncsToday}
                max={site.quotas?.maxSyncsPerDay}
              />
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Dernier chat : {formatWhen(site.analytics.lastChatAt)} · Dernier
              sync : {formatWhen(site.analytics.lastSyncAt)}
            </p>
            {site.recentErrors?.length > 0 && (
              <details className="mt-3 rounded-lg border border-[var(--border)] p-3 text-xs">
                <summary className="cursor-pointer text-[var(--muted)]">
                  {site.errors24h} erreur{site.errors24h > 1 ? "s" : ""} récente
                  {site.errors24h > 1 ? "s" : ""} (24 h)
                </summary>
                <ul className="mt-2 space-y-2">
                  {site.recentErrors.map((err) => (
                    <li key={`${err.timestamp}-${err.route}`} className="text-[var(--muted)]">
                      <span className="font-medium text-slate-700">
                        {formatWhen(err.timestamp)}
                      </span>
                      {" · "}
                      {err.route} · HTTP {err.status} · {err.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => openEdit(site)}
                disabled={actionLoading === `load-${site.siteKey}`}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Modifier
              </button>
              <button
                onClick={() => handleReindex(site.siteKey)}
                disabled={actionLoading === site.siteKey}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Ré-indexer
              </button>
              <button
                onClick={() => handleRotate(site.siteKey)}
                disabled={actionLoading === `rotate-${site.siteKey}`}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Nouvelle clé
              </button>
              <button
                onClick={() => handlePurgeLogs(site.siteKey)}
                disabled={actionLoading === `purge-${site.siteKey}`}
                className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Purger logs
              </button>
              <button
                onClick={() => handleDelete(site.siteKey)}
                disabled={actionLoading === `delete-${site.siteKey}`}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
