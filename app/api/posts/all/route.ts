import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        p.*,
        u.username,
        u.clerk_id as user_clerk_id
       FROM posts p 
       JOIN users u ON p.user_id = u.id 
       ORDER BY p.created_at DESC`,
      []
    );

    return NextResponse.json({ posts: result.rows });
  } catch (error) {
    console.error("Error fetching all posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
