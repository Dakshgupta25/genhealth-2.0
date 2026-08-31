/**
 * GenHealth 2.0 — Centralized Relationship Domain Engine & Graph Normalizer
 *
 * Provides bidirectional relationship inverses, generation offset resolution,
 * genetic vs non-genetic classification, graph inference, and layout positioning
 * for both Visual Radial Graph and Generational Hierarchy views.
 */

// ---------------------------------------------------------------------------
// 1. Canonical Relationship Definitions & Inverses
// ---------------------------------------------------------------------------

export const RELATIONSHIP_TYPES = {
  // Grandparents
  GRANDFATHER: 'grandfather',
  GRANDMOTHER: 'grandmother',
  GRANDPARENT: 'grandparent',
  PATERNAL_GRANDFATHER: 'paternal_grandfather',
  PATERNAL_GRANDMOTHER: 'paternal_grandmother',
  MATERNAL_GRANDFATHER: 'maternal_grandfather',
  MATERNAL_GRANDMOTHER: 'maternal_grandmother',
  STEP_GRANDFATHER: 'step_grandfather',
  STEP_GRANDMOTHER: 'step_grandmother',

  // Parents
  FATHER: 'father',
  MOTHER: 'mother',
  PARENT: 'parent',
  STEPFATHER: 'stepfather',
  STEPMOTHER: 'stepmother',
  STEPPARENT: 'stepparent',

  // Peers
  SPOUSE: 'spouse',
  HUSBAND: 'husband',
  WIFE: 'wife',
  PARTNER: 'partner',
  BROTHER: 'brother',
  SISTER: 'sister',
  SIBLING: 'sibling',
  STEPBROTHER: 'stepbrother',
  STEPSISTER: 'stepsister',
  STEPSIBLING: 'stepsibling',

  // Descendants
  SON: 'son',
  DAUGHTER: 'daughter',
  CHILD: 'child',
  STEPSON: 'stepson',
  STEPDAUGHTER: 'stepdaughter',
  STEPCHILD: 'stepchild',
  GRANDSON: 'grandson',
  GRANDDAUGHTER: 'granddaughter',
  GRANDCHILD: 'grandchild',

  // Extended Kin
  UNCLE: 'uncle',
  AUNT: 'aunt',
  NEPHEW: 'nephew',
  NIECE: 'niece',
  COUSIN: 'cousin',
  RELATIVE: 'relative',
};

/**
 * Maps a relationship type to its semantic inverse, taking target gender into account if provided.
 */
export function getInverseRelationship(relType, relativeGender = 'unspecified') {
  const r = (relType || '').trim().toLowerCase();
  const g = (relativeGender || 'unspecified').trim().toLowerCase();

  switch (r) {
    case 'father':
    case 'mother':
    case 'parent':
      if (g === 'male') return 'son';
      if (g === 'female') return 'daughter';
      return 'child';

    case 'stepfather':
    case 'stepmother':
    case 'stepparent':
    case 'step_father':
    case 'step_mother':
    case 'step_parent':
      if (g === 'male') return 'stepson';
      if (g === 'female') return 'stepdaughter';
      return 'stepchild';

    case 'son':
    case 'daughter':
    case 'child':
      if (g === 'male') return 'father';
      if (g === 'female') return 'mother';
      return 'parent';

    case 'stepson':
    case 'stepdaughter':
    case 'stepchild':
    case 'step_son':
    case 'step_daughter':
    case 'step_child':
      if (g === 'male') return 'stepfather';
      if (g === 'female') return 'stepmother';
      return 'stepparent';

    case 'spouse':
    case 'husband':
    case 'wife':
    case 'partner':
      if (g === 'male') return 'husband';
      if (g === 'female') return 'wife';
      return 'spouse';

    case 'brother':
    case 'sister':
    case 'sibling':
      if (g === 'male') return 'brother';
      if (g === 'female') return 'sister';
      return 'sibling';

    case 'stepbrother':
    case 'stepsister':
    case 'stepsibling':
    case 'step_brother':
    case 'step_sister':
    case 'step_sibling':
      if (g === 'male') return 'stepbrother';
      if (g === 'female') return 'stepsister';
      return 'stepsibling';

    case 'grandfather':
    case 'grandmother':
    case 'grandparent':
    case 'paternal_grandfather':
    case 'paternal_grandmother':
    case 'maternal_grandfather':
    case 'maternal_grandmother':
    case 'step_grandfather':
    case 'step_grandmother':
      if (g === 'male') return 'grandson';
      if (g === 'female') return 'granddaughter';
      return 'grandchild';

    case 'grandson':
    case 'granddaughter':
    case 'grandchild':
      if (g === 'male') return 'grandfather';
      if (g === 'female') return 'grandmother';
      return 'grandparent';

    case 'uncle':
    case 'aunt':
      if (g === 'male') return 'nephew';
      if (g === 'female') return 'niece';
      return 'nephew';

    case 'nephew':
    case 'niece':
      if (g === 'male') return 'uncle';
      if (g === 'female') return 'aunt';
      return 'uncle';

    case 'cousin':
      return 'cousin';

    default:
      return 'relative';
  }
}

