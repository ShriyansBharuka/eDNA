import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { useAppStore } from "../../store/useAppStore";
import GlassPanel from "../ui/GlassPanel";
import { MOCK_SIMILARITY_EDGES, MOCK_SIMILARITY_NODES } from "../../lib/mockSimilarity";

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  isUnknown?: boolean;
  highlighted?: boolean;
}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  distance: number;
}

export default function SimilarityMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = svgEl.clientWidth || 640;
    const height = 420;

    const nodes: SimNode[] = MOCK_SIMILARITY_NODES.map((n) => ({
      ...n,
      highlighted: n.id === selectedSpecies,
    }));
    const links: SimLink[] = MOCK_SIMILARITY_EDGES.map((e) => ({ ...e }));

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => 60 + l.distance * 220)
      )
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(38));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#7dd3fc")
      .attr("stroke-opacity", (d) => 0.15 + (1 - d.distance) * 0.4)
      .attr("stroke-width", (d) => Math.max(1, (1 - d.distance) * 4));

    const node = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "default");

    node
      .append("circle")
      .attr("r", (d) => (d.isUnknown ? 16 : d.highlighted ? 14 : 10))
      .attr("fill", (d) => (d.isUnknown ? "#f472b6" : d.highlighted ? "#5eead4" : "#38bdf8"))
      .attr("fill-opacity", 0.85)
      .attr("stroke", "white")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1)
      .style("filter", (d) => (d.isUnknown || d.highlighted ? "drop-shadow(0 0 8px rgba(125,211,252,0.8))" : "none"));

    node
      .append("text")
      .text((d) => d.id)
      .attr("x", 14)
      .attr("y", 4)
      .attr("font-size", 11)
      .attr("fill", "#cbd5e1")
      .style("font-style", "italic")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);

      node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [selectedSpecies]);

  return (
    <section id="similarity" className="scroll-mt-28">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-2xl font-semibold text-glow">Genetic Similarity Map</h3>
        <span className="text-xs text-slate-500">Mock projection — pending Aarya's UMAP/GNN endpoint</span>
      </div>
      <GlassPanel shape="wave" hover={false} className="p-4 md:p-6">
        <svg ref={svgRef} className="w-full" style={{ height: 420 }} />
        <p className="mt-3 text-xs text-slate-400">
          Node distance reflects genetic closeness, not physical location — separate from the map above.
        </p>
      </GlassPanel>
    </section>
  );
}
