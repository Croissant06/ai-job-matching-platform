# TECHNICAL SPECIFICATION

## Platform for Intelligent Job Search

### AI-Based Matching Between Candidates and Job Ads

**Project working name:** "JobMatch AI" (placeholder)

**Version 1.0 · Developer Document**

---

# Table of Contents

---

# 1. Project Overview

The goal of the project is to build a platform that automatically aggregates open job ads from multiple sources and provides the candidate with personalized results through artificial intelligence. The key difference compared to existing job boards is that the platform does not simply filter job ads by keywords, but builds an AI profile of the candidate based on their CV and returns job ads ranked by degree of relevance (match score), with an explanation of why a given job ad is a fit.

The platform serves three markets — Bulgaria, Romania, and international/English — and is accessible both through the web and through mobile applications (Android and iOS).

## Unique Value (Why the Platform Stands Out)

- **Match scoring, not just filtering** — each job ad receives a relevance percentage compared to the candidate's profile.
- **Semantic search** — "sales" also finds "sales representative", "account manager", and not only exact word matches.
- **AI explanation of the match** — a short summary of why the job ad fits the candidate.
- **Gap analysis** — what skills the candidate is missing for a specific position.
- **Self-learning matching** — the model improves based on user feedback (clicks, likes, applications).
- **Email alerts** — new job ads matching the profile are sent automatically.
- **Saved search profiles** — the candidate can save several sets of preferences (e.g. "ready for relocation" versus "only Ruse").

# 2. Core Functionalities

## 2.1. Registration and User Profile

- Registration with email/password and social login (Google, LinkedIn).
- CV upload (PDF, DOCX) and/or manual data entry.
- Interface language selection: Bulgarian, English, Romanian.

## 2.2. AI Processing of the CV

- Extraction of structured data from the CV: names, contacts, experience, education, skills, location, languages.
- Generation of an AI candidate profile — a structured set of skills, experience level, roles, and preferred fields.
- Extraction of keywords and skills that become the basis for matching.
- Ability for the candidate to manually edit/supplement the AI profile.

## 2.3. Search and Matching

- Search in the platform's own database of aggregated job ads (not in real time — see section 4).
- Each job ad receives a match score compared to the candidate's profile.
- Results are ranked by relevance, with a short AI explanation.
- Semantic search through vector embeddings, not keyword-only.

## 2.4. Custom Preferences (Filters)

The candidate can set additional preferences. All are optional — selecting all of them is not mandatory. The logic supports combining AND/OR:

- Position level — intern / junior / mid / senior / management.
- Country — one or several.
- Region — one or several regions.
- City — one or several cities.
- Employment type — full-time/part-time, remote, hybrid.
- Salary — minimum threshold, if the job ad contains salary information.
- Saving several sets of preferences as separate searches.

## 2.5. Data Extracted from Each Job Ad

- Location (country, region, city).
- Position / job title.
- Salary (if specified in the job ad).
- Employer, publication date, link to the original job ad, short description.

## 2.6. Alerts and Notifications

- Email notifications for new job ads matching a saved profile.
- Push notifications in the mobile applications.

# 3. Data Sources (Job Ad Aggregation)

**IMPORTANT (legal and technical):** LinkedIn, Indeed, and Glassdoor actively block scraping — technically (anti-bot) and legally (ToS, lawsuits). Direct scraping of these platforms at scale is unreliable and risky. For them, legal aggregator APIs are used (e.g. Jooble, Adzuna, Careerjet), which already republish some of these job ads.

## 3.1. Hybrid Data Acquisition Model

Recommended strategy, phased by reliability and cost:

| Layer | Method | Sources |
|---|---|---|
| A. API aggregators | Legal partner/public APIs | Jooble API, Adzuna, Careerjet |
| B. Own scrapers | Scrapy / Playwright | jobs.bg, zaplata.bg, ejobs.ro, bestjobs.ro |
| C. XML/Premium feeds | Paid feeds (future phase) | After gaining popularity |

## 3.2. Technical Architecture of the Scraper

- Python-based scraping with Scrapy for structured sites; Playwright for sites with JavaScript rendering/anti-bot.
- Modular architecture — each source is a separate "connector" with a unified output format, so that adding a new site does not break the others.
- Data normalization to a unified schema (location, position, salary, employer, etc.).
- Deduplication — the same job ad from several sources is merged.
- Error reporting and notification when a connector breaks (when the source site changes).
- Compliance with robots.txt and rate limiting in order to minimize legal and technical risk.

# 4. Data and Updating

- Job ads are collected periodically into the platform's own database, and searching happens in it (fast, cheap), not in real time against the sources.
- Update frequency: every 2 days at the beginning; configurable for more frequent updates during growth.
- Job ads have an expiration period — expired ones are archived/hidden automatically.
- Vector embeddings of job ads and profiles for semantic matching (e.g. pgvector or a separate vector database).

# 5. AI / Matching Component

- CV parsing — extraction of structured data and skills from PDF/DOCX.
- Profile generation — an LLM builds a structured candidate profile.
- Semantic matching — comparison through embeddings between profile and job ads.
- Match score + explanation — numerical score and short textual explanation of the match.
- Gap analysis — missing skills for a specific position.
- Self-learning — the model is calibrated based on user feedback (implicit: clicks/applications; explicit: like/hide). At the start, this is a feedback loop that improves ranking; in a later phase — model fine-tuning.
- Multilinguality — matching should work for CVs and job ads in Bulgarian, English, and Romanian.

# 6. Platforms and Applications

- Web application (responsive) — first phase.
- Android application — for mass access.
- iOS application — for mass access.

Recommendation: in order not to triple the budget and time at the start, the mobile applications should be built using cross-platform technology (React Native or Flutter) on top of a shared backend API. Web first, mobile immediately after a stable MVP.

# 7. Monetization

- Free trial period — 15 days full access.
- Paid subscription version after the trial period.
- Consider a "freemium" layer (limited number of results/alerts for free) to retain non-paying users as a funnel.

# 8. Proposed Technology Stack (Indicative)

| Layer | Technology (Proposal) |
|---|---|
| Backend | Python (FastAPI / Django) |
| Scraping | Scrapy + Playwright |
| Database | PostgreSQL + pgvector |
| AI / LLM | LLM API for parsing and matching; embeddings model |
| Web frontend | React / Next.js |
| Mobile | React Native or Flutter |
| Queues/tasks | Celery / cron for periodic scraping |
| Infrastructure | Docker; cloud of choice |

The stack is a recommendation, not a requirement — the developer can propose an alternative with justification.

# 9. Development Phasing (Proposal)

1. MVP: registration, CV upload, AI profile, scraping from 2-3 Bulgarian sources, basic matching and filters, web interface.
2. Phase 2: Romanian and English sources, match score + explanation, alerts, saved searches.
3. Phase 3: mobile applications (Android/iOS), gap analysis, self-learning matching.
4. Phase 4: API aggregators at scale, paid XML feeds, monetization and scaling.

# 10. Questions for the Developer / Open Points

- Estimate of budget and timeline by phase.
- Proposal for a specific LLM/embeddings provider and estimated monthly cost for X users.
- Legal review of the scraping strategy by source.
- Which sources can realistically be scraped stably and which require an API.
- Proposal for the architecture of the self-learning matching.

This document is a draft for discussion and will be supplemented after clarifications with the developer.
