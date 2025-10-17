'use client'

import { useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase-browser'

interface ReportButtonProps {
  contentType: 'comment' | 'article'
  contentId: number
  className?: string
}

export default function ReportButton({ 
  contentType, 
  contentId, 
  className = '' 
}: ReportButtonProps) {
  const [isReporting, setIsReporting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const supabase = getBrowserSupabase()

  const reportReasons = [
    'Spam or unwanted content',
    'Harassment or bullying',
    'Inappropriate language',
    'False information',
    'Copyright violation',
    'Other'
  ]

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return

    setIsReporting(true)

    try {
      const { data: user } = await supabase.auth.getUser()
      
      if (!user.user) {
        alert('You must be logged in to report content.')
        return
      }

      // Insert report into reports table (you'll need to create this table)
      const { error } = await supabase
        .from('reports')
        .insert({
          content_type: contentType,
          content_id: contentId,
          reporter_id: user.user.id,
          reason: reason,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Report error:', error)
        alert('Failed to submit report. Please try again.')
        return
      }

      setIsSubmitted(true)
      setShowForm(false)
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false)
      }, 3000)
      
    } catch (error) {
      console.error('Report error:', error)
      alert('Failed to submit report. Please try again.')
    } finally {
      setIsReporting(false)
    }
  }

  if (isSubmitted) {
    return (
      <span className={`text-xs text-green-600 ${className}`}>
        ✓ Reported
      </span>
    )
  }

  if (showForm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            Report {contentType}
          </h3>
          
          <form onSubmit={handleReport}>
            <div className="space-y-3 mb-4">
              {reportReasons.map((reportReason) => (
                <label key={reportReason} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="reason"
                    value={reportReason}
                    checked={reason === reportReason}
                    onChange={(e) => setReason(e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">{reportReason}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setReason('')
                }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 flex-1"
                disabled={isReporting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason || isReporting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                {isReporting ? 'Reporting...' : 'Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className={`text-xs text-gray-500 hover:text-red-600 hover:underline ${className}`}
      aria-label={`Report ${contentType}`}
    >
      Report
    </button>
  )
}