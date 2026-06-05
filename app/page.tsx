"use client";

import { useRouter } from "next/navigation";
import Home from "@/components/Home";

export default function Page() {
  const router = useRouter();
  return (
    <Home
      onRefer={() => router.push("/refer")}
      onSignIn={() => router.push("/sign-in")}
    />
  );
}
