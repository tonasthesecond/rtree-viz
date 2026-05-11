import { useMemo, type ReactNode } from "react";
import { useHover, type HoverItem } from "./HoverContext";
import type { RTreeNode, RTreeInternalNode } from "../types/rtree";

interface Props {
  text: string;
}

const TOKEN_RE = /(\bn\d+\b|\b[A-Z][0-9]?\b)/g;

function collectNodeIds(node: RTreeNode | null, set: Set<string>) {
  if (!node) return;
  set.add(node.id);
  if (!node.isLeaf) {
    for (const c of (node as RTreeInternalNode).children) {
      collectNodeIds(c, set);
    }
  }
}

function HoverSpan({
  item,
  children,
  className,
}: {
  item: HoverItem;
  children: ReactNode;
  className: string;
}) {
  const { setHovered, setCursor, hovered } = useHover();
  const active =
    !!hovered && hovered.kind === item.kind && hovered.id === item.id;
  return (
    <span
      className={`${className}${active ? " active" : ""}`}
      onMouseEnter={(e) => {
        setHovered(item);
        setCursor({ x: e.clientX, y: e.clientY });
      }}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setHovered(null)}
    >
      {children}
    </span>
  );
}

export function RichText({ text }: Props) {
  const { graph, rtreeRoot } = useHover();

  const validNodeIds = useMemo(() => {
    const set = new Set<string>();
    collectNodeIds(rtreeRoot, set);
    return set;
  }, [rtreeRoot]);

  const labelToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of graph.points) m.set(p.label, p.id);
    return m;
  }, [graph.points]);

  const parts: ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const re = new RegExp(TOKEN_RE.source, "g");

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const tok = match[0];
    if (validNodeIds.has(tok)) {
      parts.push(
        <HoverSpan
          key={key++}
          item={{ kind: "node", id: tok }}
          className="hl-node"
        >
          {tok}
        </HoverSpan>,
      );
    } else if (labelToId.has(tok)) {
      parts.push(
        <HoverSpan
          key={key++}
          item={{ kind: "point", id: labelToId.get(tok)! }}
          className="hl-point"
        >
          {tok}
        </HoverSpan>,
      );
    } else {
      parts.push(tok);
    }
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));

  return <>{parts}</>;
}
