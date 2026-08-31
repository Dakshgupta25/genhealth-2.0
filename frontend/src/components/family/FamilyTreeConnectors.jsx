import React, { useEffect, useState, useCallback } from 'react';
import { getConnectorStyle } from '../../utils/relationshipGraph';

export function FamilyTreeConnectors({ containerRef, treeData, selectedNodeId = null }) {
  const [paths, setPaths] = useState([]);

  const computeLines = useCallback(() => {
    if (!containerRef?.current || !treeData) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // 100% Accurate relative coordinate calculator using BoundingClientRect
    const getNodePos = (nodeId) => {
      if (!nodeId) return null;
      const el = container.querySelector(`[data-node-id="${nodeId}"]`);
      if (!el) return null;

      const elRect = el.getBoundingClientRect();
      if (elRect.width === 0 || elRect.height === 0) return null;

      const x = (elRect.left - containerRect.left) + elRect.width / 2;
      const y = (elRect.top - containerRect.top) + elRect.height / 2;
      const radius = Math.min(elRect.width, elRect.height) / 2;

      return {
        id: nodeId,
        x,
        y,
        radius: radius > 0 ? radius : 65,
      };
    };

    const getPosForMember = (m) => {
      if (!m) return null;
      const pos = (
        getNodePos(m.relative_id) ||
        getNodePos(m.id) ||
        getNodePos(m.relationship_id)
      );
      if (!pos) return null;
      return { ...pos, member: m };
    };

    // Primary User ("ME") Position
    const selfPos = getPosForMember(treeData.self_node);
    if (!selfPos) return;

    const categorizedPaths = [];

    // Helper to calculate top/bottom/side circle border anchors and smooth paths
    const createSegment = (posA, posB, relType, customKey = '') => {
      if (!posA || !posB) return null;
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= 10) return null;

      let startX, startY, endX, endY, pathD;

      const isHorizontal = Math.abs(dy) < 35 || relType === 'spouse';

      if (isHorizontal) {
        // Horizontal connections (e.g. Spouse / Peer links across same row)
        if (dx >= 0) {
          startX = posA.x + posA.radius;
          startY = posA.y;
          endX = posB.x - posB.radius;
          endY = posB.y;
        } else {
          startX = posA.x - posA.radius;
          startY = posA.y;
          endX = posB.x + posB.radius;
          endY = posB.y;
        }
        pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
      } else {
        // Generational / Vertical connections (Grandparent -> Parent, Parent -> Child)
        if (dy > 0) {
          // posA is ABOVE posB: Exit BOTTOM of posA, Enter TOP of posB
          startX = posA.x;
          startY = posA.y + posA.radius;
          endX = posB.x;
          endY = posB.y - posB.radius;
        } else {
          // posA is BELOW posB: Exit TOP of posA, Enter BOTTOM of posB
          startX = posA.x;
          startY = posA.y - posA.radius;
          endX = posB.x;
          endY = posB.y + posB.radius;
        }

        // Straight direct connector lines
        pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
      }

      const style = getConnectorStyle(relType);
      const isConnectedToSelected =
        selectedNodeId && (posA.id === selectedNodeId || posB.id === selectedNodeId);

      const pathId = customKey || `line-${posA.id}-${posB.id}`;

      return {
        id: pathId,
        d: pathD,
        color: style.color,
        dash: style.dash,
        width: isConnectedToSelected ? style.width + 0.8 : style.width,
        isDimmed: Boolean(selectedNodeId && !isConnectedToSelected),
        label: style.label,
      };
    };

    // Find Parent Nodes (Father vs Mother)
    const parents = treeData.parents || [];
    let fatherPos = null;
    let motherPos = null;

    parents.forEach((p) => {
      const pPos = getPosForMember(p);
      if (!pPos) return;
      const rel = (p.relationship_type || '').toLowerCase();
      const gender = (p.gender || '').toLowerCase();

      if (rel === 'father' || (rel === 'parent' && gender === 'male')) {
        fatherPos = pPos;
      } else if (rel === 'mother' || (rel === 'parent' && gender === 'female')) {
        motherPos = pPos;
      } else if (!fatherPos) {
        fatherPos = pPos;
      } else if (!motherPos) {
        motherPos = pPos;
      }
    });

    // 1. Connect PARENTS -> ME
    if (fatherPos) {
      const line = createSegment(fatherPos, selfPos, 'father', `father-to-self`);
      if (line) categorizedPaths.push(line);
    }
    if (motherPos) {
      const line = createSegment(motherPos, selfPos, 'mother', `mother-to-self`);
      if (line) categorizedPaths.push(line);
    }

    // 2. Connect GRANDPARENTS -> Respective PARENT (Father's side vs Mother's side)
    const grandparents = treeData.grandparents || [];
    const grandPosList = grandparents.map((g) => ({
      member: g,
      pos: getPosForMember(g),
    })).filter((item) => item.pos !== null);

    // Determine average horizontal position of grandparents to separate paternal (left) vs maternal (right) if untagged
    const grandXCoords = grandPosList.map((g) => g.pos.x);
    const midX = grandXCoords.length > 0 ? grandXCoords.reduce((a, b) => a + b, 0) / grandXCoords.length : selfPos.x;

    const paternalGrand = [];
    const maternalGrand = [];

    grandPosList.forEach((item, idx) => {
      const rel = (item.member.relationship_type || '').toLowerCase();
      const side = (item.member.side || '').toLowerCase();

      if (rel.includes('paternal') || side === 'paternal') {
        paternalGrand.push(item);
      } else if (rel.includes('maternal') || side === 'maternal') {
        maternalGrand.push(item);
      } else {
        // Infer by screen coordinates or order (left half = Paternal/Father, right half = Maternal/Mother)
        if (fatherPos && motherPos) {
          if (item.pos.x < midX || idx < grandPosList.length / 2) {
            paternalGrand.push(item);
          } else {
            maternalGrand.push(item);
          }
        } else if (fatherPos) {
          paternalGrand.push(item);
        } else if (motherPos) {
          maternalGrand.push(item);
        } else {
          paternalGrand.push(item);
        }
      }
    });

    // Connect Paternal Grandparents -> Father (or ME if no father node)
    paternalGrand.forEach((item) => {
      const targetParentPos = fatherPos || selfPos;
      const line = createSegment(item.pos, targetParentPos, 'grandfather', `grandpaternal-${item.pos.id}`);
      if (line) categorizedPaths.push(line);
    });

    // Connect Maternal Grandparents -> Mother (or ME if no mother node)
    maternalGrand.forEach((item) => {
      const targetParentPos = motherPos || selfPos;
      const line = createSegment(item.pos, targetParentPos, 'grandmother', `grandmaternal-${item.pos.id}`);
      if (line) categorizedPaths.push(line);
    });

    // 3. Connect SPOUSES (Father ↔ Mother, Paternal Couple, Maternal Couple)
    if (fatherPos && motherPos) {
      const line = createSegment(fatherPos, motherPos, 'spouse', `spouse-parents`);
      if (line) categorizedPaths.push(line);
    }

    if (paternalGrand.length >= 2) {
      const line = createSegment(paternalGrand[0].pos, paternalGrand[1].pos, 'spouse', `spouse-paternal-grand`);
      if (line) categorizedPaths.push(line);
    }

    if (maternalGrand.length >= 2) {
      const line = createSegment(maternalGrand[0].pos, maternalGrand[1].pos, 'spouse', `spouse-maternal-grand`);
      if (line) categorizedPaths.push(line);
    }

    // 4. Connect PEERS (Siblings & Spouse)
    const peers = treeData.peers || [];
    let spousePos = null;

    // First pass to detect Spouse position
    peers.forEach((p) => {
      const rel = (p.relationship_type || '').toLowerCase();
      if (['spouse', 'husband', 'wife', 'partner'].includes(rel)) {
        spousePos = getPosForMember(p);
      }
    });

    peers.forEach((p) => {
      const pPos = getPosForMember(p);
      if (!pPos) return;

      const rel = (p.relationship_type || '').toLowerCase();

      if (['spouse', 'husband', 'wife', 'partner'].includes(rel)) {
        const line = createSegment(selfPos, pPos, 'spouse', `spouse-${selfPos.id}-${pPos.id}`);
        if (line) categorizedPaths.push(line);
        return;
      }

      const isStepOrHalf = p.is_half_sibling || Boolean(p.shared_parent_id) || rel.includes('half') || rel.includes('step') || rel.includes('stpb') || rel.includes('stps');

      if (isStepOrHalf) {
        // Step-Sibling or Half-Sibling: Connect ONLY to their designated single parent!
        let sharedParentPos = null;
        const parentId = p.shared_parent_id || p.parent_id;

        if (parentId && fatherPos && (
          parentId === fatherPos.id ||
          parentId === fatherPos.member?.relative_id ||
          parentId === fatherPos.member?.id ||
          parentId === fatherPos.member?.relationship_id
        )) {
          sharedParentPos = fatherPos;
        } else if (parentId && motherPos && (
          parentId === motherPos.id ||
          parentId === motherPos.member?.relative_id ||
          parentId === motherPos.member?.id ||
          parentId === motherPos.member?.relationship_id
        )) {
          sharedParentPos = motherPos;
        } else if (rel.includes('paternal') || (p.side || '').toLowerCase() === 'paternal' || rel.includes('father')) {
          sharedParentPos = fatherPos || selfPos;
        } else if (rel.includes('maternal') || (p.side || '').toLowerCase() === 'maternal' || rel.includes('mother')) {
          sharedParentPos = motherPos || selfPos;
        } else {
          // Default fallback for half/step siblings: connect to Father if present, else Mother
          sharedParentPos = fatherPos || motherPos || selfPos;
        }

        if (sharedParentPos && sharedParentPos !== selfPos) {
          const lineParent = createSegment(sharedParentPos, pPos, 'step-child', `step-sib-parent-${sharedParentPos.id}-${pPos.id}`);
          if (lineParent) categorizedPaths.push(lineParent);
        }

        // Peer connection to ME
        const lineMe = createSegment(selfPos, pPos, 'step-sibling', `step-sib-me-${selfPos.id}-${pPos.id}`);
        if (lineMe) categorizedPaths.push(lineMe);
      } else {
        // Full Sibling: Connect to BOTH Father & Mother (if present) via Parent links, and to ME via Sibling link
        if (fatherPos) {
          const lineF = createSegment(fatherPos, pPos, 'parent', `sib-father-${fatherPos.id}-${pPos.id}`);
          if (lineF) categorizedPaths.push(lineF);
        }
        if (motherPos) {
          const lineM = createSegment(motherPos, pPos, 'parent', `sib-mother-${motherPos.id}-${pPos.id}`);
          if (lineM) categorizedPaths.push(lineM);
        }
        const line = createSegment(selfPos, pPos, 'sibling', `peer-${selfPos.id}-${pPos.id}`);
        if (line) categorizedPaths.push(line);
      }
    });

    // 5. Connect DESCENDANTS (Children) -> EACH Parent (ME + Spouse/Co-parent)
    const children = treeData.children || [];
    children.forEach((c) => {
      const cPos = getPosForMember(c);
      if (!cPos) return;

      // Primary Parent (ME) -> Child
      const lineSelf = createSegment(selfPos, cPos, 'child', `child-self-${selfPos.id}-${cPos.id}`);
      if (lineSelf) categorizedPaths.push(lineSelf);

      // Co-Parent (Spouse) -> Child (if spouse node exists)
      if (spousePos) {
        const lineSpouse = createSegment(spousePos, cPos, 'child', `child-spouse-${spousePos.id}-${cPos.id}`);
        if (lineSpouse) categorizedPaths.push(lineSpouse);
      }
    });

    // 6. Connect EXTENDED KIN -> Respective Parent or ME
    const extended = treeData.extended || [];
    extended.forEach((ext) => {
      const extPos = getPosForMember(ext);
      if (!extPos) return;

      const rel = (ext.relationship_type || '').toLowerCase();
      const targetPos = (rel.includes('uncle') || rel.includes('aunt')) && fatherPos ? fatherPos : selfPos;
      const line = createSegment(targetPos, extPos, 'relative', `ext-${targetPos.id}-${extPos.id}`);
      if (line) categorizedPaths.push(line);
    });

    setPaths(categorizedPaths);
  }, [containerRef, treeData, selectedNodeId]);

  useEffect(() => {
    computeLines();
    const t1 = setTimeout(computeLines, 50);
    const t2 = setTimeout(computeLines, 200);

    window.addEventListener('resize', computeLines);

    let observer;
    if (containerRef?.current) {
      observer = new ResizeObserver(computeLines);
      observer.observe(containerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', computeLines);
      if (observer) observer.disconnect();
    };
  }, [computeLines, containerRef]);

  if (!paths || paths.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
      style={{ minWidth: '100%', minHeight: '100%' }}
    >
      {paths.map((p) => (
        <path
          key={p.id}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={p.width}
          strokeDasharray={p.dash || undefined}
          strokeLinecap="round"
          className={`transition-all duration-300 ${
            p.isDimmed ? 'opacity-25 stroke-dasharray-[4,4]' : 'opacity-100'
          }`}
        />
      ))}
    </svg>
  );
}

export default FamilyTreeConnectors;
