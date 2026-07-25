"use client"
// TEMPORARY dev-only route: renders the real /api/topics data through the same
// section slices and the same tile markup as TopicSlider, so the topic icons can
// be eyeballed without signing in. Delete once the icon set is signed off.
import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import { getTopicIcon } from "@/lib/icons/topic-icons"
import "@/lib/icons/offline-icons"

type Topic = { id: number; name: string }

// Same slices TopicSlider uses (language-selector.tsx sections useMemo).
const SECTIONS: [string, number, number][] = [
  ["FIRST AID KIT", 0, 6],
  ["DAILY LIFE", 6, 14],
  ["PERSONAL & SOCIAL LIFE", 14, 20],
  ["WORK & SCHOOL", 20, 28],
  ["CULTURE & SOCIETY", 28, 36],
  ["PROFESSIONAL", 36, 43],
]

export default function IconPreview() {
  const [topics, setTopics] = useState<Topic[]>([])

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((d) => setTopics(Array.isArray(d) ? d : d.topics ?? []))
      .catch(() => setTopics([]))
  }, [])

  return (
    <div
      className="min-h-screen p-6"
      style={{
        backgroundImage: "url('/bg.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-white/5 backdrop-blur-3xl border border-white/15 rounded-3xl p-6 shadow-2xl max-w-5xl mx-auto space-y-8">
        {SECTIONS.map(([name, from, to]) => (
          <section key={name}>
            <h2 className="text-white/70 text-sm font-semibold tracking-widest mb-3">
              {name}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4">
              {topics.slice(from, to).map((topic) => (
                <div
                  key={topic.id}
                  className="bg-black/40 rounded-2xl p-5 text-center h-40 shadow-lg"
                >
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Icon
                      icon={getTopicIcon(topic.id)}
                      className="w-16 h-16 mx-auto"
                      style={{ color: "rgba(255,255,255,0.8)" }}
                    />
                    <p className="text-white/90 text-xl font-medium leading-tight">
                      {topic.name}
                    </p>
                    <p className="text-white/40 text-[10px] leading-none">
                      {getTopicIcon(topic.id)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