/**
 * Returns true if the relationship is genetic (shares biological lineage).
 */
export function isGeneticRelationship(relType) {
  const r = (relType || '').trim().toLowerCase();
  const nonGenetic = [
    'spouse', 'husband', 'wife', 'partner',
    'stepfather', 'stepmother', 'stepparent', 'step_father', 'step_mother', 'step_parent',
    'stepson', 'stepdaughter', 'stepchild', 'step_son', 'step_daughter', 'step_child',
    'stepbrother', 'stepsister', 'stepsibling', 'step_brother', 'step_sister', 'step_sibling'
  ];
  return !nonGenetic.includes(r);
}

/**
 * Maps relationship type to a generational integer offset relative to SELF (Gen 0).
 */
export function getGenerationOffset(relType) {
  const r = (relType || '').trim().toLowerCase();
  if (
    ['grandfather', 'grandmother', 'grandparent', 'paternal_grandfather', 'paternal_grandmother', 'paternal_grandparent', 'maternal_grandfather', 'maternal_grandmother', 'maternal_grandparent', 'step_grandfather', 'step_grandmother', 'step_grandparent'].includes(r) ||
    r.includes('grandfather') || r.includes('grandmother') || r.includes('grandparent')
  ) {
    return 2;
  }
  if (['father', 'mother', 'parent', 'dad', 'mom', 'stepfather', 'stepmother', 'stepparent', 'step_father', 'step_mother', 'step_parent', 'uncle', 'aunt'].includes(r)) {
    return 1;
  }
  if (['self', 'spouse', 'husband', 'wife', 'partner', 'brother', 'sister', 'sibling', 'stepbrother', 'stepsister', 'stepsibling', 'step_brother', 'step_sister', 'step_sibling', 'half_brother', 'half_sister', 'half_sibling', 'cousin'].includes(r)) {
    return 0;
  }
  if (['son', 'daughter', 'child', 'stepson', 'stepdaughter', 'stepchild', 'step_son', 'step_daughter', 'step_child', 'nephew', 'niece'].includes(r)) {
    return -1;
  }
  if (['grandson', 'granddaughter', 'grandchild'].includes(r)) {
    return -2;
  }
  return 0;
}

/**
 * Human-readable generation title for hierarchical view.
 */
export function getGenerationLabel(genOffset) {
  switch (genOffset) {
    case 2:
      return 'GRANDPARENT GENERATION (+2)';
    case 1:
      return 'PARENT & ASCENDANT GENERATION (+1)';
    case 0:
      return 'YOUR GENERATION (SELF & PEERS)';
    case -1:
      return 'CHILDREN GENERATION (-1)';
    case -2:
      return 'GRANDCHILDREN GENERATION (-2)';
    default:
      return genOffset > 0 ? `ANCESTOR GENERATION (+${genOffset})` : `DESCENDANT GENERATION (${genOffset})`;
  }
}

/**
 * Returns visual connector metadata (color, dash array, width, label) for a relationship type.
 */
export function getConnectorStyle(relType) {
  const r = (relType || '').trim().toLowerCase();

  if (['father', 'mother', 'parent'].includes(r)) {
    return { class: 'parent-child', color: '#15803D', dash: '', width: 2, label: 'Parent Link' };
  }
  if (['stepfather', 'stepmother', 'stepparent', 'step_father', 'step_mother', 'step_parent'].includes(r)) {
    return { class: 'step-parent', color: '#059669', dash: '4,4', width: 2, label: 'Step-Parent Link' };
  }
  if (['grandfather', 'grandmother', 'grandparent', 'paternal_grandfather', 'paternal_grandmother', 'maternal_grandfather', 'maternal_grandmother'].includes(r) || r.includes('grandfather') || r.includes('grandmother')) {
    return { class: 'grandparent', color: '#7E22CE', dash: '', width: 2, label: 'Grandparent Link' };
  }
  if (['brother', 'sister', 'sibling'].includes(r)) {
    return { class: 'sibling', color: '#0284C7', dash: '5,3', width: 1.8, label: 'Sibling Link' };
  }
  if (['stepbrother', 'stepsister', 'stepsibling', 'step_brother', 'step_sister', 'step_sibling'].includes(r)) {
    return { class: 'step-sibling', color: '#0EA5E9', dash: '3,3', width: 1.8, label: 'Step-Sibling Link' };
  }
  if (['spouse', 'husband', 'wife', 'partner'].includes(r)) {
    return { class: 'spouse', color: '#B4232F', dash: '6,3', width: 2, label: 'Spouse Link' };
  }
  if (['son', 'daughter', 'child'].includes(r)) {
    return { class: 'child', color: '#16A34A', dash: '', width: 2, label: 'Child Link' };
  }
  if (['stepson', 'stepdaughter', 'stepchild', 'step_son', 'step_daughter', 'step_child'].includes(r)) {
    return { class: 'step-child', color: '#10B981', dash: '4,4', width: 2, label: 'Step-Child Link' };
  }
  return { class: 'extended', color: '#D97706', dash: '4,4', width: 1.8, label: 'Extended Kin' };
}

