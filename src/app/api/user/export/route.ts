import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST() {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, just return a success message
    // This would export user data including expenses, groups, etc.
    return NextResponse.json(
      {
        message: "Account data export requested",
        status: "processing",
        downloadUrl: null, // Will be provided when ready
      },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Data export error", {
      route: "/api/user/export",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
