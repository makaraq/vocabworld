"use client"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

export function ClearProgressButton() {
  const { user } = useAuth()
  const [clearing, setClearing] = useState(false)
  const [message, setMessage] = useState("")

  const clearProgress = async () => {
    if (!user?.id) {
      setMessage("❌ No user found")
      return
    }

    if (!confirm("Are you sure you want to clear ALL your progress data? This cannot be undone!")) {
      return
    }

    setClearing(true)
    setMessage("")

    try {
      console.log("🧹 Clearing progress for user:", user.email)
      
      // Clear user progress data using client
      const { error: progressError } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', user.id)

      if (progressError) {
        throw new Error(`Failed to clear progress: ${progressError.message}`)
      }

      console.log("✅ Progress cleared successfully")
      setMessage("✅ Progress cleared! Refresh the page to see changes.")
      
      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error("❌ Error clearing progress:", error)
      setMessage(`❌ Error: ${error.message}`)
    } finally {
      setClearing(false)
    }
  }

  if (!user) return null

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 my-4">
      <h3 className="text-white font-semibold mb-2">🧹 Clear Progress Data</h3>
      <p className="text-white/80 text-sm mb-3">
        Clear all progress data for: <strong>{user.email}</strong>
      </p>
      <button
        onClick={clearProgress}
        disabled={clearing}
        className="bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {clearing ? "Clearing..." : "Clear All Progress"}
      </button>
      {message && (
        <p className="text-sm mt-2 text-white/90">{message}</p>
      )}
    </div>
  )
}