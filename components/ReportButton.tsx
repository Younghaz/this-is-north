"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

interface ReportButtonProps {
  contentType: "comment" | "article";
  contentId: number;
  className?: string;
}

const reportReasons = [
  "Spam or unwanted content",
  "Harassment or bullying",
  "Inappropriate language",
  "False information",
  "Copyright violation",
  "Other",
];

export default function ReportButton({ contentType, contentId, className = "" }: ReportButtonProps) {
  const [isReporting, setIsReporting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState<string>("");
  const supabase = getBrowserSupabase();

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReporting || isSubmitted || !reason) return;
    setIsReporting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        alert("You must be logged in to report content.");
        setIsReporting(false);
        return;
      }
      const { error } = await supabase
        .from("reports")
        .insert({
          content_type: contentType,
          content_id: contentId,
          reporter_id: user.user.id,
          reason,
          status: "pending",
        })
        .select();
      if (error) {
        if (error.code === "23505") {
          alert("You have already reported this content.");
        } else {
          alert("Failed to submit report. Please try again.");
        }
        setIsReporting(false);
        return;
      }
      setIsSubmitted(true);
      setShowForm(false);
      alert("Thank you! Your report has been submitted and will be reviewed by our moderation team.");
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch {
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsReporting(false);
    }
  };

  if (isSubmitted) {
    return <span className={`text-xs text-green-600 ${className}`}>✓ Reported</span>;
  }

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className={`text-xs text-gray-500 hover:text-red-600 hover:underline ${className}`}
        aria-label={`Report ${contentType}`}
        disabled={isReporting}
      >
        Report
      </button>
      {showForm && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">Report {contentType}</h3>
            <form onSubmit={handleReport}>
              <div className="space-y-3 mb-4">
                {reportReasons.map((r) => {
                  return (
                    <label key={r} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reason === r}
                        onChange={(e) => setReason(e.target.value)}
                        className="text-blue-600"
                      />
                      <span className="text-sm">{r}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setReason("");
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
                  {isReporting ? "Reporting..." : "Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}