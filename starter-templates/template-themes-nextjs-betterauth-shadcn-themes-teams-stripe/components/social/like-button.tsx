"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  itemType: "debate_report" | "news_tip" | "signal" | "strategy" | "comment"
  itemId: string
  className?: string
  showCount?: boolean
}

export function LikeButton({
  itemType,
  itemId,
  className,
  showCount = true,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchLikeStatus = async () => {
    try {
      const response = await fetch(
        `/api/likes?itemType=${itemType}&itemId=${itemId}`
      )
      const data = await response.json()

      if (response.ok) {
        setLiked(data.data.userLiked)
        setCount(data.data.count)
      }
    } catch (error) {
      console.error("Error fetching like status:", error)
    }
  }

  useEffect(() => {
    fetchLikeStatus()
  }, [itemType, itemId])

  const handleToggleLike = async () => {
    setLoading(true)

    try {
      if (liked) {
        // Unlike
        const response = await fetch(
          `/api/likes?itemType=${itemType}&itemId=${itemId}`,
          {
            method: "DELETE",
          }
        )

        const data = await response.json()

        if (response.ok) {
          setLiked(false)
          setCount(data.data.count)
        } else {
          toast.error(data.error || "Failed to unlike")
        }
      } else {
        // Like
        const response = await fetch("/api/likes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itemType,
            itemId,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          setLiked(true)
          setCount(data.data.count)
        } else {
          if (response.status === 401) {
            toast.error("Please sign in to like")
          } else {
            toast.error(data.error || "Failed to like")
          }
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      toast.error("Failed to update like")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleLike}
      disabled={loading}
      className={cn("gap-2", className)}
    >
      <Heart
        className={cn(
          "h-4 w-4",
          liked && "fill-red-500 text-red-500"
        )}
      />
      {showCount && count > 0 && (
        <span className="text-sm">{count}</span>
      )}
    </Button>
  )
}
