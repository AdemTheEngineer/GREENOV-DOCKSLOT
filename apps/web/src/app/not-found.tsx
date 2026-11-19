import Link from "next/link";
import { primaryButtonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-navy">Page introuvable</h1>
      <p className="mt-2 text-sm text-slate-500">La page demandée n&apos;existe pas ou a été déplacée.</p>
      <Link href="/" className={`${primaryButtonClass} mt-6`}>
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
