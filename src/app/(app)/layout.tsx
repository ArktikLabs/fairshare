import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

// One authenticated layout for every signed-in page: header nav on desktop,
// bottom tab bar on phones. Pages inside (app) never render their own header.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    const path = (await headers()).get("x-pathname") || "/dashboard";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(path)}`);
  }
  // Read the name from the database so a profile rename shows without re-login
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  return (
    <AppShell user={{ name: user?.name ?? session.user.name ?? null, email: user?.email ?? session.user.email ?? null }}>
      {children}
    </AppShell>
  );
}
