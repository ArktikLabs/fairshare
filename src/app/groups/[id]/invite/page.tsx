import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function GroupInvitePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;
  const session = await auth();

  if (!session?.user?.email) {
    redirect(`/auth/signin?callbackUrl=/groups/${id}/invite${token ? `?token=${token}` : ''}`);
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // Get group details
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        where: { status: "ACTIVE" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Group not found</h1>
          <p className="text-gray-600 mb-6">The group you&apos;re trying to join doesn&apos;t exist.</p>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is already a member
  const existingMember = group.members.find((member: { userId: string }) => member.userId === user.id);

  if (existingMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Already a member</h1>
          <p className="text-gray-600 mb-6">You&apos;re already a member of {group.name}!</p>
          <Link 
            href={`/groups/${group.id}`} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Group
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Group</h1>
            <h2 className="text-xl font-semibold text-blue-600">{group.name}</h2>
            {group.description && (
              <p className="text-gray-600 mt-2">{group.description}</p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 mb-6">
            <p className="text-sm text-gray-600 mb-4">
              You&apos;ve been invited to join this expense sharing group. 
              You&apos;ll be able to add expenses and split costs with other members.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Current Members:</h3>
              <div className="space-y-1">
                {group.members.slice(0, 3).map((member) => (
                  <div key={member.id} className="text-sm text-gray-600">
                    {member.user.name || member.user.email}
                  </div>
                ))}
                {group.members.length > 3 && (
                  <div className="text-sm text-gray-500">
                    +{group.members.length - 3} more member{group.members.length - 3 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          <form action={`/api/groups/${group.id}/join`} method="POST">
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Join Group
              </button>
              <Link
                href="/dashboard"
                className="flex-1 text-center border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
