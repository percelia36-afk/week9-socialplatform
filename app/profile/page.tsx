"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";

interface UserProfile {
  id: number;
  clerk_id: string;
  username: string;
  email: string;
  bio: string;
  created_at: string;
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (isLoaded && user) {
      fetchProfile();
    }
  }, [isLoaded, user]);

  const fetchProfile = async () => {
    try {
      console.log("Fetching profile...");
      const response = await fetch("/api/profile");
      console.log("Profile response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Profile data:", data);
        setProfile(data.profile);
        setBio(data.profile?.bio || "");
      } else {
        console.error("Failed to fetch profile:", response.status);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio }),
      });

      if (response.ok) {
        fetchProfile();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please Sign In
          </h1>
          <Link
            href="/sign-in"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Debug info - remove this later */}
      <div className="bg-red-100 p-2 text-xs">
        Debug: Profile loaded: {profile ? "Yes" : "No"}, User:{" "}
        {user?.emailAddresses?.[0]?.emailAddress}, Loading:{" "}
        {loading ? "Yes" : "No"}
      </div>

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <nav className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </Link>
              <Link
                href="/posts"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                My Posts
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Profile Header */}
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.emailAddresses?.[0]?.emailAddress
                ?.charAt(0)
                .toUpperCase() || "U"}
            </div>
            <div className="ml-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {profile?.username ||
                  user.emailAddresses?.[0]?.emailAddress ||
                  "User"}
              </h2>
              <p className="text-gray-600">
                {user.emailAddresses?.[0]?.emailAddress}
              </p>
              {profile?.created_at && (
                <p className="text-sm text-gray-500">
                  Member since{" "}
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Bio Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Biography</h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                {isEditing ? "Cancel" : "Edit"}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={updateProfile} className="space-y-4">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setBio(profile?.bio || "");
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-gray-700">
                {profile?.bio || (
                  <span className="text-gray-500 italic">
                    No biography added yet. Click &quot;Edit&quot; to add one.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/posts"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-lg text-center transition"
              >
                <div className="font-medium">Manage Posts</div>
                <div className="text-sm">View and edit your posts</div>
              </Link>
              <Link
                href="/"
                className="bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-lg text-center transition"
              >
                <div className="font-medium">Social Feed</div>
                <div className="text-sm">See community posts</div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
