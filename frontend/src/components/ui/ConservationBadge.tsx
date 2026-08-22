import { resolveIucnCategory } from "../../lib/iucn";
import { useAppStore } from "../../store/useAppStore";

export default function ConservationBadge({ flag }: { flag: string | null }) {
  const category = resolveIucnCategory(flag);
  const setIucnOpen = useAppStore((s) => s.setIucnOpen);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setIucnOpen(true);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-transform hover:scale-105"
      style={{
        borderColor: `${category.color}66`,
        color: category.color,
        background: `${category.color}14`,
      }}
      title={`${category.label} — Click to view IUCN Red List guide`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: category.color }} />
      {category.code === "—" ? "No flag" : category.label}
    </button>
  );
}