// ---------------------------------------------------------------------------
// 2. Graph Normalization & Inference Engine
// ---------------------------------------------------------------------------

/**
 * Normalizes treeData into a standardized node and edge graph.
 */
export function buildNormalizedFamilyGraph(treeData) {
  if (!treeData || !treeData.self_node) {
    return { nodes: [], edges: [], selfNodeId: null, generations: {} };
  }

  const selfNode = treeData.self_node;
  const selfId = selfNode.relative_id || selfNode.id || selfNode.relationship_id;

  const nodeMap = new Map();
  const edges = [];

  // Register self node
  nodeMap.set(selfId, {
    ...selfNode,
    id: selfId,
    relationship_type: 'self',
    genOffset: 0,
    isSelf: true,
  });

  const rawRelatives = [
    ...(treeData.grandparents || []),
    ...(treeData.parents || []),
    ...(treeData.peers || []),
    ...(treeData.children || []),
    ...(treeData.extended || []),
  ];

  rawRelatives.forEach((m) => {
    const memberId = m.relative_id || m.id || m.relationship_id;
    if (!memberId) return;

    const genOffset = getGenerationOffset(m.relationship_type);
    const isGenetic = isGeneticRelationship(m.relationship_type);

    if (!nodeMap.has(memberId)) {
      nodeMap.set(memberId, {
        ...m,
        id: memberId,
        genOffset,
        isGenetic,
        isSelf: false,
      });
    }

    // Direct edge from Self -> Member
    edges.push({
      id: `edge-${selfId}-${memberId}`,
      source: selfId,
      target: memberId,
      relationship_type: m.relationship_type,
      isGenetic,
      style: getConnectorStyle(m.relationship_type),
    });
  });

  // Infer inter-relative edges (e.g. Spouse link between two parents)
  const parents = (treeData.parents || []).map((p) => p.relative_id || p.id);
  if (parents.length >= 2) {
    edges.push({
      id: `edge-spouse-${parents[0]}-${parents[1]}`,
      source: parents[0],
      target: parents[1],
      relationship_type: 'spouse',
      isGenetic: false,
      style: getConnectorStyle('spouse'),
    });
  }

  const nodes = Array.from(nodeMap.values());

  // Group nodes by generation offset
  const generations = {};
  nodes.forEach((n) => {
    const gen = n.genOffset;
    if (!generations[gen]) generations[gen] = [];
    generations[gen].push(n);
  });

  return {
    nodes,
    edges,
    selfNodeId: selfId,
    generations,
  };
}

// ---------------------------------------------------------------------------
// 3. Compact Context Summarizer ("Who is this person?")
// ---------------------------------------------------------------------------

export function getPersonVisualSummary(targetNode, treeData) {
  if (!targetNode) return null;
  if (targetNode.isSelf || targetNode.relationship_type === 'self') {
    return {
      category: 'PRIMARY ANCHOR',
      roleDescription: 'Your primary patient health account (ME).',
      generationLabel: 'YOUR GENERATION (0)',
      isGenetic: true,
      directConnectionsCount: (treeData?.all_members?.length || 0),
    };
  }

  const relType = targetNode.relationship_type || 'relative';
  const genOffset = getGenerationOffset(relType);
  const genLabel = getGenerationLabel(genOffset);
  const isGenetic = isGeneticRelationship(relType);

  let category = 'EXTENDED KIN';
  if (['father', 'mother', 'parent', 'grandfather', 'grandmother', 'grandparent'].includes(relType)) {
    category = 'ANCESTOR';
  } else if (['son', 'daughter', 'child', 'grandson', 'granddaughter', 'grandchild'].includes(relType)) {
    category = 'DESCENDANT';
  } else if (['spouse', 'husband', 'wife', 'partner'].includes(relType)) {
    category = 'SPOUSE / PARTNER';
  } else if (['brother', 'sister', 'sibling'].includes(relType)) {
    category = 'SIBLING';
  }

  return {
    category,
    roleDescription: `${targetNode.full_name} is your ${relType.toUpperCase()}.`,
    generationLabel: genLabel,
    isGenetic,
    genOffset,
  };
}

