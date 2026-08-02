"use client";
import { useState } from "react";
import { authClient } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred during sign up.");
    }
  };

  return (
    <main className="auth-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Sign Up</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
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
        <button type="submit" style={{ padding: '0.5rem', cursor: 'pointer' }}>Sign Up</button>
        <p>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
