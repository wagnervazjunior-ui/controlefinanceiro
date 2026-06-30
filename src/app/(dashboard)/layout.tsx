"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "../../lib/auth-client";

const NAV_ITEMS = [
  { href: "/transactions", label: "Transações" },
  { href: "/import", label: "Importar" },
  { href: "/reports", label: "Relatórios" },
  { href: "/investments", label: "Investimentos" },
  { href: "/settings", label: "Cadastros" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <nav className="w-48 shrink-0 border-r bg-white p-4 flex flex-col justify-between text-zinc-900">
        <div>
          <p className="mb-6 px-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Menu
          </p>
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-zinc-200 font-medium text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full rounded px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 text-left transition-colors"
          >
            Sair
          </button>
        </form>
      </nav>
      <main className="flex-1 bg-zinc-50 text-zinc-900">{children}</main>
    </div>
  );
}
