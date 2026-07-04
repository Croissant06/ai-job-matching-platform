export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Profile {
  id: string;
  version: number;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  seniority: string | null;
  years_experience: number | null;
  roles: string[];
  skills: string[];
  languages: string[];
  summary: string | null;
  preferred_countries: string[];
  preferred_cities: string[];
  preferred_workplaces: string[];
  preferred_employment_types: string[];
  target_seniorities: string[];
  relocation_ready: boolean;
  salary_expectation: number | null;
  strength: number;
  suggestions: string[];
}

export interface ScoreBreakdown {
  semantic: number;
  skills: number;
  experience: number;
  location: number;
  salary: number;
  language: number;
}

export interface JobMatch {
  id: string;
  title: string;
  company: string;
  description: string;
  language: string;
  country: string;
  region: string | null;
  city: string | null;
  workplace: string;
  employment_type: string;
  seniority: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  skills: string[];
  source: string;
  posted_at: string;
  external_url: string | null;
  score: number;
  score_breakdown: ScoreBreakdown;
}

export interface SimilarJob {
  id: string;
  title: string;
  company: string;
  city: string | null;
  workplace: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
}

export interface FilterOptions {
  countries: string[];
  cities: string[];
  languages: string[];
  seniorities: string[];
  workplaces: string[];
  employment_types: string[];
}

export interface Explanation {
  explanation: string;
  missing_skills: string[];
  cached: boolean;
}

export interface SearchParams {
  q?: string;
  country?: string;
  city?: string;
  seniority?: string;
  workplace?: string;
  employment_type?: string;
  language?: string;
  salary_min?: number;
  min_score?: number;
}

export interface SavedSearchFilters {
  countries?: string[];
  cities?: string[];
  seniorities?: string[];
  workplaces?: string[];
  employment_types?: string[];
  languages?: string[];
  salary_min?: number;
  min_score?: number;
  query?: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  alerts_enabled: boolean;
  created_at: string;
  last_checked_at: string;
  new_matches: number;
}

export interface Dashboard {
  full_name: string | null;
  profile_strength: number;
  suggestions: string[];
  best_match: JobMatch | null;
  new_matches: number;
  saved_searches: number;
  saved_jobs: number;
  missing_skills: string[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const json = (body: unknown): RequestInit => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** Convert single-select UI filter params to a saved-search filter object. */
export function paramsToSavedFilters(params: SearchParams): SavedSearchFilters {
  return {
    countries: params.country ? [params.country] : undefined,
    cities: params.city ? [params.city] : undefined,
    seniorities: params.seniority ? [params.seniority] : undefined,
    workplaces: params.workplace ? [params.workplace] : undefined,
    employment_types: params.employment_type ? [params.employment_type] : undefined,
    languages: params.language ? [params.language] : undefined,
    salary_min: params.salary_min,
    min_score: params.min_score,
    query: params.q || undefined,
  };
}

/** Convert a stored saved-search filter object back to UI filter params. */
export function savedFiltersToParams(filters: SavedSearchFilters): SearchParams {
  return {
    country: filters.countries?.[0],
    city: filters.cities?.[0],
    seniority: filters.seniorities?.[0],
    workplace: filters.workplaces?.[0],
    employment_type: filters.employment_types?.[0],
    language: filters.languages?.[0],
    salary_min: filters.salary_min,
    min_score: filters.min_score,
    q: filters.query,
  };
}

export const api = {
  getProfile: () => request<Profile>("/api/profile"),

  uploadCv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Profile>("/api/profile/cv", { method: "POST", body: form });
  },

  updateProfile: (update: Partial<Omit<Profile, "id" | "version" | "strength" | "suggestions">>) =>
    request<Profile>("/api/profile", { method: "PUT", ...json(update) }),

  searchJobs: (params: SearchParams, limit = 30) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "" && value !== null) qs.set(key, String(value));
    }
    qs.set("limit", String(limit));
    return request<{ jobs: JobMatch[]; total: number }>(`/api/jobs/search?${qs}`);
  },

  getJob: (jobId: string) => request<JobMatch>(`/api/jobs/${jobId}`),
  getSimilar: (jobId: string) => request<SimilarJob[]>(`/api/jobs/${jobId}/similar`),

  getFilterOptions: () => request<FilterOptions>("/api/meta/options"),

  explain: (jobId: string, locale: string) =>
    request<Explanation>(`/api/jobs/${jobId}/explanation?locale=${locale}`, { method: "POST" }),

  logFeedback: (jobId: string, eventType: "impression" | "click" | "save" | "hide" | "apply") =>
    request(`/api/feedback`, { method: "POST", ...json({ job_id: jobId, event_type: eventType }) }).catch(
      () => null, // feedback logging must never break the UI
    ),

  getDashboard: () => request<Dashboard>("/api/dashboard"),

  listSearches: () => request<SavedSearch[]>("/api/searches"),
  createSearch: (name: string, filters: SavedSearchFilters, alerts = false) =>
    request<SavedSearch>("/api/searches", {
      method: "POST",
      ...json({ name, filters, alerts_enabled: alerts }),
    }),
  updateSearch: (search: SavedSearch) =>
    request<SavedSearch>(`/api/searches/${search.id}`, {
      method: "PUT",
      ...json({ name: search.name, filters: search.filters, alerts_enabled: search.alerts_enabled }),
    }),
  markSearchViewed: (searchId: string) =>
    request<SavedSearch>(`/api/searches/${searchId}/viewed`, { method: "POST" }),
  deleteSearch: (searchId: string) =>
    request<void>(`/api/searches/${searchId}`, { method: "DELETE" }),
};
