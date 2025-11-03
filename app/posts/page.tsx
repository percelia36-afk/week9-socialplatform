"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";
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
}

// Utility function to check if URL is a valid video
const isValidVideoUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const hostname = urlObj.hostname.toLowerCase();

    console.log("Posts page - Checking video URL:", url);
    console.log("Posts page - Pathname:", pathname);
    console.log("Posts page - Hostname:", hostname);

    // Check for direct video file extensions
    if (/\.(mp4|webm|ogg|mov|avi|m4v|3gp|flv|wmv)(\?.*)?$/i.test(pathname)) {
      console.log("Posts page - Valid video extension found");
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
      console.log(
        "Posts page - Video hosting platform detected - will use embedding"
      );
      return true; // Now supported via embedding
    }

    // For other URLs, assume they might be valid video URLs
    console.log("Posts page - Assuming valid video URL");
    return true;
  } catch (error) {
    console.log("Posts page - Error parsing URL:", error);
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

export default function PostsPage() {
  const { user, isLoaded } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    video_url: "",
    video_description: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      fetchPosts();
    }
  }, [isLoaded, user]);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/posts");
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    // Validate video URL if provided
    if (newPost.video_url && !isValidVideoUrl(newPost.video_url)) {
      alert(
        "Please enter a valid video URL with a supported format (MP4, WebM, OGG, MOV, AVI, etc.)"
      );
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost),
      });

      if (response.ok) {
        setNewPost({
          title: "",
          content: "",
          video_url: "",
          video_description: "",
        });
        fetchPosts(); // Refresh posts
      } else {
        alert("Failed to create post");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Error creating post");
    } finally {
      setCreating(false);
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
      console.error("Error creating post:", error);
      alert("Error creating post");
    } finally {
      setCreating(false);
    }
  };

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
        <p className="text-gray-600 mb-4">
          You need to be signed in to view and create posts.
        </p>
        <Link href="/sign-in">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Posts</h1>
          <p className="text-gray-600 mt-2">Create and manage your posts</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Create New Post</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) =>
                    setNewPost({ ...newPost, title: e.target.value })
                  }
                  placeholder="Enter post title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) =>
                    setNewPost({ ...newPost, content: e.target.value })
                  }
                  placeholder="What's on your mind?"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL (optional)
                </label>
                <input
                  type="url"
                  value={newPost.video_url}
                  onChange={(e) =>
                    setNewPost({ ...newPost, video_url: e.target.value })
                  }
                  placeholder="https://example.com/video.mp4"
                  pattern="https?://.*\.(mp4|webm|ogg|mov|avi)(\?.*)?$"
                  title="Please enter a valid video URL ending with .mp4, .webm, .ogg, .mov, or .avi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supports direct video files (MP4, WebM, etc.) and
                  YouTube/YouTube Shorts URLs.
                  <br />
                  <span className="font-medium">Test URLs:</span>{" "}
                  BigBuckBunny.mp4 or YouTube Shorts
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Description (optional)
                </label>
                <textarea
                  value={newPost.video_description}
                  onChange={(e) =>
                    setNewPost({
                      ...newPost,
                      video_description: e.target.value,
                    })
                  }
                  placeholder="Describe your video..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setNewPost({
                      title: "",
                      content: "",
                      video_url: "",
                      video_description: "",
                    })
                  }
                >
                  Cancel
                </Button>
                <Button
                  onClick={createPost}
                  disabled={
                    creating || !newPost.title.trim() || !newPost.content.trim()
                  }
                >
                  {creating ? "Creating..." : "Create Post"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <Link href="/profile">
            <Button variant="outline">View Profile</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No posts yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first post to get started!
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Create Your First Post</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) =>
                      setNewPost({ ...newPost, title: e.target.value })
                    }
                    placeholder="Enter post title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) =>
                      setNewPost({ ...newPost, content: e.target.value })
                    }
                    placeholder="What's on your mind?"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video URL (optional)
                  </label>
                  <input
                    type="url"
                    value={newPost.video_url}
                    onChange={(e) =>
                      setNewPost({ ...newPost, video_url: e.target.value })
                    }
                    placeholder="https://example.com/video.mp4"
                    pattern="https?://.*\.(mp4|webm|ogg|mov|avi|m4v|3gp|flv|wmv)(\?.*)?$"
                    title="Please enter a valid video URL ending with .mp4, .webm, .ogg, .mov, .avi, .m4v, .3gp, .flv, or .wmv"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supports direct video files (MP4, WebM, etc.) and
                    YouTube/YouTube Shorts URLs.
                    <br />
                    <span className="font-medium">Test URLs:</span>{" "}
                    BigBuckBunny.mp4 or YouTube Shorts
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Description (optional)
                  </label>
                  <textarea
                    value={newPost.video_description}
                    onChange={(e) =>
                      setNewPost({
                        ...newPost,
                        video_description: e.target.value,
                      })
                    }
                    placeholder="Describe your video..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 bg-white"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setNewPost({
                        title: "",
                        content: "",
                        video_url: "",
                        video_description: "",
                      })
                    }
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createPost}
                    disabled={
                      creating ||
                      !newPost.title.trim() ||
                      !newPost.content.trim()
                    }
                  >
                    {creating ? "Creating..." : "Create Post"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg border p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
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
                        console.log("Posts page - Video loading started");
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
                          `Posts page - Video duration: ${video.duration} seconds`
                        );
                        // Force video refresh
                        video.style.transform = "translate3d(0, 0, 0)";
                      }}
                      onCanPlay={(e) => {
                        console.log("Posts page - Video can start playing");
                        const video = e.target as HTMLVideoElement;
                        // Force repaint
                        video.style.transform = "translate3d(0, 0, 0)";
                      }}
                      onPlay={(e) => {
                        console.log("Posts page - Video started playing");
                        const video = e.target as HTMLVideoElement;
                        // Ensure hardware acceleration is active
                        video.style.willChange = "transform";
                      }}
                      onPause={(e) => {
                        console.log("Posts page - Video paused");
                        const video = e.target as HTMLVideoElement;
                        video.style.willChange = "auto";
                      }}
                      onCanPlayThrough={() => {
                        console.log(
                          "Posts page - Video can play through to end"
                        );
                      }}
                      onWaiting={() => {
                        console.log(
                          "Posts page - Video is waiting for more data"
                        );
                      }}
                      onStalled={() => {
                        console.log("Posts page - Video download has stalled");
                      }}
                      onSuspend={() => {
                        console.log("Posts page - Video loading suspended");
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
                              `Posts page - Video buffered: ${bufferedPercent.toFixed(
                                1
                              )}%`
                            );

                            // Force continued loading if buffer is low
                            if (
                              bufferedPercent < 50 &&
                              video.currentTime > bufferedEnd - 5
                            ) {
                              console.log(
                                "Posts page - Triggering additional buffering"
                              );
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
                          if (currentTime >= bufferedEnd - 2 && !video.paused) {
                            console.log(
                              "Posts page - Approaching buffer end, pausing to load more"
                            );
                            video.pause();
                            setTimeout(() => {
                              if (
                                video.buffered.length > 0 &&
                                video.buffered.end(video.buffered.length - 1) >
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

              <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-200">
                <span>
                  {new Date(post.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <div className="flex items-center gap-4">
                  <span>❤️ {post.likes}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePost(post.id)}
                    className="text-xs"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
