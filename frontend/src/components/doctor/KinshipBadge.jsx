import React from 'react';

/**
 * KinshipBadge
 * Renders a standardized kinship label & short badge code (e.g. F, M, S, B, GF, GM, SP)
 * with distinct generational color palettes.
 */
export function KinshipBadge({
  relationshipType = 'relative',
  isGenetic = true,
  kinshipWeight,
  size = 'md',
}) {
  const rel = (relationshipType || '').toLowerCase();

  let code = 'REL';
  let label = relationshipType.toUpperCase();
  let colorClass = 'bg-[#E5EFEA] text-[#1E4D45] border-[#CBD6D2] dark:bg-[#1C2725] dark:text-[#57BA8E] dark:border-[#2F433E]';

  if (['father', 'dad', 'parent'].includes(rel)) {
    code = 'F';
    label = 'FATHER';
    colorClass = 'bg-[#EBF3EF] text-[#1B4D3E] border-[#C2DBD1] dark:bg-[#152B24] dark:text-[#57BA8E] dark:border-[#2F594C]';
  } else if (['mother', 'mom'].includes(rel)) {
    code = 'M';
    label = 'MOTHER';
    colorClass = 'bg-[#F2EBF9] text-[#6B21A8] border-[#D8B4FE] dark:bg-[#28153B] dark:text-[#C084FC] dark:border-[#581C87]';
  } else if (['brother'].includes(rel)) {
    code = 'B';
    label = 'BROTHER';
    colorClass = 'bg-[#EBF5FB] text-[#0369A1] border-[#BAE6FD] dark:bg-[#082F49] dark:text-[#38BDF8] dark:border-[#075985]';
  } else if (['sister'].includes(rel)) {
    code = 'S';
    label = 'SISTER';
    colorClass = 'bg-[#FDF2F8] text-[#BE185D] border-[#FBCFE8] dark:bg-[#4C0519] dark:text-[#F472B6] dark:border-[#9D174D]';
  } else if (['sibling', 'half_brother', 'half_sister', 'half_sibling'].includes(rel)) {
    code = 'SIB';
    label = 'SIBLING';
    colorClass = 'bg-[#EBF5FB] text-[#0369A1] border-[#BAE6FD] dark:bg-[#082F49] dark:text-[#38BDF8] dark:border-[#075985]';
  } else if (['grandfather', 'grandpa', 'paternal_grandfather', 'maternal_grandfather'].includes(rel)) {
    code = 'GF';
    label = 'GRANDFATHER';
    colorClass = 'bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF] dark:bg-[#2E1065] dark:text-[#C084FC] dark:border-[#581C87]';
  } else if (['grandmother', 'grandma', 'paternal_grandmother', 'maternal_grandmother'].includes(rel)) {
    code = 'GM';
    label = 'GRANDMOTHER';
    colorClass = 'bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF] dark:bg-[#2E1065] dark:text-[#C084FC] dark:border-[#581C87]';
  } else if (['son', 'daughter', 'child'].includes(rel)) {
    code = 'CH';
    label = rel.toUpperCase();
    colorClass = 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] dark:bg-[#052E16] dark:text-[#4ADE80] dark:border-[#166534]';
  } else if (['spouse', 'husband', 'wife', 'partner'].includes(rel)) {
    code = 'SP';
    label = 'SPOUSE';
    colorClass = 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3] dark:bg-[#4C0519] dark:text-[#FB7185] dark:border-[#9F1239]';
  }

  const isSmall = size === 'sm';

  return (
    <div className="inline-flex items-center space-x-1.5">
      <span
        className={`inline-flex items-center justify-center font-mono font-bold rounded-[4px] border ${
          isSmall ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs'
        } ${colorClass}`}
        title={`Kinship Code: ${code}`}
      >
        {code}
      </span>
      <span className="text-xs font-semibold text-[#13221F] dark:text-[#EFF5F3]">
        {label}
      </span>
      {kinshipWeight !== undefined && (
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F4F6F5] dark:bg-[#1C2725] text-[#7E9993] border border-[#CBD6D2] dark:border-[#2F433E]">
          {isGenetic ? `r = ${kinshipWeight}` : 'Non-genetic'}
        </span>
      )}
    </div>
  );
}

export default KinshipBadge;
