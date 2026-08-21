import { resolveIucnCategory } from "../../lib/iucn";

export default function ConservationBadge({ flag }: { flag: string | null }) {
  const category = resolveIucnCategory(flag);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{
        borderColor: `${category.color}66`,
        color: category.color,
        background: `${category.color}14`,
      }}
      title={category.description}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: category.color }} />
      {category.code === "—" ? "No flag" : category.label}
    </span>
  );
}
