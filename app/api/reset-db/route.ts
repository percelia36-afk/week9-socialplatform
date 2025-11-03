import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST() {
  try {
    console.log("Cleaning database - dropping existing tables...");

    // Drop existing tables if they exist
    await query("DROP TABLE IF EXISTS posts CASCADE;");
    await query("DROP TABLE IF EXISTS users CASCADE;");

    console.log("Tables dropped, now recreating...");

    // Create users table
    await query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        username VARCHAR(50) UNIQUE,
        biography TEXT,
        profile_image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create posts table
    await query(`
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        clerk_user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        content TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await query(
      "CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);"
    );
    await query(
      "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);"
    );
    await query(
      "CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);"
    );
    await query(
      "CREATE INDEX IF NOT EXISTS idx_posts_clerk_user_id ON posts(clerk_user_id);"
    );
    await query(
      "CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);"
    );

    return NextResponse.json({
      success: true,
      message: "Database reset and setup completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database reset error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Database reset failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
