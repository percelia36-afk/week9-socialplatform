import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First get the user's database ID from their clerk ID
    const userResult = await query("SELECT id FROM users WHERE clerk_id = $1", [
      userId,
    ]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDbId = userResult.rows[0].id;

    const result = await query(
      "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC",
      [userDbId]
    );

    return NextResponse.json({ posts: result.rows });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content, video_url, video_description } =
      await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // First get the user's database ID from their clerk ID
    const userResult = await query("SELECT id FROM users WHERE clerk_id = $1", [
      userId,
    ]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDbId = userResult.rows[0].id;

    const result = await query(
      `INSERT INTO posts (user_id, title, content, video_url, video_description, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userDbId, title, content, video_url || null, video_description || null]
    );

    return NextResponse.json({ post: result.rows[0] });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("id");

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    // First get the user's database ID from their clerk ID
    const userResult = await query("SELECT id FROM users WHERE clerk_id = $1", [
      userId,
    ]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDbId = userResult.rows[0].id;

    // Check if the post exists and belongs to the user
    const postCheck = await query(
      "SELECT id FROM posts WHERE id = $1 AND user_id = $2",
      [postId, userDbId]
    );

    if (postCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Post not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete the post
    await query("DELETE FROM posts WHERE id = $1 AND user_id = $2", [
      postId,
      userDbId,
    ]);

    return NextResponse.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
