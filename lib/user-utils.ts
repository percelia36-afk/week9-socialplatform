import { currentUser } from "@clerk/nextjs/server";
import { query } from "./db";
import { User } from "./types";

/**
 * Ensures the current Clerk user exists in our database
 * This function should be called on protected routes to sync users
 */
export async function ensureUserInDatabase(): Promise<User | null> {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return null;
    }

    // Check if user already exists in database
    const existingUserQuery = `
      SELECT * FROM users WHERE clerk_user_id = $1
    `;

    const existingUserResult = await query(existingUserQuery, [clerkUser.id]);

    if (existingUserResult.rows.length > 0) {
      return existingUserResult.rows[0] as User;
    }

    // User doesn't exist, create them
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    );

    if (!primaryEmail) {
      console.error("No primary email found for user:", clerkUser.id);
      return null;
    }

    const insertQuery = `
      INSERT INTO users (clerk_user_id, email, first_name, last_name, profile_image_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result = await query(insertQuery, [
      clerkUser.id,
      primaryEmail.emailAddress,
      clerkUser.firstName || null,
      clerkUser.lastName || null,
      clerkUser.imageUrl || null,
    ]);

    console.log(
      "User created in database via ensureUserInDatabase:",
      result.rows[0]
    );
    return result.rows[0] as User;
  } catch (error) {
    console.error("Error ensuring user in database:", error);
    return null;
  }
}

/**
 * Get user from database by Clerk user ID
 */
export async function getUserByClerkId(
  clerkUserId: string
): Promise<User | null> {
  try {
    const userQuery = `
      SELECT * FROM users WHERE clerk_user_id = $1
    `;

    const result = await query(userQuery, [clerkUserId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as User;
  } catch (error) {
    console.error("Error getting user by Clerk ID:", error);
    return null;
  }
}

/**
 * Update user profile in database
 */
export async function updateUserProfile(
  clerkUserId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    username?: string;
    biography?: string;
    profile_image_url?: string;
  }
): Promise<User | null> {
  try {
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      // No updates to make
      return await getUserByClerkId(clerkUserId);
    }

    // Add updated_at field
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(", ")}
      WHERE clerk_user_id = $${paramCount}
      RETURNING *;
    `;

    updateValues.push(clerkUserId);

    const result = await query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as User;
  } catch (error) {
    console.error("Error updating user profile:", error);
    return null;
  }
}
