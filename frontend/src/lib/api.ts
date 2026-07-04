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
  posted_at: string;
  external_url: string | null;
  score: number;
  score_breakdown: { semantic: number; skills: number; seniority: number };
}

export interface FilterOptions {
  countries: string[];
  cities: string[];
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
  salary_min?: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? res.statusText);
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const api = {
  getProfile: () => request<Profile>("/api/profile"),

  uploadCv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Profile>("/api/profile/cv", { method: "POST", body: form });
  },

  updateProfile: (update: Partial<Profile>) =>
    request<Profile>("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }),

  searchJobs: (params: SearchParams) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "" && value !== null) qs.set(key, String(value));
    }
    return request<{ jobs: JobMatch[]; total: number }>(`/api/jobs/search?${qs}`);
  },

  getFilterOptions: () => request<FilterOptions>("/api/meta/options"),

  explain: (jobId: string, locale: string) =>
    request<Explanation>(`/api/jobs/${jobId}/explanation?locale=${locale}`, { method: "POST" }),

  logFeedback: (jobId: string, eventType: "impression" | "click" | "save" | "hide" | "apply") =>
    request(`/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, event_type: eventType }),
    }).catch(() => null), // feedback logging must never break the UI
};
