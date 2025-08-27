import { NextResponse } from "next/server";
import { checkDbConnection } from "@/lib/db-utils";

export async function GET() {
  try {
    const result = await checkDbConnection();

    if (result.success) {
      return NextResponse.json({
        status: "success",
        message: result.message,
      });
    } else {
      return NextResponse.json(
        {
          status: "error",
          message: result.message,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Database connection test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
