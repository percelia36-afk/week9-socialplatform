import { query } from "./db";

// Create the users table for storing user profiles
export async function createUsersTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
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
  `;

  try {
    await query(createTableQuery);
    console.log("Users table created successfully");
  } catch (error) {
    console.error("Error creating users table:", error);
    throw error;
  }
}

// Create the posts table for storing user posts
export async function createPostsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      clerk_user_id VARCHAR(255) NOT NULL,
      title VARCHAR(255),
      content TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await query(createTableQuery);
    console.log("Posts table created successfully");
  } catch (error) {
    console.error("Error creating posts table:", error);
    throw error;
  }
}

// Create indexes for better performance
export async function createIndexes() {
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);",
    "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);",
    "CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_posts_clerk_user_id ON posts(clerk_user_id);",
    "CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);",
  ];

  try {
    for (const indexQuery of indexes) {
      try {
        await query(indexQuery);
        console.log(`Index created: ${indexQuery.substring(0, 50)}...`);
      } catch {
        console.log(
          `Index already exists or failed: ${indexQuery.substring(0, 50)}...`
        );
        // Continue with other indexes even if one fails
      }
    }
    console.log("Database indexes setup completed");
  } catch (error) {
    console.error("Error creating indexes:", error);
    // Don't throw error to allow setup to continue
  }
}

// Function to set up the entire database schema
export async function setupDatabase() {
  try {
    console.log("Setting up database schema...");

    // Create tables first
    await createUsersTable();
    await createPostsTable();

    // Wait a moment for tables to be committed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify tables exist before creating indexes
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'posts');
    `;

    const tablesResult = await query(tablesQuery);
    console.log(
      "Tables found:",
      tablesResult.rows.map((r) => r.table_name)
    );

    // Verify columns exist before creating indexes
    const columnsQuery = `
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'posts')
      ORDER BY table_name, column_name;
    `;

    const columnsResult = await query(columnsQuery);
    console.log("All columns found:", columnsResult.rows);

    // Check specifically for clerk_user_id columns
    const clerkColumns = columnsResult.rows.filter(
      (row) => row.column_name === "clerk_user_id"
    );
    console.log("Clerk user ID columns:", clerkColumns); // Only create indexes if tables and columns exist
    if (tablesResult.rows.length === 2 && clerkColumns.length >= 1) {
      await createIndexes();
    } else {
      console.error(
        "Tables or clerk_user_id columns not ready for index creation"
      );
      console.error("Expected 2 tables, found:", tablesResult.rows.length);
      console.error(
        "Expected clerk_user_id columns, found:",
        clerkColumns.length
      );
      throw new Error("Database schema verification failed");
    }

    console.log("Database schema setup completed successfully!");
  } catch (error) {
    console.error("Database setup failed:", error);
    throw error;
  }
}

// Function to get or create a user from Clerk data
export async function getOrCreateUser(clerkUser: {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  imageUrl?: string;
}) {
  try {
    // First, try to find existing user
    const existingUser = await query(
      "SELECT * FROM users WHERE clerk_id = $1",
      [clerkUser.id]
    );

    if (existingUser.rows.length > 0) {
      return existingUser.rows[0];
    }

    // If user doesn't exist, create them
    const insertUser = await query(
      `INSERT INTO users (clerk_id, email, username, bio)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        clerkUser.id,
        clerkUser.emailAddresses[0]?.emailAddress,
        clerkUser.username || clerkUser.firstName || "user",
        null,
      ]
    );

    return insertUser.rows[0];
  } catch (error) {
    console.error("Error getting or creating user:", error);
    throw error;
  }
}
