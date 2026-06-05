import SignInForm from "@/components/SignInForm";

// Next 15: searchParams is async and must be awaited.
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return <SignInForm notice={sp.notice} next={sp.next} />;
}
