'use client'

interface PipelineProgressProps {
  currentPhase: number
  totalPhases?: number
}

export function PipelineProgress({ currentPhase, totalPhases = 25 }: PipelineProgressProps) {
  const percent = Math.max(0, Math.min(100, Math.round((currentPhase / totalPhases) * 100)))

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>Pipeline Progress</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-zinc-200">
        <div className="h-full bg-zinc-900 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
