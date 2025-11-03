import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "No user ID provided" },
        { status: 400 }
      );
    }

    // Check if user already exists in database
    const existingUserQuery = `
      SELECT * FROM users WHERE clerk_id = $1
    `;

    const existingUserResult = await query(existingUserQuery, [userId]);

    if (existingUserResult.rows.length > 0) {
      // User already exists, return success
      return NextResponse.json({
        success: true,
        message: "User already exists",
        user: existingUserResult.rows[0],
      });
    }

    // User doesn't exist, fetch from Clerk and create in database
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);

    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: "User not found in Clerk" },
        { status: 404 }
      );
    }

    // Get the primary email
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    );

    if (!primaryEmail) {
      console.error("No primary email found for user:", userId);
      return NextResponse.json(
        { success: false, error: "No primary email found" },
        { status: 400 }
      );
    }

    // Insert user into database
    const insertQuery = `
      INSERT INTO users (clerk_id, email, username, bio)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (clerk_id) DO NOTHING
      RETURNING *;
    `;

    const result = await query(insertQuery, [
      clerkUser.id,
      primaryEmail.emailAddress,
      clerkUser.username || clerkUser.firstName || "user",
      null,
    ]);

    console.log("User synced to database:", result.rows[0]);

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync user",
      },
      { status: 500 }
    );
  }
}
