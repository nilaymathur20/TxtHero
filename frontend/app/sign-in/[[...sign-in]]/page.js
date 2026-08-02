"use client";
import { useState } from "react";
import { authClient } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await authClient.signIn.email({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred during sign in.");
    }
  };

  return (
    <main className="auth-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Sign In</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem', cursor: 'pointer' }}>Sign In</button>
        <p>
          Don't have an account? <Link href="/sign-up">Sign up</Link>
        </p>
      </form>
    </main>
  );
}
