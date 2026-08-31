/**
 * ContentFeedback.tsx — Inline feedback widget for study content quality.
 */

import { useState, useCallback } from 'react'
import { submitContentFeedback } from '../api/client'
import { Star, MessageSquare, Check, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'

interface ContentFeedbackProps {
  skill: string
  sectionIdx?: number
  contentType?: 'section' | 'overview' | 'quiz'
}

export default function ContentFeedback({ skill, sectionIdx, contentType = 'section' }: ContentFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [feedbackType, setFeedbackType] = useState<'rating' | 'error_report' | 'suggestion'>('rating')
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleStarClick = useCallback(async (star: number) => {
    setRating(star)
    setSubmitting(true)
    try {
      await submitContentFeedback({
        skill,
        section_idx: sectionIdx,
        feedback_type: 'rating',
        rating: star,
        content_type: contentType,
      })
      setSubmitted(true)
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }, [skill, sectionIdx, contentType])

  const handleSubmitComment = useCallback(async () => {
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      await submitContentFeedback({
        skill,
        section_idx: sectionIdx,
        feedback_type: feedbackType,
        comment: comment.trim(),
        content_type: contentType,
      })
      setSubmitted(true)
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }, [skill, sectionIdx, feedbackType, comment, contentType])

  if (submitted && !showForm) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Check className="size-4 text-success" />
        <span>Thanks for your feedback</span>
      </div>
    )
  }

  return (
    <div className="space-y-3 border-t border-border py-3">
      {/* Star rating */}
      {!rating && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rate this content:</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                className="p-0.5 transition-colors"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => handleStarClick(star)}
                disabled={submitting}
              >
                <Star
                  className={`size-4 transition-colors ${
                    star <= (hoveredStar || 0)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/40'
                  }`}
                />
              </button>
            ))}
          </div>
          {submitting && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* Detailed feedback toggle */}
      {rating && !showForm && (
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowForm(true)}
        >
          <MessageSquare className="size-3" />
          Add detailed feedback
        </button>
      )}

      {/* Detailed form */}
      {showForm && !submitted && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {(['error_report', 'suggestion'] as const).map(type => (
              <Badge
                key={type}
                variant={feedbackType === type ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setFeedbackType(type)}
              >
                {type === 'error_report' ? 'Report Error' : 'Suggestion'}
              </Badge>
            ))}
          </div>
          <Textarea
            placeholder={feedbackType === 'error_report' ? 'Describe the issue...' : 'Your suggestion...'}
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmitComment} disabled={submitting || !comment.trim()}>
              {submitting && <Loader2 className="mr-1 size-3 animate-spin" />}
              Submit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
