import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy via-navy-light to-accent-dark px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <p className="text-3xl font-bold tracking-tight">
            ⚓ Dock<span className="text-accent">Slot</span>
          </p>
          <p className="mt-2 text-sm text-slate-200">Réservation de créneaux de carénage pour navires industriels</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
