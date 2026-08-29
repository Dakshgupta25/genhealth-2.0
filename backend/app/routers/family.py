import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path as FPath, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.family_relationship import FamilyRelationship
from app.models.report import Report
from app.models.report_result import ReportResult
from app.models.user import User

router = APIRouter(prefix="/api/v1/family", tags=["Family Tree"])


# ---------------------------------------------------------------------------
# Helper Functions: Reciprocal Roles, Tiers, Badge Codes & Health Status
# ---------------------------------------------------------------------------

def get_reciprocal_relationship(rel_type: str, user_gender: Optional[str] = "unspecified") -> str:
    """
    Infers the reciprocal genealogical relationship type based on the primary user's biological/stated gender.
    """
    r = (rel_type or "").strip().lower()
    gender = (user_gender or "unspecified").strip().lower()

    if r in ("father", "mother", "parent", "dad", "mom"):
        if gender == "male":
            return "son"
        elif gender == "female":
            return "daughter"
        return "child"

    elif r in ("son", "daughter", "child"):
        if gender == "male":
            return "father"
        elif gender == "female":
            return "mother"
        return "parent"

    elif r in ("brother", "sister", "sibling"):
        if gender == "male":
            return "brother"
        elif gender == "female":
            return "sister"
        return "sibling"

    elif r in ("spouse", "husband", "wife", "partner"):
        if gender == "male":
            return "husband"
        elif gender == "female":
            return "wife"
        return "spouse"

    elif r in ("grandfather", "grandmother", "grandparent"):
        if gender == "male":
            return "grandson"
        elif gender == "female":
            return "granddaughter"
        return "grandchild"

    elif r in ("grandson", "granddaughter", "grandchild"):
        if gender == "male":
            return "grandfather"
        elif gender == "female":
            return "grandmother"
        return "grandparent"

    elif r in ("uncle", "aunt"):
        if gender == "male":
            return "nephew"
        elif gender == "female":
            return "niece"
        return "nephew_niece"

    elif r in ("nephew", "niece", "nephew_niece"):
        if gender == "male":
            return "uncle"
        elif gender == "female":
            return "aunt"
        return "uncle_aunt"

    elif r == "cousin":
        return "cousin"

    return "relative"


def get_generational_tier(rel_type: str) -> str:
    """
    Maps a genealogical relationship type into one of 4 generational tiers:
    - grandparents
    - parents
    - peers (self, spouse, siblings)
    - children (descendants)
    - extended (uncles, aunts, cousins)
    """
    r = (rel_type or "").strip().lower()
    if r in ("grandfather", "grandmother", "grandparent"):
        return "grandparents"
    if r in ("father", "mother", "parent", "dad", "mom"):
        return "parents"
    if r in ("self", "spouse", "husband", "wife", "partner", "brother", "sister", "sibling"):
        return "peers"
    if r in ("son", "daughter", "child", "grandson", "granddaughter", "grandchild"):
        return "children"
    if r in ("uncle", "aunt", "nephew", "niece", "nephew_niece", "cousin", "relative"):
        return "extended"
    return "extended"


def get_relation_badge_code(rel_type: str) -> str:
    """Returns a short 1-4 letter badge code for visual UI rendering."""
    r = (rel_type or "").strip().lower()
    mapping = {
        "self": "SELF",
        "father": "F",
        "mother": "M",
        "parent": "P",
        "brother": "B",
        "sister": "S",
        "sibling": "SIB",
        "spouse": "SP",
        "husband": "H",
        "wife": "W",
        "son": "SON",
        "daughter": "DAU",
        "child": "CH",
        "grandfather": "GF",
        "grandmother": "GM",
        "grandparent": "GP",
        "grandson": "GS",
        "granddaughter": "GD",
        "grandchild": "GC",
        "uncle": "UNC",
        "aunt": "AUNT",
        "nephew": "NEPH",
        "niece": "NIECE",
        "cousin": "COUS",
    }
    return mapping.get(r, "REL")


