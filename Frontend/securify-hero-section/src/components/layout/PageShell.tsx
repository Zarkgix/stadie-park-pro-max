import type { ReactNode } from "react";
import { AppNavbar } from "./AppNavbar";

export function PageShell({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <div className="min-h-screen w-full bg-black text-white">
      <AppNavbar />
      <main className="pt-32 pb-20 px-6 md:px-10 max-w-7xl mx-auto">
        {title && (
          <header className="mb-10">
            <h1 className="hero-title text-white font-medium text-5xl md:text-7xl lowercase">{title}</h1>
            {description && (
              <p className="text-white/70 text-sm md:text-base mt-3 max-w-xl">{description}</p>
            )}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
