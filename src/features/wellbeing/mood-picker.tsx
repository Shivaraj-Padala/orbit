import { cn } from "@/lib/utils"

import { MOODS } from "./data"

export function MoodPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (mood: number) => void
}) {
  return (
    <div role="radiogroup" aria-label="Mood" className="grid grid-cols-5 gap-1.5">
      {MOODS.map(({ value: v, label, icon: Icon }) => {
        const selected = value === v
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(v)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl py-2.5 text-[11px] font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Icon className="size-7" strokeWidth={selected ? 2 : 1.5} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
