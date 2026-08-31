import uuid
import pytest
from app.models.family_relationship import FamilyRelationship
from app.models.user import User
from app.routers.family import (
    create_bidirectional_link,
    get_generational_tier,
    get_reciprocal_relationship,
    propagate_relationship_graph,
)


def test_reciprocal_relationship_mapping():
    """Verify exact reciprocal genealogical roles across biological gender specifications."""
    # Father / Mother -> Child
    assert get_reciprocal_relationship("father", "male") == "son"
    assert get_reciprocal_relationship("father", "female") == "daughter"
    assert get_reciprocal_relationship("mother", "unspecified") == "child"

    # Son / Daughter -> Parent
    assert get_reciprocal_relationship("son", "male") == "father"
    assert get_reciprocal_relationship("daughter", "female") == "mother"

    # Siblings
    assert get_reciprocal_relationship("brother", "male") == "brother"
    assert get_reciprocal_relationship("brother", "female") == "sister"
    assert get_reciprocal_relationship("sibling", "unspecified") == "sibling"

    # Grandparents
    assert get_reciprocal_relationship("grandfather", "female") == "granddaughter"
    assert get_reciprocal_relationship("granddaughter", "male") == "grandfather"

    # Extended
    assert get_reciprocal_relationship("uncle", "male") == "nephew"
    assert get_reciprocal_relationship("aunt", "female") == "niece"
    assert get_reciprocal_relationship("cousin", "male") == "cousin"


def test_generational_tier_mapping():
    """Verify generational tier resolution."""
    assert get_generational_tier("grandfather") == "grandparents"
    assert get_generational_tier("grandmother") == "grandparents"
    assert get_generational_tier("father") == "parents"
    assert get_generational_tier("mother") == "parents"
    assert get_generational_tier("self") == "peers"
    assert get_generational_tier("brother") == "peers"
    assert get_generational_tier("spouse") == "peers"
    assert get_generational_tier("son") == "children"
    assert get_generational_tier("daughter") == "children"
    assert get_generational_tier("uncle") == "extended"
    assert get_generational_tier("cousin") == "extended"


def test_bidirectional_link_creation(db_session):
    """Verify automatic bidirectional reciprocal link creation in database."""
    user1 = User(
        id=uuid.uuid4(),
        email="parent@genhealth.test",
        password_hash="hash",
        full_name="Parent User",
        gender="male",
    )
    user2 = User(
        id=uuid.uuid4(),
        email="child@genhealth.test",
        password_hash="hash",
        full_name="Child User",
        gender="female",
    )
    db_session.add_all([user1, user2])
    db_session.commit()

    link = create_bidirectional_link(
        user1_id=user1.id,
        user2_id=user2.id,
        rel_type_forward="father",
        db=db_session,
    )
    db_session.commit()

    assert link is not None
    assert link.relationship_type == "father"

    # Reciprocal link check: Child (user2) should see User1 as "father"
    reciprocal = db_session.query(FamilyRelationship).filter_by(
        user_id=user2.id, relative_user_id=user1.id
    ).first()

    assert reciprocal is not None
    assert reciprocal.relationship_type in ("son", "daughter", "child")


def test_transitive_graph_propagation(db_session):
    """Verify transitive graph propagation when adding siblings to a parent-child network."""
    parent = User(
        id=uuid.uuid4(),
        email="p1@genhealth.test",
        password_hash="hash",
        full_name="Parent One",
        gender="male",
    )
    child1 = User(
        id=uuid.uuid4(),
        email="c1@genhealth.test",
        password_hash="hash",
        full_name="Child One",
        gender="male",
    )
    child2 = User(
        id=uuid.uuid4(),
        email="c2@genhealth.test",
        password_hash="hash",
        full_name="Child Two",
        gender="female",
    )
    db_session.add_all([parent, child1, child2])
    db_session.commit()

    # Link child1 to parent
    create_bidirectional_link(child1.id, parent.id, "father", db_session)
    db_session.commit()

    # Now link child2 as sister to child1 -> graph propagation should auto-link parent to child2 as daughter!
    create_bidirectional_link(child1.id, child2.id, "sister", db_session)
    propagate_relationship_graph(
        primary_user_id=child1.id,
        newly_linked_user_id=child2.id,
        rel_type="sister",
        db=db_session,
    )
    db_session.commit()

    # Check parent -> child2 relationship
    p_to_c2 = db_session.query(FamilyRelationship).filter_by(
        user_id=parent.id, relative_user_id=child2.id
    ).first()

    assert p_to_c2 is not None
    assert p_to_c2.relationship_type == "daughter"