def compute_health_status(user_id: uuid.UUID, db: Session) -> dict:
    """
    Calculates traffic-light health status based on the profile's most recent lab report results:
    - green (normal): all latest test results in normal range
    - yellow (warning): at least one low/warning flag and no critical
    - red (critical): at least one high/critical flag
    - neutral / gray: no reports or no parsed results yet
    """
    stmt = (
        select(Report)
        .where(Report.user_id == user_id)
        .order_by(Report.created_at.desc())
    )
    reports = db.execute(stmt).scalars().all()
    if not reports:
        return {
            "status": "neutral",
            "color": "#7E9993",
            "label": "No Lab Data",
            "total_tests": 0,
            "abnormal_count": 0,
            "critical_count": 0,
            "latest_report_date": None,
        }

    latest_report = None
    results: list[ReportResult] = []
    for rep in reports:
        res_stmt = select(ReportResult).where(ReportResult.report_id == rep.id)
        res_rows = db.execute(res_stmt).scalars().all()
        if res_rows:
            latest_report = rep
            results = res_rows
            break

    if not results or not latest_report:
        return {
            "status": "neutral",
            "color": "#7E9993",
            "label": "No Lab Data",
            "total_tests": 0,
            "abnormal_count": 0,
            "critical_count": 0,
            "latest_report_date": None,
        }

    critical_count = sum(1 for r in results if (r.abnormality_flag or "").lower() in ("high", "critical"))
    warning_count = sum(1 for r in results if (r.abnormality_flag or "").lower() in ("low", "warning"))
    normal_count = sum(1 for r in results if (r.abnormality_flag or "").lower() == "normal")

    if critical_count > 0:
        return {
            "status": "critical",
            "color": "#942728",
            "label": "Critical",
            "total_tests": len(results),
            "abnormal_count": critical_count + warning_count,
            "critical_count": critical_count,
            "latest_report_date": latest_report.created_at.isoformat(),
        }
    elif warning_count > 0:
        return {
            "status": "warning",
            "color": "#8F5708",
            "label": "Warning",
            "total_tests": len(results),
            "abnormal_count": warning_count,
            "critical_count": 0,
            "latest_report_date": latest_report.created_at.isoformat(),
        }
    else:
        return {
            "status": "normal",
            "color": "#18573D",
            "label": "Optimal",
            "total_tests": len(results),
            "abnormal_count": 0,
            "critical_count": 0,
            "latest_report_date": latest_report.created_at.isoformat(),
        }


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class FamilyLinkRequest(BaseModel):
    user_id: uuid.UUID
    relative_user_id: uuid.UUID
    relationship_type: str
    share_clinical_data: bool = True
    is_half_sibling: bool = False
    shared_parent_id: Optional[uuid.UUID] = None


class PlaceholderCreateRequest(BaseModel):
    manager_user_id: uuid.UUID
    full_name: str
    relationship_type: str
    gender: Optional[str] = "unspecified"
    date_of_birth: Optional[str] = None
    avatar_url: Optional[str] = None
    is_half_sibling: bool = False
    shared_parent_id: Optional[uuid.UUID] = None


class MemberUpdateRequest(BaseModel):
    manager_user_id: uuid.UUID
    full_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    avatar_url: Optional[str] = None


class ConsentUpdateRequest(BaseModel):
    user_id: uuid.UUID
    share_clinical_data: bool


class ConfirmSpouseRequest(BaseModel):
    user1_id: uuid.UUID
    user2_id: uuid.UUID
    confirm: bool


class SuggestedLinkResponse(BaseModel):
    user1_id: uuid.UUID
    user1_name: str
    user2_id: uuid.UUID
    user2_name: str
    suggested_relationship: str
    reason: str


class HealthStatusInfo(BaseModel):
    status: str  # 'normal', 'warning', 'critical', 'neutral'
    color: str
    label: str
    total_tests: int
    abnormal_count: int
    critical_count: int
    latest_report_date: Optional[str] = None


class FamilyMemberResponse(BaseModel):
    relationship_id: uuid.UUID
    relative_id: uuid.UUID
    full_name: str
    email: str
    relationship_type: str
    role: str
    is_placeholder: bool = False
    managed_by_user_id: Optional[uuid.UUID] = None
    avatar_url: Optional[str] = None
    gender: Optional[str] = None
    tier: str = "peers"
    badge_code: str = "REL"
    can_edit: bool = False
    share_clinical_data: bool = True
    health_status: HealthStatusInfo
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FamilyTreeHierarchyResponse(BaseModel):
    self_node: FamilyMemberResponse
    grandparents: List[FamilyMemberResponse]
    parents: List[FamilyMemberResponse]
    peers: List[FamilyMemberResponse]
    children: List[FamilyMemberResponse]
    extended: List[FamilyMemberResponse]
    all_members: List[FamilyMemberResponse]
    suggested_links: List[SuggestedLinkResponse] = []


