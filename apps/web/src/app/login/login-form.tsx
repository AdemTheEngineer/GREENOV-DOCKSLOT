"use client";

import type { ApiErrorBody, UserDto } from "@dockslot/shared";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { homeFor } from "@/lib/routes";

const DEMO_PASSWORD = "demo1234";
const DEMO_ACCOUNTS = [
  { email: "armateur@demo.fr", label: "Armateur", detail: "Méridien Ferries" },
  { email: "chantier@demo.fr", label: "Chantier", detail: "Marseille" },
  { email: "brest@demo.fr", label: "Chantier", detail: "Brest" },
  { email: "admin@demo.fr", label: "Administrateur", detail: "Supervision" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn(credentials: { email: string; password: string }) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = (await response.json().catch(() => null)) as ({ user: UserDto } & Partial<ApiErrorBody>) | null;
      if (!response.ok || !data?.user) {
        setError(data?.error?.message ?? "Connexion impossible. Vérifiez que l'API est démarrée.");
        return;
      }
      router.replace(homeFor(data.user.role));
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifiez que l'API est démarrée.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn({ email, password });
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl">
      <h1 className="text-xl font-semibold text-navy">Connexion</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Mot de passe</label>
          <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full`}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <p className="text-sm font-medium text-slate-700">Comptes de démonstration</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Mot de passe commun : <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">{DEMO_PASSWORD}</code>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={pending}
              onClick={() => void signIn({ email: account.email, password: DEMO_PASSWORD })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-accent hover:bg-accent/5 disabled:opacity-60"
            >
              <span className="block text-sm font-semibold text-navy">{account.label}</span>
              <span className="block text-xs text-slate-500">{account.detail}</span>
              <span className="block truncate text-xs text-slate-400">{account.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
