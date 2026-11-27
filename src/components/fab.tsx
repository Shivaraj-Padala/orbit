import { Plus } from "lucide-react"

export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed right-[max(1rem,calc(50vw-16rem+1rem))] bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/15 transition-transform outline-none focus-visible:ring-4 focus-visible:ring-ring/50 active:scale-95"
    >
      <Plus className="size-6" strokeWidth={2.25} />
    </button>
  )
}
