import { NextResponse } from "next/server";
import { testConnection } from "@/lib/db";
import { setupDatabase } from "@/lib/schema";

export async function GET() {
  try {
    console.log("Starting database setup...");

    // Test database connection
    console.log("Testing database connection...");
    const isConnected = await testConnection();

    if (!isConnected) {
      console.error("Database connection test failed");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    console.log("Database connection successful, setting up schema...");
    // Set up database schema
    await setupDatabase();

    console.log("Database setup completed successfully");
    return NextResponse.json({
      message: "Database setup completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database setup error:", error);
    return NextResponse.json(
      {
        error: "Database setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET(); // Allow both GET and POST requests
}
