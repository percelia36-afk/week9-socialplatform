"use client";

import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Post {
  id: number;
  user_id: number;
  title: string;
  content: string;
  video_url?: string;
  video_description?: string;
  created_at: string;
  likes: number;
  username: string;
  user_clerk_id: string;
}

// Utility function to check if URL is a valid video
const isValidVideoUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const hostname = urlObj.hostname.toLowerCase();

    console.log("Checking video URL:", url);
    console.log("Pathname:", pathname);
    console.log("Hostname:", hostname);

    // Check for direct video file extensions
    if (/\.(mp4|webm|ogg|mov|avi|m4v|3gp|flv|wmv)(\?.*)?$/i.test(pathname)) {
      console.log("Valid video extension found");
      return true;
    }

    // Check for video hosting platforms (now supported via embedding)
    const videoHosts = [
      "youtube.com",
      "youtu.be",
      "vimeo.com",
      "dailymotion.com",
      "twitch.tv",
    ];
    if (videoHosts.some((host) => hostname.includes(host))) {
      console.log("Video hosting platform detected - will use embedding");
      return true; // Now supported via embedding
    }

    // For other URLs, assume they might be valid video URLs
    console.log("Assuming valid video URL");
    return true;
  } catch (error) {
    console.log("Error parsing URL:", error);
    return false;
  }
};

// Function to check if URL needs embedding (YouTube, Vimeo, etc.)
const needsEmbedding = (url: string): boolean => {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const embedHosts = [
      "youtube.com",
      "youtu.be",
      "vimeo.com",
      "dailymotion.com",
      "twitch.tv",
    ];
    return embedHosts.some((host) => hostname.includes(host));
  } catch {
    return false;
  }
};

