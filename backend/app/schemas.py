import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ProfileOut(BaseModel):
    id: uuid.UUID
    version: int
    full_name: str | None
    email: str | None
    phone: str | None
    country: str | None
    city: str | None
    seniority: str | None
    years_experience: float | None
    roles: list[str]
    skills: list[str]
    languages: list[str]
    summary: str | None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    country: str | None = None
    city: str | None = None
    seniority: str | None = None
    years_experience: float | None = None
    roles: list[str] | None = None
    skills: list[str] | None = None
    languages: list[str] | None = None
    summary: str | None = None


class ScoreBreakdown(BaseModel):
    semantic: float
    skills: float
    seniority: float


class JobMatch(BaseModel):
    id: uuid.UUID
    title: str
    company: str
    description: str
    language: str
    country: str
    region: str | None
    city: str | None
    workplace: str
    employment_type: str
    seniority: str | None
    salary_min: int | None
    salary_max: int | None
    salary_currency: str | None
    skills: list[str]
    posted_at: datetime
    external_url: str | None
    score: float
    score_breakdown: ScoreBreakdown

    model_config = {"from_attributes": True}


class SearchResponse(BaseModel):
    jobs: list[JobMatch]
    total: int


class ExplanationOut(BaseModel):
    explanation: str
    missing_skills: list[str]
    cached: bool


class FeedbackIn(BaseModel):
    job_id: uuid.UUID
    event_type: Literal["impression", "click", "save", "hide", "apply"]


class FilterOptions(BaseModel):
    countries: list[str]
    cities: list[str]
    seniorities: list[str] = Field(default_factory=lambda: ["intern", "junior", "mid", "senior", "management"])
    workplaces: list[str] = Field(default_factory=lambda: ["onsite", "hybrid", "remote"])
    employment_types: list[str] = Field(default_factory=lambda: ["full_time", "part_time"])