# ---------------------------------------------------------------------------
# Graph Propagation Engine
# ---------------------------------------------------------------------------

def create_bidirectional_link(
    user1_id: uuid.UUID,
    user2_id: uuid.UUID,
    rel_type_forward: str,
    db: Session,
    share_clinical_data: bool = True,
) -> Optional[FamilyRelationship]:
    if user1_id == user2_id:
        return None

    # Check if forward link already exists (explicit precedence)
    existing = db.execute(
        select(FamilyRelationship).where(
            FamilyRelationship.user_id == user1_id,
            FamilyRelationship.relative_user_id == user2_id,
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    user1 = db.get(User, user1_id)
    user2 = db.get(User, user2_id)
    if not user1 or not user2:
        return None

    link_group_id = uuid.uuid4()
    rel_type_reciprocal = get_reciprocal_relationship(rel_type_forward, user1.gender)

    forward_rel = FamilyRelationship(
        user_id=user1_id,
        relative_user_id=user2_id,
        relationship_type=rel_type_forward.strip().lower(),
        link_group_id=link_group_id,
        share_clinical_data=share_clinical_data,
    )
    db.add(forward_rel)

    # Reciprocal check
    recip = db.execute(
        select(FamilyRelationship).where(
            FamilyRelationship.user_id == user2_id,
            FamilyRelationship.relative_user_id == user1_id,
        )
    ).scalar_one_or_none()
    if not recip:
        reciprocal_rel = FamilyRelationship(
            user_id=user2_id,
            relative_user_id=user1_id,
            relationship_type=rel_type_reciprocal.strip().lower(),
            link_group_id=link_group_id,
            share_clinical_data=share_clinical_data,
        )
        db.add(reciprocal_rel)

    return forward_rel


def propagate_relationship_graph(
    primary_user_id: uuid.UUID,
    newly_linked_user_id: uuid.UUID,
    rel_type: str,
    db: Session,
    is_half_sibling: bool = False,
    shared_parent_id: Optional[uuid.UUID] = None,
    share_clinical_data: bool = True,
) -> None:
    """
    Performs transitive graph propagation for direct-line and lateral relationships.
    - Full-siblings propagate to both parents and other full-siblings.
    - Half-siblings only propagate to the single designated shared parent.
    - Uncles/Aunts (Parent's Sibling) propagate to/from Nephew/Niece (Self) without generating parent/spouse edges.
    - Parents propagate to their other children (Self's siblings) and to Grandparents.
    """
    r = (rel_type or "").strip().lower()
    primary_user = db.get(User, primary_user_id)
    new_user = db.get(User, newly_linked_user_id)
    if not primary_user or not new_user:
        return

    # Fetch existing relatives of primary_user
    existing_rels = db.execute(
        select(FamilyRelationship).where(FamilyRelationship.user_id == primary_user_id)
    ).scalars().all()

    # 1. NEW NODE IS A SIBLING (Brother, Sister, Sibling)
    if r in ("brother", "sister", "sibling"):
        # Find parents of primary_user -> link them to this sibling
        parents = [
            rel for rel in existing_rels
            if rel.relationship_type in ("father", "mother", "parent", "dad", "mom")
            and rel.relative_user_id != newly_linked_user_id
        ]
        for p in parents:
            if is_half_sibling:
                if shared_parent_id and p.relative_user_id == shared_parent_id:
                    child_role = "son" if new_user.gender == "male" else "daughter" if new_user.gender == "female" else "child"
                    create_bidirectional_link(p.relative_user_id, newly_linked_user_id, child_role, db, share_clinical_data)
            else:
                child_role = "son" if new_user.gender == "male" else "daughter" if new_user.gender == "female" else "child"
                create_bidirectional_link(p.relative_user_id, newly_linked_user_id, child_role, db, share_clinical_data)

        # Propagate to other siblings of primary_user (if full sibling)
        if not is_half_sibling:
            other_siblings = [
                rel for rel in existing_rels
                if rel.relationship_type in ("brother", "sister", "sibling")
                and rel.relative_user_id != newly_linked_user_id
            ]
            for s in other_siblings:
                sib_role = "brother" if new_user.gender == "male" else "sister" if new_user.gender == "female" else "sibling"
                create_bidirectional_link(s.relative_user_id, newly_linked_user_id, sib_role, db, share_clinical_data)

        # Lateral: If primary_user has children, those children see new_user as uncle/aunt
        children = [
            rel for rel in existing_rels
            if rel.relationship_type in ("son", "daughter", "child")
            and rel.relative_user_id != newly_linked_user_id
        ]
        for c in children:
            uncle_role = "uncle" if new_user.gender == "male" else "aunt" if new_user.gender == "female" else "uncle"
            create_bidirectional_link(c.relative_user_id, newly_linked_user_id, uncle_role, db, share_clinical_data)

    # 2. NEW NODE IS A PARENT (Father, Mother, Parent)
    elif r in ("father", "mother", "parent", "dad", "mom"):
        # A. Propagate this parent to all siblings of primary_user
        siblings = [
            rel for rel in existing_rels
            if rel.relationship_type in ("brother", "sister", "sibling")
            and rel.relative_user_id != newly_linked_user_id
        ]
        for s in siblings:
            parent_role = "father" if new_user.gender == "male" else "mother" if new_user.gender == "female" else "parent"
            create_bidirectional_link(s.relative_user_id, newly_linked_user_id, parent_role, db, share_clinical_data)

        # B. Check if primary_user has children -> they see new_user as Grandparent! (Mother's mother = Child's grandmother)
        children = [
            rel for rel in existing_rels
            if rel.relationship_type in ("son", "daughter", "child")
            and rel.relative_user_id != newly_linked_user_id
        ]
        for c in children:
            gp_role = "grandfather" if new_user.gender == "male" else "grandmother" if new_user.gender == "female" else "grandparent"
            create_bidirectional_link(c.relative_user_id, newly_linked_user_id, gp_role, db, share_clinical_data)

        # C. Check if the new parent already has parents linked (primary_user's grandparents)
        new_parent_parents = db.execute(
            select(FamilyRelationship).where(
                FamilyRelationship.user_id == newly_linked_user_id,
                FamilyRelationship.relationship_type.in_(["father", "mother", "parent", "dad", "mom"]),
            )
        ).scalars().all()
        for gp in new_parent_parents:
            gp_user = db.get(User, gp.relative_user_id)
            gp_role = "grandfather" if (gp_user and gp_user.gender == "male") else "grandmother" if (gp_user and gp_user.gender == "female") else "grandparent"
            create_bidirectional_link(primary_user_id, gp.relative_user_id, gp_role, db, share_clinical_data)
            # Also propagate grandparent down to primary_user's siblings
            for s in siblings:
                create_bidirectional_link(s.relative_user_id, gp.relative_user_id, gp_role, db, share_clinical_data)

    # 3. NEW NODE IS LATERAL: UNCLE / AUNT
    elif r in ("uncle", "aunt"):
        parents = [
            rel for rel in existing_rels
            if rel.relationship_type in ("father", "mother", "parent", "dad", "mom")
            and rel.relative_user_id != newly_linked_user_id
        ]
        for p in parents:
            if shared_parent_id:
                if p.relative_user_id == shared_parent_id:
                    sib_role = "brother" if new_user.gender == "male" else "sister" if new_user.gender == "female" else "sibling"
                    create_bidirectional_link(p.relative_user_id, newly_linked_user_id, sib_role, db, share_clinical_data)
            else:
                sib_role = "brother" if new_user.gender == "male" else "sister" if new_user.gender == "female" else "sibling"
                create_bidirectional_link(p.relative_user_id, newly_linked_user_id, sib_role, db, share_clinical_data)
                break

    # 4. NEW NODE IS A CHILD (Son, Daughter, Child)
    elif r in ("son", "daughter", "child"):
        # A. Primary user's parents become grandparents to new child
        parents = [
            rel for rel in existing_rels
            if rel.relationship_type in ("father", "mother", "parent", "dad", "mom")
            and rel.relative_user_id != newly_linked_user_id
        ]
        for p in parents:
            child_role = "grandson" if new_user.gender == "male" else "granddaughter" if new_user.gender == "female" else "grandchild"
            create_bidirectional_link(p.relative_user_id, newly_linked_user_id, child_role, db, share_clinical_data)

        # B. Primary user's other children become siblings to new child
        other_children = [
            rel for rel in existing_rels
            if rel.relationship_type in ("son", "daughter", "child")
            and rel.relative_user_id != newly_linked_user_id
        ]
        for oc in other_children:
            sib_role = "brother" if new_user.gender == "male" else "sister" if new_user.gender == "female" else "sibling"
            create_bidirectional_link(oc.relative_user_id, newly_linked_user_id, sib_role, db, share_clinical_data)

    # 5. NEW NODE IS A GRANDPARENT (Grandfather, Grandmother, Grandparent)
    elif r in ("grandfather", "grandmother", "grandparent"):
        # If primary user has siblings, they also get this grandparent
        siblings = [
            rel for rel in existing_rels
            if rel.relationship_type in ("brother", "sister", "sibling")
            and rel.relative_user_id != newly_linked_user_id
        ]
        for s in siblings:
            gp_role = "grandfather" if new_user.gender == "male" else "grandmother" if new_user.gender == "female" else "grandparent"
            create_bidirectional_link(s.relative_user_id, newly_linked_user_id, gp_role, db, share_clinical_data)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/{user_id}",
    response_model=List[FamilyMemberResponse],
    summary="Get all linked family members for a user with enriched metadata",
)
def get_family_members(
    user_id: uuid.UUID = FPath(...),
    db: Session = Depends(get_db),
) -> List[FamilyMemberResponse]:
    stmt = (
        select(FamilyRelationship, User)
        .join(User, FamilyRelationship.relative_user_id == User.id)
        .where(FamilyRelationship.user_id == user_id)
        .order_by(FamilyRelationship.created_at.asc())
    )
    rows = db.execute(stmt).all()

    results: List[FamilyMemberResponse] = []
    for rel, user in rows:
        health = compute_health_status(user.id, db)
        can_edit = bool(user.is_placeholder and user.managed_by_user_id == user_id)
        tier = get_generational_tier(rel.relationship_type)
        badge_code = get_relation_badge_code(rel.relationship_type)

        results.append(
            FamilyMemberResponse(
                relationship_id=rel.id,
                relative_id=user.id,
                full_name=user.full_name,
                email=user.email,
                relationship_type=rel.relationship_type,
                role=user.role,
                is_placeholder=user.is_placeholder,
                managed_by_user_id=user.managed_by_user_id,
                avatar_url=user.avatar_url,
                gender=user.gender,
                tier=tier,
                badge_code=badge_code,
                can_edit=can_edit,
                share_clinical_data=rel.share_clinical_data,
                health_status=HealthStatusInfo(**health),
                created_at=rel.created_at,
            )
        )
    return results


@router.get(
    "/{user_id}/tree",
    response_model=FamilyTreeHierarchyResponse,
    summary="Get full hierarchical family tree grouped by generational tiers",
)
def get_family_tree(
    user_id: uuid.UUID = FPath(...),
    db: Session = Depends(get_db),
) -> FamilyTreeHierarchyResponse:
    # 1. Fetch primary user
    primary_user = db.get(User, user_id)
    if not primary_user:
        raise HTTPException(status_code=404, detail="User profile not found.")

    self_health = compute_health_status(primary_user.id, db)
    self_node = FamilyMemberResponse(
        relationship_id=primary_user.id,
        relative_id=primary_user.id,
        full_name=primary_user.full_name,
        email=primary_user.email,
        relationship_type="self",
        role=primary_user.role,
        is_placeholder=primary_user.is_placeholder,
        managed_by_user_id=primary_user.managed_by_user_id,
        avatar_url=primary_user.avatar_url,
        gender=primary_user.gender,
        tier="peers",
        badge_code="SELF",
        can_edit=True,
        share_clinical_data=True,
        health_status=HealthStatusInfo(**self_health),
        created_at=primary_user.created_at,
    )

    # 2. Fetch linked relatives
    all_members = get_family_members(user_id=user_id, db=db)

    grandparents = [m for m in all_members if m.tier == "grandparents"]
    parents = [m for m in all_members if m.tier == "parents"]
    peers = [m for m in all_members if m.tier == "peers"]
    children = [m for m in all_members if m.tier == "children"]
    extended = [m for m in all_members if m.tier == "extended"]

    # 3. Detect suggested links (e.g. Co-parents who are not yet spouses)
    suggested_links: List[SuggestedLinkResponse] = []
    parents_nodes = [m for m in all_members if m.relationship_type in ("father", "mother", "parent", "dad", "mom")]
    if len(parents_nodes) >= 2:
        for i in range(len(parents_nodes)):
            for j in range(i + 1, len(parents_nodes)):
                p1 = parents_nodes[i]
                p2 = parents_nodes[j]
                # Check if p1 and p2 are already linked as spouses
                spouse_link = db.execute(
                    select(FamilyRelationship).where(
                        FamilyRelationship.user_id == p1.relative_id,
                        FamilyRelationship.relative_user_id == p2.relative_id,
                        FamilyRelationship.relationship_type.in_(["spouse", "husband", "wife", "partner"]),
                    )
                ).scalar_one_or_none()
                if not spouse_link:
                    suggested_links.append(
                        SuggestedLinkResponse(
                            user1_id=p1.relative_id,
                            user1_name=p1.full_name,
                            user2_id=p2.relative_id,
                            user2_name=p2.full_name,
                            suggested_relationship="spouse",
                            reason=f"{p1.full_name} and {p2.full_name} are both linked as your parents.",
                        )
                    )

    return FamilyTreeHierarchyResponse(
        self_node=self_node,
        grandparents=grandparents,
        parents=parents,
        peers=peers,
        children=children,
        extended=extended,
        all_members=all_members,
        suggested_links=suggested_links,
    )


@router.post(
    "/link",
    response_model=FamilyMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Link an existing user with automatic bidirectional reciprocal creation and graph propagation",
)
def link_family_member(
    payload: FamilyLinkRequest,
    db: Session = Depends(get_db),
) -> FamilyMemberResponse:
    if payload.user_id == payload.relative_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot link a user to themselves as a relative.",
        )

    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Primary user not found.")

    relative = db.get(User, payload.relative_user_id)
    if not relative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target relative User ID does not exist in the database.",
        )

    # Check for existing relationship
    existing_stmt = select(FamilyRelationship).where(
        FamilyRelationship.user_id == payload.user_id,
        FamilyRelationship.relative_user_id == payload.relative_user_id,
    )
    if db.execute(existing_stmt).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This family relationship has already been linked.",
        )

    link_group_id = uuid.uuid4()
    rel_type_forward = payload.relationship_type.strip().lower()
    rel_type_reciprocal = get_reciprocal_relationship(rel_type_forward, user.gender)

    # 1. Forward link (user -> relative)
    forward_rel = FamilyRelationship(
        user_id=payload.user_id,
        relative_user_id=payload.relative_user_id,
        relationship_type=rel_type_forward,
        link_group_id=link_group_id,
        share_clinical_data=payload.share_clinical_data,
    )
    db.add(forward_rel)

    # 2. Reciprocal link (relative -> user)
    reciprocal_stmt = select(FamilyRelationship).where(
        FamilyRelationship.user_id == payload.relative_user_id,
        FamilyRelationship.relative_user_id == payload.user_id,
    )
    if not db.execute(reciprocal_stmt).scalar_one_or_none():
        reciprocal_rel = FamilyRelationship(
            user_id=payload.relative_user_id,
            relative_user_id=payload.user_id,
            relationship_type=rel_type_reciprocal,
            link_group_id=link_group_id,
            share_clinical_data=payload.share_clinical_data,
        )
        db.add(reciprocal_rel)

    # 3. Transitive Graph Propagation across family network
    propagate_relationship_graph(
        primary_user_id=payload.user_id,
        newly_linked_user_id=payload.relative_user_id,
        rel_type=rel_type_forward,
        db=db,
        is_half_sibling=payload.is_half_sibling,
        shared_parent_id=payload.shared_parent_id,
        share_clinical_data=payload.share_clinical_data,
    )

    db.commit()
    db.refresh(forward_rel)

    health = compute_health_status(relative.id, db)
    can_edit = bool(relative.is_placeholder and relative.managed_by_user_id == payload.user_id)
    tier = get_generational_tier(forward_rel.relationship_type)
    badge_code = get_relation_badge_code(forward_rel.relationship_type)

    return FamilyMemberResponse(
        relationship_id=forward_rel.id,
        relative_id=relative.id,
        full_name=relative.full_name,
        email=relative.email,
        relationship_type=forward_rel.relationship_type,
        role=relative.role,
        is_placeholder=relative.is_placeholder,
        managed_by_user_id=relative.managed_by_user_id,
        avatar_url=relative.avatar_url,
        gender=relative.gender,
        tier=tier,
        badge_code=badge_code,
        can_edit=can_edit,
        share_clinical_data=forward_rel.share_clinical_data,
        health_status=HealthStatusInfo(**health),
        created_at=forward_rel.created_at,
    )


