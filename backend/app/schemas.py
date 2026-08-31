"""
schemas.py — Pydantic request/response models for the ML inference API.

Strict validation:
  - scores must be 0–100
  - skills list must not be empty
  - all fields are required (no silent defaults)
"""

from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ── Request ────────────────────────────────────────────────────────────────────

class ResumeInput(BaseModel):
    """
    Input payload for POST /predict.

    All score fields are in the 0–100 range (same scale as the UI).
    The feature engineering layer normalises them to 0–1 internally.
    """

    skills: List[str] = Field(
        ...,
        description="Detected skills from the resume. Must not be empty.",
        examples=[["python", "fastapi", "sql", "docker"]],
    )
    project_score: float = Field(
        ..., ge=0, le=100,
        description="Project quality score (0–100)",
    )
    ats_score: float = Field(
        ..., ge=0, le=100,
        description="ATS compatibility score (0–100)",
    )
    structure_score: float = Field(
        ..., ge=0, le=100,
        description="Resume structure score (0–100)",
    )
    core_coverage: float = Field(
        ..., ge=0, le=100,
        description="Core skill coverage for the target role (0–100)",
    )
    optional_coverage: float = Field(
        ..., ge=0, le=100,
        description="Optional skill coverage for the target role (0–100)",
    )

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v: List[str]) -> List[str]:
        cleaned = [s.lower().strip() for s in v if s and s.strip()]
        if not cleaned:
            raise ValueError("skills list must contain at least one non-empty skill.")
        return cleaned

    model_config = {
        "json_schema_extra": {
            "example": {
                "skills": ["python", "tensorflow", "pytorch", "docker", "kubernetes"],
                "project_score":    72.0,
                "ats_score":        85.0,
                "structure_score":  90.0,
                "core_coverage":    75.0,
                "optional_coverage": 66.0,
            }
        }
    }


# ── Response ───────────────────────────────────────────────────────────────────

class ResumePrediction(BaseModel):
    """
    Prediction response from POST /predict.
    """
    predicted_role:  str         = Field(..., description="Best-fit role predicted by the model")
    confidence:      float       = Field(..., description="Max class probability (0–1)")
    resume_score:    float       = Field(..., description="Predicted resume score (0–100)")
    weak_areas:      List[str]   = Field(..., description="Up to 3 areas scoring below threshold")
    model_version:   str         = Field(..., description="Model version used for inference")
    inference_time_ms: Optional[float] = Field(None, description="Inference latency in milliseconds")

    model_config = {
        "json_schema_extra": {
            "example": {
                "predicted_role":    "ML Engineer",
                "confidence":        0.87,
                "resume_score":      71.5,
                "weak_areas":        ["Project Score", "Optional Coverage"],
                "model_version":     "2.0",
                "inference_time_ms": 12.4,
            }
        }
    }


# ── Health ─────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status:          str
    model_loaded:    bool
    model_version:   Optional[str]  = None
    vocabulary_size: Optional[int]  = None
    trained_on:      Optional[int]  = None
    accuracy:        Optional[float] = None
