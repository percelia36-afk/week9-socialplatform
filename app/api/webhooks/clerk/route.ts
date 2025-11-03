import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Define types for Clerk webhook events
interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
  first_name?: string;
  last_name?: string;
  image_url?: string;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData;
}

// This endpoint handles Clerk webhook events
export async function POST(req: NextRequest) {
  try {
    // Get the body
    const payload: ClerkWebhookEvent = await req.json();

    // For development, we'll accept webhooks without verification
    // In production, you should verify the webhook signature

    // Handle the webhook
    const eventType = payload.type;

    if (eventType === "user.created") {
      try {
        const {
          id,
          email_addresses,
          first_name,
          last_name,
          image_url,
          primary_email_address_id,
        } = payload.data;

        // Get the primary email
        const primaryEmail = email_addresses.find(
          (email: ClerkEmailAddress) => email.id === primary_email_address_id
        );

        if (!primaryEmail) {
          console.error("No primary email found for user:", id);
          return NextResponse.json(
            { success: false, error: "No primary email found" },
            { status: 400 }
          );
        }

        // Insert user into database
        const insertQuery = `
          INSERT INTO users (clerk_user_id, email, first_name, last_name, profile_image_url)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (clerk_user_id) DO NOTHING
          RETURNING *;
        `;

        const result = await query(insertQuery, [
          id,
          primaryEmail.email_address,
          first_name || null,
          last_name || null,
          image_url || null,
        ]);

        console.log("User created in database:", result.rows[0]);

        return NextResponse.json({
          success: true,
          message: "User created successfully",
          user: result.rows[0],
        });
      } catch (error) {
        console.error("Error creating user in database:", error);
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // Handle user updated event
    if (eventType === "user.updated") {
      try {
        const {
          id,
          email_addresses,
          first_name,
          last_name,
          image_url,
          primary_email_address_id,
        } = payload.data;

        // Get the primary email
        const primaryEmail = email_addresses.find(
          (email: ClerkEmailAddress) => email.id === primary_email_address_id
        );

        if (!primaryEmail) {
          console.error("No primary email found for user:", id);
          return NextResponse.json(
            { success: false, error: "No primary email found" },
            { status: 400 }
          );
        }

        // Update user in database
        const updateQuery = `
          UPDATE users 
          SET email = $2, first_name = $3, last_name = $4, profile_image_url = $5, updated_at = CURRENT_TIMESTAMP
          WHERE clerk_user_id = $1
          RETURNING *;
        `;

        const result = await query(updateQuery, [
          id,
          primaryEmail.email_address,
          first_name || null,
          last_name || null,
          image_url || null,
        ]);

        console.log("User updated in database:", result.rows[0]);

        return NextResponse.json({
          success: true,
          message: "User updated successfully",
          user: result.rows[0],
        });
      } catch (error) {
        console.error("Error updating user in database:", error);
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // Handle user deleted event
    if (eventType === "user.deleted") {
      try {
        const { id } = payload.data;

        // Delete user from database
        const deleteQuery = `
          DELETE FROM users 
          WHERE clerk_user_id = $1
          RETURNING *;
        `;

        const result = await query(deleteQuery, [id]);

        console.log("User deleted from database:", result.rows[0]);

        return NextResponse.json({
          success: true,
          message: "User deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting user from database:", error);
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process webhook",
      },
      { status: 500 }
    );
  }
}
