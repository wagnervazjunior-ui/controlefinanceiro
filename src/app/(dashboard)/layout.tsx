import Link from "next/link";
import { signOut } from "../../lib/auth";

const NAV_ITEMS = [
  { href: "/transactions", label: "Transações" },
  { href: "/import", label: "Importar" },
  { href: "/reports", label: "Relatórios" },
  { href: "/investments", label: "Investimentos" },
  { href: "/settings", label: "Cadastros" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-48 shrink-0 border-r bg-zinc-50 p-4 flex flex-col justify-between text-zinc-900">
        <ul className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="block rounded px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-200">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="w-full rounded px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-200 text-left">
            Sair
          </button>
        </form>
      </nav>
      <main className="flex-1 bg-white text-zinc-900">{children}</main>
    </div>
  );
}