@router.post(
    "/placeholder",
    response_model=FamilyMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a managed placeholder profile and link it bidirectionally with graph propagation",
)
def create_placeholder_profile(
    payload: PlaceholderCreateRequest,
    db: Session = Depends(get_db),
) -> FamilyMemberResponse:
    manager = db.get(User, payload.manager_user_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Manager user profile not found.")

    placeholder_uuid = uuid.uuid4()
    placeholder_email = f"placeholder-{placeholder_uuid.hex[:12]}@placeholder.genhealth.local"

    placeholder_user = User(
        id=placeholder_uuid,
        email=placeholder_email,
        password_hash="!",  # locked / non-loginable until claimed
        full_name=payload.full_name.strip(),
        gender=payload.gender or "unspecified",
        avatar_url=payload.avatar_url,
        is_placeholder=True,
        managed_by_user_id=manager.id,
        role="patient",
    )
    db.add(placeholder_user)
    db.flush()

    link_group_id = uuid.uuid4()
    rel_type_forward = payload.relationship_type.strip().lower()
    rel_type_reciprocal = get_reciprocal_relationship(rel_type_forward, manager.gender)

    forward_rel = FamilyRelationship(
        user_id=manager.id,
        relative_user_id=placeholder_user.id,
        relationship_type=rel_type_forward,
        link_group_id=link_group_id,
        share_clinical_data=True,
    )
    reciprocal_rel = FamilyRelationship(
        user_id=placeholder_user.id,
        relative_user_id=manager.id,
        relationship_type=rel_type_reciprocal,
        link_group_id=link_group_id,
        share_clinical_data=True,
    )
    db.add_all([forward_rel, reciprocal_rel])

    # Transitive Graph Propagation across family network
    propagate_relationship_graph(
        primary_user_id=manager.id,
        newly_linked_user_id=placeholder_user.id,
        rel_type=rel_type_forward,
        db=db,
        is_half_sibling=payload.is_half_sibling,
        shared_parent_id=payload.shared_parent_id,
        share_clinical_data=True,
    )

    db.commit()
    db.refresh(forward_rel)

    health = compute_health_status(placeholder_user.id, db)
    tier = get_generational_tier(forward_rel.relationship_type)
    badge_code = get_relation_badge_code(forward_rel.relationship_type)

    return FamilyMemberResponse(
        relationship_id=forward_rel.id,
        relative_id=placeholder_user.id,
        full_name=placeholder_user.full_name,
        email=placeholder_user.email,
        relationship_type=forward_rel.relationship_type,
        role=placeholder_user.role,
        is_placeholder=True,
        managed_by_user_id=manager.id,
        avatar_url=placeholder_user.avatar_url,
        gender=placeholder_user.gender,
        tier=tier,
        badge_code=badge_code,
        can_edit=True,
        share_clinical_data=True,
        health_status=HealthStatusInfo(**health),
        created_at=forward_rel.created_at,
    )


@router.post(
    "/confirm-spouse",
    summary="Confirm or dismiss a suggested spouse link between co-parents",
)
def confirm_spouse_link(
    payload: ConfirmSpouseRequest,
    db: Session = Depends(get_db),
):
    if not payload.confirm:
        return {"status": "dismissed", "message": "Suggested spouse link dismissed."}

    user1 = db.get(User, payload.user1_id)
    user2 = db.get(User, payload.user2_id)
    if not user1 or not user2:
        raise HTTPException(status_code=404, detail="User profile not found.")

    rel_type1 = "husband" if user2.gender == "male" else "wife" if user2.gender == "female" else "spouse"
    create_bidirectional_link(payload.user1_id, payload.user2_id, rel_type1, db)
    db.commit()

    return {"status": "confirmed", "message": f"Linked {user1.full_name} and {user2.full_name} as spouses."}


@router.patch(
    "/member/{relative_id}",
    response_model=FamilyMemberResponse,
    summary="Update avatar photo, name, or metadata for a managed placeholder or own profile",
)
def update_family_member(
    relative_id: uuid.UUID = FPath(...),
    payload: MemberUpdateRequest = ...,
    db: Session = Depends(get_db),
) -> FamilyMemberResponse:
    target_user = db.get(User, relative_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User profile not found.")

    # Permissions check: Must be the user themselves OR the manager of a placeholder
    is_self = target_user.id == payload.manager_user_id
    is_manager = target_user.is_placeholder and target_user.managed_by_user_id == payload.manager_user_id

    if not is_self and not is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this profile. Only the owner or placeholder manager can make changes.",
        )

    if payload.full_name is not None and payload.full_name.strip():
        target_user.full_name = payload.full_name.strip()
    if payload.gender is not None:
        target_user.gender = payload.gender
    if payload.avatar_url is not None:
        target_user.avatar_url = payload.avatar_url

    db.commit()
    db.refresh(target_user)

    # Fetch corresponding relationship if exists
    rel_stmt = select(FamilyRelationship).where(
        FamilyRelationship.user_id == payload.manager_user_id,
        FamilyRelationship.relative_user_id == target_user.id,
    )
    rel = db.execute(rel_stmt).scalar_one_or_none()

    health = compute_health_status(target_user.id, db)
    rel_type = rel.relationship_type if rel else ("self" if is_self else "relative")
    rel_id = rel.id if rel else target_user.id

    return FamilyMemberResponse(
        relationship_id=rel_id,
        relative_id=target_user.id,
        full_name=target_user.full_name,
        email=target_user.email,
        relationship_type=rel_type,
        role=target_user.role,
        is_placeholder=target_user.is_placeholder,
        managed_by_user_id=target_user.managed_by_user_id,
        avatar_url=target_user.avatar_url,
        gender=target_user.gender,
        tier=get_generational_tier(rel_type),
        badge_code=get_relation_badge_code(rel_type),
        can_edit=is_self or is_manager,
        share_clinical_data=rel.share_clinical_data if rel else True,
        health_status=HealthStatusInfo(**health),
        created_at=target_user.created_at,
    )


@router.patch(
    "/relationship/{relationship_id}/consent",
    summary="Update clinical data sharing consent toggle for a family relationship",
)
def update_sharing_consent(
    relationship_id: uuid.UUID = FPath(...),
    payload: ConsentUpdateRequest = ...,
    db: Session = Depends(get_db),
):
    rel = db.get(FamilyRelationship, relationship_id)
    if not rel:
        raise HTTPException(status_code=404, detail="Family relationship not found.")

    if rel.user_id != payload.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update consent for this relationship.")

    rel.share_clinical_data = payload.share_clinical_data
    db.commit()
    return {"status": "ok", "share_clinical_data": rel.share_clinical_data}


@router.delete(
    "/{relationship_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlink a family relationship (severs bidirectional connection atomically)",
)
def unlink_family_member(
    relationship_id: uuid.UUID = FPath(...),
    db: Session = Depends(get_db),
):
    stmt = select(FamilyRelationship).where(FamilyRelationship.id == relationship_id)
    rel = db.execute(stmt).scalar_one_or_none()
    if not rel:
        raise HTTPException(status_code=404, detail="Family relationship not found.")

    # If linked via link_group_id, remove both sides atomically
    if rel.link_group_id:
        db.execute(delete(FamilyRelationship).where(FamilyRelationship.link_group_id == rel.link_group_id))
    else:
        # Fallback reciprocal delete
        db.execute(
            delete(FamilyRelationship).where(
                (FamilyRelationship.user_id == rel.relative_user_id)
                & (FamilyRelationship.relative_user_id == rel.user_id)
            )
        )
        db.delete(rel)

    db.commit()
    return None
