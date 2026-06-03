"use client";

import { useEffect, useRef, useState } from "react";

export interface SelectableWorkflowNode {
  id: string;
  status: "pending" | "active" | "review" | "done" | "error";
}

export function useWorkflowNodeSelection<T extends SelectableWorkflowNode>({
  nodes,
  activeNodeId,
  isGenerating,
  awaitingConfirm,
  initialNodeId = "outline",
}: {
  nodes: T[];
  activeNodeId: string | null;
  isGenerating: boolean;
  awaitingConfirm: boolean;
  initialNodeId?: string;
}) {
  const [selectedNodeId, setSelectedNodeId] = useState(initialNodeId);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || nodes[0];
  const firstErrorNode = nodes.find((node) => node.status === "error");

  useEffect(() => {
    if (!activeNodeId) return;
    setSelectedNodeId(activeNodeId);
    scrollNodeIntoView(nodeRefs.current[activeNodeId]);
  }, [activeNodeId]);

  useEffect(() => {
    if (isGenerating || awaitingConfirm || !firstErrorNode) return;
    setSelectedNodeId((current) => {
      const currentNode = nodes.find((node) => node.id === current);
      return currentNode?.status === "error" ? current : firstErrorNode.id;
    });
    scrollNodeIntoView(nodeRefs.current[firstErrorNode.id]);
  }, [awaitingConfirm, firstErrorNode?.id, isGenerating, nodes]);

  return {
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    nodeRefs,
  };
}

function scrollNodeIntoView(element: HTMLButtonElement | null | undefined): void {
  window.setTimeout(() => {
    element?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }, 80);
}
