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

    preferred_countries: list[str]
    preferred_cities: list[str]
    preferred_workplaces: list[str]
    preferred_employment_types: list[str]
    target_seniorities: list[str]
    relocation_ready: bool
    salary_expectation: int | None

    strength: int = 0  # 0..100 completeness score
    suggestions: list[str] = Field(default_factory=list)  # i18n keys for improvement tips

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
    preferred_countries: list[str] | None = None
    preferred_cities: list[str] | None = None
    preferred_workplaces: list[str] | None = None
    preferred_employment_types: list[str] | None = None
    target_seniorities: list[str] | None = None
    relocation_ready: bool | None = None
    salary_expectation: int | None = None


class ScoreBreakdown(BaseModel):
    semantic: float
    skills: float
    experience: float
    location: float
    salary: float
    language: float


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
    source: str
    posted_at: datetime
    external_url: str | None
    score: float
    score_breakdown: ScoreBreakdown

    model_config = {"from_attributes": True}


class SearchResponse(BaseModel):
    jobs: list[JobMatch]
    total: int


class SimilarJob(BaseModel):
    id: uuid.UUID
    title: str
    company: str
    city: str | None
    workplace: str
    salary_min: int | None
    salary_max: int | None
    salary_currency: str | None

    model_config = {"from_attributes": True}


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
    languages: list[str]
    seniorities: list[str] = Field(default_factory=lambda: ["intern", "junior", "mid", "senior", "management"])
    workplaces: list[str] = Field(default_factory=lambda: ["onsite", "hybrid", "remote"])
    employment_types: list[str] = Field(default_factory=lambda: ["full_time", "part_time"])


class SavedSearchFilters(BaseModel):
    countries: list[str] | None = None
    cities: list[str] | None = None
    seniorities: list[str] | None = None
    workplaces: list[str] | None = None
    employment_types: list[str] | None = None
    languages: list[str] | None = None
    salary_min: int | None = None
    min_score: int | None = None
    query: str | None = None


class SavedSearchIn(BaseModel):
    name: str
    filters: SavedSearchFilters
    alerts_enabled: bool = False


class SavedSearchOut(BaseModel):
    id: uuid.UUID
    name: str
    filters: SavedSearchFilters
    alerts_enabled: bool
    created_at: datetime
    last_checked_at: datetime
    new_matches: int = 0


class BestMatch(BaseModel):
    job: JobMatch


class DashboardOut(BaseModel):
    full_name: str | None
    profile_strength: int
    suggestions: list[str]
    best_match: JobMatch | None
    new_matches: int
    saved_searches: int
    saved_jobs: int
    missing_skills: list[str]
