"""Claude calls: CV -> structured profile, and lazy match explanation + gap analysis.

Explanations are generated only when a user opens a job (never in bulk) and are
cached by the caller — this is the cost-control core of the design.
"""

import json

from fastapi import HTTPException

from app.config import get_settings

CV_PARSE_PROMPT = """You are a CV parser for a job-matching platform covering Bulgaria, Romania and international/English markets. Extract structured data from the CV text below. The CV may be in Bulgarian, Romanian or English.

Return ONLY a JSON object (no markdown fences, no commentary) with exactly these keys:
- "full_name": string or null
- "email": string or null
- "phone": string or null
- "country": ISO 3166-1 alpha-2 code (e.g. "BG", "RO") or null
- "city": string or null (in English if possible, e.g. "Sofia")
- "seniority": one of "intern", "junior", "mid", "senior", "management", or null — judge from total experience and role progression
- "years_experience": number or null
- "roles": array of strings — job roles/titles the candidate has held or targets, in English
- "skills": array of strings — concrete skills (technologies, tools, competences), in English, lowercase
- "languages": array of strings — spoken languages, in English (e.g. "Bulgarian", "English")
- "summary": 2-3 sentence professional summary in English

CV text:
---
{cv_text}
---"""

EXPLAIN_PROMPT = """You are a career assistant for a job-matching platform. Given a candidate profile and a job ad, explain the match and analyze gaps.

Respond in language: {locale_language}.

Return ONLY a JSON object (no markdown fences) with exactly these keys:
- "explanation": 2-3 sentences addressed to the candidate ("you"), explaining why this job does or does not fit them — concrete, referencing their actual skills/experience, no fluff
- "missing_skills": array of strings — skills/qualifications the job requires that the candidate appears to lack (empty array if none); each item short, in {locale_language}

Candidate profile:
{profile}

Job ad:
{job}"""

LOCALE_LANGUAGES = {"en": "English", "bg": "Bulgarian", "ro": "Romanian"}


def _client():
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not configured — CV parsing and explanations need it. "
            "Set it in backend/.env.",
        )
    import anthropic

    return anthropic.Anthropic(api_key=settings.anthropic_api_key), settings.anthropic_model


def _extract_json(text: str) -> dict:
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise HTTPException(status_code=502, detail="LLM returned no JSON")
    return json.loads(text[start : end + 1])


def _complete(prompt: str, max_tokens: int) -> dict:
    client, model = _client()
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return _extract_json(message.content[0].text)


def parse_cv(cv_text: str) -> dict:
    # CVs can be long; cap input to keep cost/latency bounded.
    return _complete(CV_PARSE_PROMPT.format(cv_text=cv_text[:20000]), max_tokens=1500)


def explain_match(profile_summary: str, job_summary: str, locale: str) -> dict:
    prompt = EXPLAIN_PROMPT.format(
        locale_language=LOCALE_LANGUAGES.get(locale, "English"),
        profile=profile_summary,
        job=job_summary,
    )
    data = _complete(prompt, max_tokens=800)
    return {
        "explanation": str(data.get("explanation", "")),
        "missing_skills": [str(s) for s in data.get("missing_skills", [])],
    }
