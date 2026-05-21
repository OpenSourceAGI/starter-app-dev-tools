"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { UserPlus, UserCheck } from "lucide-react"
import { toast } from "sonner"

interface FollowButtonProps {
  userId: string
  className?: string
}

export function FollowButton({ userId, className }: FollowButtonProps) {
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkFollowStatus = async () => {
    try {
      const response = await fetch(`/api/users/follow?type=following`)
      const data = await response.json()

      if (response.ok) {
        const isFollowing = data.data.some((f: any) => f.userId === userId)
        setFollowing(isFollowing)
      }
    } catch (error) {
      console.error("Error checking follow status:", error)
    }
  }

  useEffect(() => {
    checkFollowStatus()
  }, [userId])

  const handleToggleFollow = async () => {
    setLoading(true)

    try {
      if (following) {
        // Unfollow
        const response = await fetch(`/api/users/follow?userId=${userId}`, {
          method: "DELETE",
        })

        const data = await response.json()

        if (response.ok) {
          setFollowing(false)
          toast.success("Unfollowed user")
        } else {
          toast.error(data.error || "Failed to unfollow")
        }
      } else {
        // Follow
        const response = await fetch("/api/users/follow", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        })

        const data = await response.json()

        if (response.ok) {
          setFollowing(true)
          toast.success("Following user")
        } else {
          if (response.status === 401) {
            toast.error("Please sign in to follow users")
          } else {
            toast.error(data.error || "Failed to follow")
          }
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      toast.error("Failed to update follow status")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      onClick={handleToggleFollow}
      disabled={loading}
      className={className}
    >
      {following ? (
        <>
          <UserCheck className="h-4 w-4 mr-2" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  )
}
