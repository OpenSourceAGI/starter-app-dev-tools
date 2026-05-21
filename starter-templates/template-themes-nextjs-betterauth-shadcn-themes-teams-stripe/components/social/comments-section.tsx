"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDistanceToNow } from "date-fns"
import { MessageCircle, Send } from "lucide-react"
import { toast } from "sonner"

interface Comment {
  id: string
  userId: string
  content: string
  parentCommentId?: string | null
  editedAt?: Date | null
  createdAt: Date
  userName: string
  userImage?: string | null
  replies?: Comment[]
}

interface CommentsSectionProps {
  itemType: "debate_report" | "news_tip" | "signal" | "strategy"
  itemId: string
}

export function CommentsSection({ itemType, itemId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [loading, setLoading] = useState(false)

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `/api/comments?itemType=${itemType}&itemId=${itemId}`
      )
      const data = await response.json()

      if (response.ok) {
        setComments(data.data)
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [itemType, itemId])

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemType,
          itemId,
          content: newComment,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewComment("")
        fetchComments()
        toast.success("Comment added")
      } else {
        toast.error(data.error || "Failed to add comment")
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      toast.error("Failed to add comment")
    } finally {
      setLoading(false)
    }
  }

  const handleAddReply = async (parentCommentId: string) => {
    if (!replyText.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemType,
          itemId,
          content: replyText,
          parentCommentId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setReplyText("")
        setReplyingTo(null)
        fetchComments()
        toast.success("Reply added")
      } else {
        toast.error(data.error || "Failed to add reply")
      }
    } catch (error) {
      console.error("Error adding reply:", error)
      toast.error("Failed to add reply")
    } finally {
      setLoading(false)
    }
  }

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? "ml-12" : ""} space-y-3`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.userImage || undefined} />
          <AvatarFallback>{comment.userName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.userName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.editedAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
          <p className="text-sm">{comment.content}</p>
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(comment.id)}
              className="h-auto p-0 text-xs"
            >
              Reply
            </Button>
          )}
          {replyingTo === comment.id && (
            <div className="flex gap-2 mt-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  onClick={() => handleAddReply(comment.id)}
                  disabled={loading}
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyText("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        <h3 className="font-semibold">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      <div className="flex gap-3">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="flex-1"
        />
        <Button
          onClick={handleAddComment}
          disabled={loading || !newComment.trim()}
        >
          <Send className="h-4 w-4 mr-2" />
          Post
        </Button>
      </div>

      <div className="space-y-6">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  )
}
