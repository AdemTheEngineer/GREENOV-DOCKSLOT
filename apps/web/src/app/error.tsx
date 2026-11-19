"use client";

import { Alert, secondaryButtonClass } from "@/components/ui";

// In production Next.js replaces Server Component error messages with a generic English text,
// so the page shows its own French message and only the digest for support.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-4 text-xl font-bold text-navy">Une erreur est survenue</h1>
      <Alert tone="error">Impossible de charger la page. Vérifiez que l&apos;API DockSlot est démarrée, puis réessayez.</Alert>
      {error.digest && <p className="mt-2 text-xs text-slate-400">Référence : {error.digest}</p>}
      <button type="button" onClick={reset} className={`${secondaryButtonClass} mt-4`}>
        Réessayer
      </button>
    </main>
  );
}
