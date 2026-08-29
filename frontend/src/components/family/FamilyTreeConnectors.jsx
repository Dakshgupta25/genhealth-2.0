import React, { useEffect, useState, useCallback } from 'react';

export function FamilyTreeConnectors({ containerRef, treeData }) {
  const [paths, setPaths] = useState([]);
  const [junctions, setJunctions] = useState([]);

  const computeLines = useCallback(() => {
    if (!containerRef?.current || !treeData) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const getNodeCenter = (nodeId) => {
      if (!nodeId) return null;
      const el = container.querySelector(`[data-node-id="${nodeId}"]`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        id: nodeId,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
        top: rect.top - containerRect.top,
        bottom: rect.bottom - containerRect.top,
        left: rect.left - containerRect.left,
        right: rect.right - containerRect.left,
        width: rect.width,
        height: rect.height,
      };
    };

    const newPaths = [];
    const newJunctions = [];

    const selfPos = getNodeCenter(treeData.self_node?.id);
    if (!selfPos) return;

    const parentPositions = (treeData.parents || [])
      .map((p) => getNodeCenter(p.relative_id))
      .filter(Boolean);

    const grandparentPositions = (treeData.grandparents || [])
      .map((gp) => getNodeCenter(gp.relative_id))
      .filter(Boolean);

    // 1. CONNECT GRANDPARENTS (Tier 1) TO PARENTS (Tier 2) OR SELF
    if (grandparentPositions.length > 0) {
      if (parentPositions.length > 0) {
        const gpBottom = Math.max(...grandparentPositions.map((gp) => gp.bottom));
        const pTop = Math.min(...parentPositions.map((p) => p.top));
        const midY = (gpBottom + pTop) / 2;

        grandparentPositions.forEach((gp) => {
          newPaths.push(`M ${gp.x} ${gp.bottom} L ${gp.x} ${midY}`);
          newJunctions.push({ x: gp.x, y: midY });
        });

        const minGpX = Math.min(...grandparentPositions.map((gp) => gp.x));
        const maxGpX = Math.max(...grandparentPositions.map((gp) => gp.x));
        newPaths.push(`M ${minGpX} ${midY} L ${maxGpX} ${midY}`);

        parentPositions.forEach((p) => {
          newPaths.push(`M ${p.x} ${midY} L ${p.x} ${p.top}`);
          newJunctions.push({ x: p.x, y: midY });
        });
      } else {
        // Direct Grandparents to Self if parents not listed
        const gpBottom = Math.max(...grandparentPositions.map((gp) => gp.bottom));
        const midY = (gpBottom + selfPos.top) / 2;

        grandparentPositions.forEach((gp) => {
          newPaths.push(`M ${gp.x} ${gp.bottom} L ${gp.x} ${midY}`);
        });
        const minGpX = Math.min(...grandparentPositions.map((gp) => gp.x));
        const maxGpX = Math.max(...grandparentPositions.map((gp) => gp.x));
        newPaths.push(`M ${minGpX} ${midY} L ${maxGpX} ${midY}`);
        newPaths.push(`M ${selfPos.x} ${midY} L ${selfPos.x} ${selfPos.top}`);
        newJunctions.push({ x: selfPos.x, y: midY });
      }
    }

    // 2. CONNECT PARENTS (Tier 2) TO SELF & SIBLINGS (Tier 3)
    if (parentPositions.length > 0) {
      const parentBottom = Math.max(...parentPositions.map((p) => p.bottom));
      const midY = (parentBottom + selfPos.top) / 2;

      if (parentPositions.length === 1) {
        const p = parentPositions[0];
        newPaths.push(`M ${p.x} ${p.bottom} L ${p.x} ${midY} L ${selfPos.x} ${midY} L ${selfPos.x} ${selfPos.top}`);
      } else {
        const minX = Math.min(...parentPositions.map((p) => p.x));
        const maxX = Math.max(...parentPositions.map((p) => p.x));

        // Horizontal bus connecting parents
        parentPositions.forEach((p) => {
          newPaths.push(`M ${p.x} ${p.bottom} L ${p.x} ${midY}`);
          newJunctions.push({ x: p.x, y: midY });
        });
        newPaths.push(`M ${minX} ${midY} L ${maxX} ${midY}`);

        // Stem from bus to Self
        newPaths.push(`M ${selfPos.x} ${midY} L ${selfPos.x} ${selfPos.top}`);
        newJunctions.push({ x: selfPos.x, y: midY });

        // Horizontal spouse connector between Father and Mother
        if (parentPositions.length === 2) {
          const p1 = parentPositions[0];
          const p2 = parentPositions[1];
          const leftP = p1.x < p2.x ? p1 : p2;
          const rightP = p1.x < p2.x ? p2 : p1;
          newPaths.push(`M ${leftP.right} ${leftP.y} L ${rightP.left} ${rightP.y}`);
        }
      }

      // SIBLINGS: connect to parent-descent bus
      const siblingPositions = (treeData.peers || [])
        .filter((p) => ['brother', 'sister', 'sibling'].includes(p.relationship_type?.toLowerCase()))
        .map((s) => getNodeCenter(s.relative_id))
        .filter(Boolean);

      if (siblingPositions.length > 0) {
        siblingPositions.forEach((s) => {
          newPaths.push(`M ${s.x} ${midY} L ${s.x} ${s.top}`);
          newJunctions.push({ x: s.x, y: midY });
        });
        const allPeerX = [selfPos.x, ...parentPositions.map((p) => p.x), ...siblingPositions.map((s) => s.x)];
        const minPeerX = Math.min(...allPeerX);
        const maxPeerX = Math.max(...allPeerX);
        newPaths.push(`M ${minPeerX} ${midY} L ${maxPeerX} ${midY}`);
      }
    }

    // 3. CONNECT PEERS (SPOUSE)
    const spouseNode = (treeData.peers || [])
      .find((p) => ['spouse', 'husband', 'wife', 'partner'].includes(p.relationship_type?.toLowerCase()));
    const spousePos = spouseNode ? getNodeCenter(spouseNode.relative_id) : null;

    if (spousePos) {
      const leftNode = selfPos.x < spousePos.x ? selfPos : spousePos;
      const rightNode = selfPos.x < spousePos.x ? spousePos : selfPos;
      newPaths.push(`M ${leftNode.right} ${leftNode.y} L ${rightNode.left} ${rightNode.y}`);
    }

    // 4. CONNECT SELF/SPOUSE TO CHILDREN (Tier 4)
    const childPositions = (treeData.children || [])
      .map((c) => getNodeCenter(c.relative_id))
      .filter(Boolean);

    if (childPositions.length > 0) {
      const originX = spousePos ? (selfPos.x + spousePos.x) / 2 : selfPos.x;
      const originY = spousePos ? (selfPos.bottom + spousePos.bottom) / 2 : selfPos.bottom;
      const childTop = Math.min(...childPositions.map((c) => c.top));
      const midY = (originY + childTop) / 2;

      // Descent stem
      newPaths.push(`M ${originX} ${originY} L ${originX} ${midY}`);
      newJunctions.push({ x: originX, y: midY });

      if (childPositions.length === 1) {
        const c = childPositions[0];
        newPaths.push(`M ${originX} ${midY} L ${c.x} ${midY} L ${c.x} ${c.top}`);
      } else {
        const minChildX = Math.min(...childPositions.map((c) => c.x));
        const maxChildX = Math.max(...childPositions.map((c) => c.x));
        newPaths.push(`M ${minChildX} ${midY} L ${maxChildX} ${midY}`);

        childPositions.forEach((c) => {
          newPaths.push(`M ${c.x} ${midY} L ${c.x} ${c.top}`);
          newJunctions.push({ x: c.x, y: midY });
        });
      }
    }

    setPaths(newPaths);
    setJunctions(newJunctions);
  }, [containerRef, treeData]);

  useEffect(() => {
    computeLines();
    const handleResize = () => computeLines();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => {
      computeLines();
    });
    if (containerRef?.current) {
      observer.observe(containerRef.current);
    }

    const timer1 = setTimeout(computeLines, 80);
    const timer2 = setTimeout(computeLines, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [computeLines, containerRef]);

  if (!paths || paths.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0 transition-opacity duration-300"
      style={{ overflow: 'visible' }}
    >
      {/* Bloodline Connector Lines */}
      {paths.map((d, index) => (
        <path
          key={`path-${index}`}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#1E4D45]/70 dark:text-[#57BA8E]/80"
        />
      ))}

      {/* Lineage Branch Junction Dots */}
      {junctions.map((j, idx) => (
        <circle
          key={`junc-${idx}`}
          cx={j.x}
          cy={j.y}
          r={3}
          className="fill-[#1E4D45] dark:fill-[#57BA8E]"
        />
      ))}
    </svg>
  );
}

export default FamilyTreeConnectors;
