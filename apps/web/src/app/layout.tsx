import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "DockSlot — Réservation de créneaux de carénage",
  description: "Réservez un créneau de carénage pour vos navires dans les chantiers navals partenaires.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
