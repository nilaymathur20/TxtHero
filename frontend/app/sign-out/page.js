"use client";
import { useEffect } from "react";
import { authClient } from "@/src/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    authClient.signOut().then(() => {
      router.push("/dashboard");
      router.refresh();
    });
  }, [router]);

  return <p>Signing out...</p>;
}
