import { prisma } from "./prisma";

/**
 * Utility function to safely disconnect from the database
 */
export async function disconnectDb() {
  await prisma.$disconnect();
}

/**
 * Utility function to check database connection
 */
export async function checkDbConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { success: true, message: "Database connection successful" };
  } catch (error) {
    return {
      success: false,
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
