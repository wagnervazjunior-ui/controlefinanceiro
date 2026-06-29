"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Email ou senha inválidos");
      return;
    }
    router.push("/transactions");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <form onSubmit={handleSubmit} className="flex w-80 flex-col gap-3 rounded border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Entrar</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
          required
        />
        <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white">
          Entrar
        </button>
      </form>
    </div>
  );
}
