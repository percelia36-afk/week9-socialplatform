// Database model types

export interface User {
  id: number;
  clerk_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  biography?: string;
  profile_image_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Post {
  id: number;
  user_id: number;
  clerk_user_id: string;
  title?: string;
  content: string;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
}

// Types for creating new records (without auto-generated fields)
export interface CreateUser {
  clerk_user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  biography?: string;
  profile_image_url?: string;
}

export interface CreatePost {
  user_id: number;
  clerk_user_id: string;
  title?: string;
  content: string;
  image_url?: string;
}

// Types for updating records (all fields optional except ID)
export interface UpdateUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  biography?: string;
  profile_image_url?: string;
}

export interface UpdatePost {
  id: number;
  title?: string;
  content?: string;
  image_url?: string;
}

// Extended types with joined data
export interface PostWithUser extends Post {
  user: User;
}

export interface UserWithPosts extends User {
  posts: Post[];
}
