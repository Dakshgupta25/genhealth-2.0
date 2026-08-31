"""
Strongly-typed Pydantic Input Request Schemas.
"""

from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field


class NormalizeBiomarkerRequest(BaseModel):
    raw_name: str = Field(..., description="Raw lab report test name (e.g. 'Hb A1c')")
    value: Optional[Any] = Field(None, description="Raw numeric or text value (e.g. '5.8')")
    unit: Optional[str] = Field(None, description="Raw measurement unit (e.g. '%')")
    raw_value: Optional[Any] = Field(None, description="Alias for value")


class RawBiomarkerItem(BaseModel):
    raw_name: str = Field(..., description="Raw test name string or canonical key")
    value: Any = Field(..., description="Test value string or float")
    unit: Optional[str] = Field(None, description="Measurement unit string")


class FamilyMemberRequest(BaseModel):
    member_id: Optional[str] = Field("member", description="Unique member identifier or nickname")
    relationship: str = Field(..., description="Kinship type: 'father', 'mother', 'sister', 'spouse', etc.")
    biomarkers: Union[List[RawBiomarkerItem], Dict[str, Any]] = Field(
        default_factory=list, description="List or dict of lab report biomarkers for this member"
    )


class HereditaryRiskAssessmentRequest(BaseModel):
    user_id: str = Field(..., description="Patient user identifier")
    patient_name: Optional[str] = Field("Patient", description="Patient name")
    self_biomarkers: Union[List[RawBiomarkerItem], Dict[str, Any]] = Field(
        default_factory=list, description="Patient's own lab report biomarkers"
    )
    family_members: List[FamilyMemberRequest] = Field(
        default_factory=list, description="List of family members and their biomarkers"
    )
    target_diseases: Optional[List[str]] = Field(
        default=None,
        description="Optional list of disease keys to evaluate"
    )
    disease_keys: Optional[List[str]] = Field(
        default=None,
        description="Alias for target_diseases"
    )
    enable_llm_narrative: bool = Field(
        default=True,
        description="Whether to generate clinical narrative explanations"
    )