// ---------------------------------------------------------------------------
// 4. Visual Layout Generators
// ---------------------------------------------------------------------------

/**
 * Calculates coordinates for VISUAL RADIAL / GRAPH VIEW centered on ME.
 */
export function calculateRadialPositions(treeData, containerWidth = 900, containerHeight = 600) {
  const { nodes, selfNodeId } = buildNormalizedFamilyGraph(treeData);
  if (!nodes || nodes.length === 0) return new Map();

  const posMap = new Map();
  const cx = containerWidth / 2;
  const cy = containerHeight / 2;

  // Center node (ME)
  posMap.set(selfNodeId, { x: cx, y: cy });

  const otherNodes = nodes.filter((n) => n.id !== selfNodeId);
  if (otherNodes.length === 0) return posMap;

  // Group by generational offset for arc positioning
  const ancestors = otherNodes.filter((n) => n.genOffset > 0);
  const peers = otherNodes.filter((n) => n.genOffset === 0);
  const descendants = otherNodes.filter((n) => n.genOffset < 0);

  // Position Ancestors in upper arc (-150° to -30°)
  if (ancestors.length > 0) {
    const radiusY = Math.min(containerHeight * 0.35, 180);
    const radiusX = Math.min(containerWidth * 0.4, 320);
    ancestors.forEach((node, idx) => {
      const step = ancestors.length > 1 ? idx / (ancestors.length - 1) : 0.5;
      const angle = -Math.PI * 0.85 + step * (Math.PI * 0.7);
      const x = cx + radiusX * Math.cos(angle);
      const y = cy + radiusY * Math.sin(angle);
      posMap.set(node.id, { x, y });
    });
  }

  // Position Peers on lateral wings (left/right of ME)
  if (peers.length > 0) {
    const spouseNode = peers.find((n) => ['spouse', 'husband', 'wife', 'partner'].includes(n.relationship_type));
    const siblings = peers.filter((n) => n.id !== spouseNode?.id);

    if (spouseNode) {
      posMap.set(spouseNode.id, { x: cx + 170, y: cy });
    }

    siblings.forEach((node, idx) => {
      const isLeft = idx % 2 === 0;
      const rank = Math.floor(idx / 2) + 1;
      const x = isLeft ? cx - (160 * rank) : cx + (spouseNode ? 170 + 160 * rank : 160 * rank);
      posMap.set(node.id, { x, y: cy });
    });
  }

  // Position Descendants in lower arc (+30° to +150°)
  if (descendants.length > 0) {
    const radiusY = Math.min(containerHeight * 0.35, 180);
    const radiusX = Math.min(containerWidth * 0.4, 320);
    descendants.forEach((node, idx) => {
      const step = descendants.length > 1 ? idx / (descendants.length - 1) : 0.5;
      const angle = Math.PI * 0.15 + step * (Math.PI * 0.7);
      const x = cx + radiusX * Math.cos(angle);
      const y = cy + radiusY * Math.sin(angle);
      posMap.set(node.id, { x, y });
    });
  }

  return posMap;
}

/**
 * Calculates coordinates for GENERATIONAL HIERARCHY VIEW (strictly horizontal rows).
 */
export function calculateHierarchicalPositions(treeData, containerWidth = 900) {
  const { generations } = buildNormalizedFamilyGraph(treeData);
  const posMap = new Map();

  const sortedOffsets = Object.keys(generations)
    .map(Number)
    .sort((a, b) => b - a); // Highest generation (+2) at top, lowest (-2) at bottom

  const rowHeight = 160;
  const startY = 80;

  sortedOffsets.forEach((genOffset, rowIdx) => {
    const rowNodes = generations[genOffset] || [];
    const y = startY + rowIdx * rowHeight;
    const count = rowNodes.length;

    const spacing = Math.min(220, containerWidth / (count + 1));
    const startX = (containerWidth - (count - 1) * spacing) / 2;

    rowNodes.forEach((node, nodeIdx) => {
      const x = startX + nodeIdx * spacing;
      posMap.set(node.id, { x, y });
    });
  });

  return posMap;
}
