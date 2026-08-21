import { HTMLAttributes, forwardRef } from "react";

export type PanelShape = "blob-a" | "blob-b" | "blob-c" | "hex" | "wave" | "angled" | "round";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  shape?: PanelShape;
  hover?: boolean;
}

const shapeClass: Record<PanelShape, string> = {
  "blob-a": "shape-blob-a",
  "blob-b": "shape-blob-b",
  "blob-c": "shape-blob-c",
  hex: "shape-hex",
  wave: "shape-wave",
  angled: "shape-angled",
  round: "shape-round",
};

const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ shape = "round", hover = true, className = "", children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={`glass ${shapeClass[shape]} ${hover ? "glass-hover" : ""} ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export default GlassPanel;
