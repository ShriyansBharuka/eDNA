import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { getSimilarity } from "../../api/client";
import type { SimilarityResponse } from "../../api/types";
import { useAppStore } from "../../store/useAppStore";
import GlassPanel from "../ui/GlassPanel";

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  isSelected?: boolean;
}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  similarity: number;
}

export default function SimilarityMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const selectedSpecies = useAppStore((s) => s.selectedSpecies);
  const [data, setData] = useState<SimilarityResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!selectedSpecies) {
      setData(null);
      setNotFound(false);
      return;
    }
    let cancelled = false;
    setNotFound(false);
    getSimilarity(selectedSpecies)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setNotFound(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSpecies]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !data) return;

    const width = svgEl.clientWidth || 640;
    const height = 420;

    const nodes: SimNode[] = [
      { id: data.species, isSelected: true },
      ...data.neighbors.map((n) => ({ id: n.species })),
    ];
    const links: SimLink[] = data.neighbors.map((n) => ({
      source: data.species,
      target: n.species,
      similarity: n.similarity,
    }));

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
          // Higher similarity = shorter edge, mirroring the mock's old feel
          // but now driven by a real cosine-similarity value (0-1).
          .distance((l) => 60 + (1 - l.similarity) * 220)
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
      .attr("stroke-opacity", (d) => 0.15 + d.similarity * 0.4)
      .attr("stroke-width", (d) => Math.max(1, d.similarity * 4));

    const node = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "default");

    node
      .append("circle")
      .attr("r", (d) => (d.isSelected ? 16 : 10))
      .attr("fill", (d) => (d.isSelected ? "#f472b6" : "#38bdf8"))
      .attr("fill-opacity", 0.85)
      .attr("stroke", "white")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1)
      .style("filter", (d) => (d.isSelected ? "drop-shadow(0 0 8px rgba(125,211,252,0.8))" : "none"));

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
  }, [data]);

  return (
    <section id="similarity" className="scroll-mt-28 w-full max-w-[80vw] mx-auto">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-2xl font-semibold text-glow">Genetic Similarity Map</h3>
        <span className="text-xs text-slate-500">Real UMAP + cosine-similarity graph, 500-species reference space</span>
      </div>
      <GlassPanel shape="wave" hover={false} className="p-4 md:p-6">
        {!selectedSpecies && (
          <p className="text-slate-400 text-sm mb-4">
            Select a species from the list above to see its nearest relatives in the learned embedding space.
          </p>
        )}
        {notFound && (
          <p className="text-slate-400 text-sm mb-4">No similarity data for this species yet.</p>
        )}
        <svg ref={svgRef} className="w-full" style={{ height: 420 }} />
        <p className="mt-3 text-xs text-slate-400">
          Node distance reflects genetic closeness, not physical location — separate from the map above. The 2D
          layout (UMAP) preserves local neighborhoods better than absolute distance; edge thickness is the real
          similarity score.
        </p>
      </GlassPanel>
    </section>
  );
}
