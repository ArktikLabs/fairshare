import { redirect } from 'next/navigation';
import { prisma } from "@/lib/prisma";

// Short code cache (same as in the API route)
const shortCodeCache = new Map<string, { token: string; expiresAt: number }>();

interface Props {
  params: Promise<{ shortCode: string }>;
}

export default async function ShortCodeRedirect({ params }: Props) {
  const { shortCode } = await params;

  try {
    // Check short code cache
    const cacheEntry = shortCodeCache.get(shortCode);
    
    if (!cacheEntry || Date.now() > cacheEntry.expiresAt) {
      // Short code expired or not found
      redirect('/invite/expired');
      return;
    }

    const { token } = cacheEntry;

    // Validate the original invitation token
    const invitation = await prisma.groupInvitation.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!invitation) {
      // Original invitation expired or invalid
      shortCodeCache.delete(shortCode); // Clean up
      redirect('/invite/expired');
      return;
    }

    // Redirect to the actual invitation page
    redirect(`/invite/${token}`);
  } catch (error) {
    console.error('Error processing short code:', error);
    redirect('/invite/error');
  }
}