// Function to convert YouTube URL to embed URL
const getEmbedUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes("youtube.com")) {
      if (url.includes("/shorts/")) {
        // YouTube Shorts: https://www.youtube.com/shorts/VIDEO_ID
        const videoId = url.split("/shorts/")[1]?.split("?")[0];
        return `https://www.youtube.com/embed/${videoId}`;
      } else if (urlObj.searchParams.get("v")) {
        // Regular YouTube: https://www.youtube.com/watch?v=VIDEO_ID
        const videoId = urlObj.searchParams.get("v");
        return `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (hostname.includes("youtu.be")) {
      // YouTube short link: https://youtu.be/VIDEO_ID
      const videoId = urlObj.pathname.slice(1);
      return `https://www.youtube.com/embed/${videoId}`;
    }

    // For other platforms, return original URL (you can extend this)
    return url;
  } catch {
    return url;
  }
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      console.log("Fetching posts from /api/posts/all");
      const response = await fetch("/api/posts/all");
      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Posts data:", data);
        setPosts(data.posts || []);
      } else {
        console.error(
          "Failed to fetch posts:",
          response.status,
          response.statusText
        );
        setPosts([]);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPosting(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const video_url = formData.get("video_url") as string;
    const video_description = formData.get("video_description") as string;

    // Validate video URL if provided
    if (video_url && !isValidVideoUrl(video_url)) {
      alert(
        "Please enter a valid video URL with a supported format (MP4, WebM, OGG, MOV, AVI, etc.)"
      );
      setIsPosting(false);
      return;
    }

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          content,
          video_url: video_url || null,
          video_description: video_description || null,
        }),
      });

      if (response.ok) {
        setIsCreateOpen(false);
        fetchPosts(); // Refresh posts
        (e.target as HTMLFormElement).reset();
      }
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const deletePost = async (postId: number) => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const response = await fetch(`/api/posts?id=${postId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPosts(); // Refresh posts
      } else {
        alert("Failed to delete post");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Error deleting post");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Debug info - remove this later */}
      <div className="bg-red-100 p-2 text-xs">
        Debug: User loaded: {user ? "Yes" : "No"}, Posts: {posts.length},
        Loading: {loading ? "Yes" : "No"}
      </div>

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Social Feed</h1>
            <nav className="flex items-center space-x-4">
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
                >
                  Sign In
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/posts"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  My Posts
                </Link>
                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </Link>
                <UserButton />
              </SignedIn>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto py-8 px-4">
        {/* Create Post Section for Signed In Users */}
        <SignedIn>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full mb-4">Create New Post</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Post</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                      placeholder="Enter post title"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="content"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Content
                    </label>
                    <textarea
                      name="content"
                      id="content"
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                      placeholder="What's on your mind?"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="video_url"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Video URL (optional)
                    </label>
                    <input
                      type="url"
                      name="video_url"
                      id="video_url"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                      placeholder="https://example.com/video.mp4"
                      pattern="https?://.*\.(mp4|webm|ogg|mov|avi|m4v|3gp|flv|wmv)(\?.*)?$"
                      title="Please enter a valid video URL ending with .mp4, .webm, .ogg, .mov, .avi, .m4v, .3gp, .flv, or .wmv"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supports direct video files (MP4, WebM, etc.) and
                      YouTube/YouTube Shorts URLs.
                      <br />
                      <span className="font-medium">Test URLs:</span>{" "}
                      BigBuckBunny.mp4 or your YouTube Shorts link
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="video_description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Video Description (optional)
                    </label>
                    <input
                      type="text"
                      name="video_description"
                      id="video_description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                      placeholder="Describe your video"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPosting}>
                      {isPosting ? "Creating..." : "Create Post"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </SignedIn>

        {/* Posts Feed */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No posts yet. Be the first to share something!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {post.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {post.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {post.title}
                </h3>
                <p className="text-gray-700 mb-4">{post.content}</p>
                {post.video_url && isValidVideoUrl(post.video_url) && (
                  <div className="mb-4">
                    {needsEmbedding(post.video_url) ? (
                      // Embedded video (YouTube, Vimeo, etc.)
                      <div
                        className="relative w-full"
                        style={{ paddingBottom: "56.25%" }}
                      >
                        <iframe
                          src={getEmbedUrl(post.video_url)}
                          className="absolute top-0 left-0 w-full h-full rounded-lg"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="Embedded video"
                        />
                      </div>
                    ) : (
                      // Direct video file
                      <video
                        controls
                        className="w-full rounded-lg max-h-96"
                        src={post.video_url}
                        preload="auto"
                        muted={false}
                        controlsList="nodownload"
                        crossOrigin="anonymous"
                        playsInline={false}
                        disablePictureInPicture={false}
                        style={{
                          willChange: "transform",
                          backfaceVisibility: "hidden",
                          transform: "translate3d(0, 0, 0)",
                          WebkitBackfaceVisibility: "hidden",
                          WebkitTransform: "translate3d(0, 0, 0)",
                        }}
                        onLoadStart={() => {
                          console.log("Video loading started");
                          const video = document.querySelector(
                            "video"
                          ) as HTMLVideoElement;
                          if (video) {
                            video.style.opacity = "1";
                          }
                        }}
                        onLoadedMetadata={(e) => {
                          const video = e.target as HTMLVideoElement;
                          console.log(
                            `Video duration: ${video.duration} seconds`
                          );
                          // Force video refresh
                          video.style.transform = "translate3d(0, 0, 0)";
                        }}
                        onCanPlay={(e) => {
                          console.log("Video can start playing");
                          const video = e.target as HTMLVideoElement;
                          // Force repaint
                          video.style.transform = "translate3d(0, 0, 0)";
                        }}
                        onPlay={(e) => {
                          console.log("Video started playing");
                          const video = e.target as HTMLVideoElement;
                          // Ensure hardware acceleration is active
                          video.style.willChange = "transform";
                        }}
                        onPause={(e) => {
                          console.log("Video paused");
                          const video = e.target as HTMLVideoElement;
                          video.style.willChange = "auto";
                        }}
                        onCanPlayThrough={() => {
                          console.log("Video can play through to end");
                        }}
                        onWaiting={() => {
                          console.log("Video is waiting for more data");
                        }}
                        onStalled={() => {
                          console.log("Video download has stalled");
                        }}
                        onSuspend={() => {
                          console.log("Video loading suspended");
                        }}
                        onProgress={(e) => {
                          const video = e.target as HTMLVideoElement;
                          if (video.buffered.length > 0) {
                            const bufferedEnd = video.buffered.end(
                              video.buffered.length - 1
                            );
                            const duration = video.duration;
                            if (duration > 0) {
                              const bufferedPercent =
                                (bufferedEnd / duration) * 100;
                              console.log(
                                `Video buffered: ${bufferedPercent.toFixed(1)}%`
                              );

                              // Force continued loading if buffer is low
                              if (
                                bufferedPercent < 50 &&
                                video.currentTime > bufferedEnd - 5
                              ) {
                                console.log("Triggering additional buffering");
                                video.load();
                              }
                            }
                          }
                        }}
                        onTimeUpdate={(e) => {
                          const video = e.target as HTMLVideoElement;

                          // Force frame refresh every second to prevent frame freezing
                          if (Math.floor(video.currentTime) % 1 === 0) {
                            video.style.transform = "translate3d(0, 0, 0)";
                          }

                          if (video.buffered.length > 0) {
                            const currentTime = video.currentTime;
                            const bufferedEnd = video.buffered.end(
                              video.buffered.length - 1
                            );

                            // Prevent freezing by checking if we're approaching unbuffered content
                            if (
                              currentTime >= bufferedEnd - 2 &&
                              !video.paused
                            ) {
                              console.log(
                                "Approaching buffer end, pausing to load more"
                              );
                              video.pause();
                              setTimeout(() => {
                                if (
                                  video.buffered.length > 0 &&
                                  video.buffered.end(
                                    video.buffered.length - 1
                                  ) >
                                    currentTime + 1
                                ) {
                                  video.play();
                                }
                              }, 500);
                            }
                          }
                        }}
                        onError={(e) => {
                          console.error("Video load error:", e);
                          // Hide video element on error
                          const video = e.target as HTMLVideoElement;
                          const container = video.parentElement;
                          if (container) {
                            container.innerHTML = `
                              <div class="bg-gray-100 p-4 rounded-lg text-center">
                                <p class="text-gray-600 mb-2">Video could not be loaded</p>
                                <a href="${post.video_url}" target="_blank" rel="noopener noreferrer" 
                                   class="text-blue-600 hover:text-blue-800 underline">
                                  🎥 Open Video Link
                                </a>
                              </div>
                            `;
                          }
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                    {post.video_description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {post.video_description}
                      </p>
                    )}
                  </div>
                )}
                {post.video_url && !isValidVideoUrl(post.video_url) && (
                  <div className="mb-4 bg-gray-100 p-4 rounded-lg text-center">
                    <p className="text-gray-600 mb-2">Video link provided:</p>
                    <a
                      href={post.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      🎥 Open Video Link
                    </a>
                    {post.video_description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {post.video_description}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">
                      {post.likes} likes
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">
                      {new Date(post.created_at).toLocaleTimeString()}
                    </span>
                    {user && user.id === post.user_clerk_id && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePost(post.id)}
                        className="text-xs ml-2"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
