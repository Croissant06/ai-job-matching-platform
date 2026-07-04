# UI Design Instructions — AI Job Matching Platform

## Project Context

This project is an AI-powered job search platform that matches candidates to relevant job ads based on their CV, skills, preferences, and semantic match score.

The product should not feel like a basic job board. The strongest design direction is an **AI career matching dashboard**, where the user feels that the platform understands their profile and actively recommends opportunities, instead of simply listing job ads.

---

# Recommended UI Direction

## Name of the UI Concept

**Career Intelligence Dashboard**

## Core Style

```txt
Premium AI SaaS dashboard
+ friendly onboarding
+ bento cards
+ soft glass accents
+ clean job cards
+ AI explanations
+ gap analysis cards
```

The UI should feel modern, useful, and trustworthy. It should look like a serious SaaS product, but still feel friendly enough for normal job seekers.

Avoid making it look like:
- A generic Indeed/LinkedIn clone
- A cheap job board template
- A dark futuristic AI gimmick
- An overdesigned Dribbble concept that is not practical with real data

---

# How to Use Visual References

The reference images should be used only as **vibe and layout inspiration**, not as exact templates.

Use them for:
- Overall feeling: clean, modern, spacious job app UI
- Card layout inspiration
- Search bar placement
- Job recommendation feed structure
- Filter sidebar / filter drawer ideas
- Mobile job card layout
- Soft gradients and rounded panels
- Visual hierarchy for job title, salary, location, and actions

Do **not** use them for:
- Exact copying
- Exact color palette
- Exact UX flow
- Exact spacing
- Exact component structure
- Final source of truth for the product

Some reference images from Dribbble/Behance can look impressive but may not scale well with real job descriptions, filters, AI explanations, salary ranges, and multilingual content.

The real source of truth should be the product flow:

```txt
CV upload
→ AI profile generation
→ job matching
→ match score
→ explanation
→ gap analysis
→ saved searches
→ alerts
```

---

# Visual Identity

## Design Personality

The UI should communicate:

- Smart
- Modern
- Trustworthy
- Helpful
- Premium
- Clean
- Slightly futuristic, but not cold
- Human and career-focused, not robotic

## Recommended Theme

Default should be **light mode**.

Dark mode can be added later, but the main product should use light mode because:
- Job descriptions require a lot of reading
- Light UI feels more trustworthy and professional
- It is easier to make forms, filters, and job cards readable

---

# Color System

Recommended base palette:

```txt
Background: #F8FAFC
Surface: #FFFFFF
Surface soft: #F1F5F9
Primary: #4F46E5
Primary dark: #3730A3
Accent cyan: #06B6D4
Success: #22C55E
Warning: #F59E0B
Danger: #EF4444
Text main: #0F172A
Text secondary: #334155
Text muted: #64748B
Border: #E2E8F0
Soft border: #EEF2F7
```

Recommended gradient:

```css
linear-gradient(135deg, #4F46E5, #06B6D4)
```

Use the gradient sparingly:
- Primary CTA
- Match score highlight
- Hero mockup accent
- AI insight badge

Do not make every card gradient. The UI should stay clean.

---

# Typography

Recommended fonts:

```txt
Primary choice: Geist
Safe choice: Inter
```

Use:
- Large, confident headings
- Clear body text
- Muted helper text
- Strong numbers for match scores

Typography should feel like a modern SaaS dashboard, not like a blog or old admin panel.

---

# Spacing and Shape

## Border Radius

```txt
Small buttons: 10px–12px
Inputs: 12px
Cards: 18px–22px
Large dashboard panels: 24px–28px
Hero mockups: 28px–32px
```

## Shadows

Use soft shadows, not harsh ones.

Good style:

```css
box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
```

Cards should feel layered but not heavy.

## Glass Effect

Glassmorphism can be used, but only as an accent.

Good places for soft glass:
- Hero dashboard mockup
- Floating AI insight card
- Match score summary card
- Top navbar background

Avoid using glass everywhere because it can reduce readability.

---

# Core Product Screens

## 1. Landing Page

The landing page should instantly explain that this is not a normal job board.

### Hero Message

Recommended headline:

```txt
Find jobs that actually match your CV.
```

Recommended subheadline:

```txt
AI-powered job discovery across Bulgaria, Romania, and international markets. Upload your CV and get ranked opportunities with match scores, skill gaps, and clear explanations.
```

### Primary CTA

```txt
Upload CV
```

### Secondary CTA

```txt
Explore Demo
```

### Hero Visual

The hero should show a fake dashboard preview with:

- Match score card
- Top recommended job
- AI explanation
- Missing skills
- Profile strength
- New matches count

Example hero mockup content:

```txt
94% Match
Junior Data Analyst
Sofia · Hybrid · €900–€1300

Why this matches:
Python, Excel, reporting, junior-level analytics.

Missing:
Power BI, advanced SQL
```

### Landing Page Sections

Recommended structure:

1. Hero
2. How it works
3. AI matching features
4. Example job match card
5. Supported markets
6. Pricing / trial
7. CTA section

### How It Works Section

Use 3 or 4 cards:

```txt
1. Upload your CV
2. AI builds your career profile
3. Get ranked job matches
4. Apply smarter
```

---

## 2. Onboarding Flow

The onboarding should be simple and friendly.

### Step 1 — Account / Goal

Ask what kind of job the user is looking for.

Example chips:

```txt
Internship
Junior
Mid-level
Remote
Hybrid
Sofia
Bucharest
English-speaking
Relocation-ready
```

### Step 2 — CV Upload

Main copy:

```txt
Build your AI career profile
Upload your CV and we’ll extract your skills, experience, languages, location, and preferred roles.
```

Upload card:

```txt
Drag and drop your CV
PDF or DOCX up to 10MB
```

Supporting text:

```txt
We extract:
Skills · Experience · Education · Languages · Location · Career direction
```

### Step 3 — AI Profile Review

After upload, show the generated profile and let the user edit it.

Sections:
- Detected roles
- Skills
- Experience level
- Languages
- Preferred locations
- Work type preferences
- Salary expectations
- Career direction

CTA:

```txt
Confirm Profile
```

---

## 3. Dashboard Home

The dashboard should feel personalized.

### Header

Example:

```txt
Good morning, Presiyan
You have 24 new job matches today.
```

For generic users:

```txt
Welcome back
Your AI career profile found new matches today.
```

### Bento Cards

Use a bento grid with these cards:

- Best match today
- Profile strength
- New job matches
- Saved searches
- Applications tracked
- Missing skills summary

Example:

```txt
Best Match
94%
Junior Data Analyst

Profile Strength
82%

New Matches
24

Saved Searches
3
```

### Layout

Desktop layout:

```txt
Left sidebar:
- Dashboard
- Job Matches
- Saved Searches
- CV Profile
- Alerts
- Settings

Main content:
- Recommendation feed
- Top matches
- Profile improvement tips

Right panel:
- AI Career Profile
- Top detected skills
- Missing skills
- Alert status
```

Mobile layout:
- Bottom navigation
- Recommendation feed first
- Filters in drawer
- AI profile summary collapsed into card

---

## 4. Job Matches Page

This is the core screen.

It should not feel like a plain job list. It should feel like an intelligent recommendation feed.

### Job Card Structure

Each job card should show:

```txt
[94% Match] Junior Data Analyst
Company Name · Sofia · Hybrid
Salary: 1200–1800 BGN
Source: jobs.bg
Posted: 2 days ago

Why this matches:
Your CV includes Python, Excel, and data cleaning experience.

Skill gaps:
Power BI · SQL joins

[View Job] [Save] [Hide]
```

### Required Elements on Every Job Card

- Match score
- Job title
- Company
- Location
- Remote/hybrid/on-site type
- Salary, if available
- Source badge
- Date posted
- Short AI explanation
- Missing skills / gaps
- Save button
- Hide button
- View details / apply button

### Match Score Styling

The match score should be one of the strongest visual elements.

Recommended styles:
- Circular badge
- Gradient pill
- Large percentage
- Color-coded status

Suggested score colors:
- 90–100: strong success
- 75–89: good match
- 60–74: possible match
- Below 60: weak match

Do not rely only on color. Include text labels too.

Example:

```txt
94% Match — Excellent fit
```

---

## 5. Job Detail Page

The job detail page should have a practical layout.

### Desktop Layout

```txt
Left / Main:
- Original job title
- Company
- Location
- Salary
- Full job description
- Requirements
- Benefits
- Original source link

Right sticky panel:
- Match score
- Why this matches
- Missing skills
- Match factors
- Save button
- Apply button
- Similar jobs
```

### Right AI Panel

The right panel is one of the most important differentiators.

It should show:

```txt
Overall Match: 91%

Why this matches:
You have Python, Excel, and data analysis experience. The role is junior-level and allows hybrid work in Sofia.

Missing skills:
Power BI
Advanced SQL
Dashboard reporting

Match factors:
Skills: 88%
Experience: 95%
Location: 100%
Salary: 75%
Language: 90%
```

This makes the AI feel explainable and more trustworthy.

---

## 6. AI Profile Page

The AI Profile page should make the user feel that the platform understands them.

### Sections

```txt
Detected Roles
Data Analyst · Junior Python Developer · QA Intern

Top Skills
Python · Excel · SQL · Data Cleaning · English C1

Experience Level
Junior / Entry-level

Preferred Locations
Bulgaria · Romania · Remote

Languages
Bulgarian · English · Romanian

Work Preferences
Remote · Hybrid · Full-time
```

### Profile Strength

Show a profile completeness / strength score:

```txt
Profile Strength: 82%
```

Add practical suggestions:

```txt
Add salary expectations to improve matching.
Add preferred cities to receive more accurate alerts.
Add missing skills manually if the CV parser missed something.
```

### CTA

```txt
Edit AI Profile
```

---

## 7. Saved Searches Page

Saved searches should feel like reusable job-hunting profiles.

Example card:

```txt
Junior Data Analyst — Sofia or Remote
Countries: Bulgaria, Romania
Level: Junior
Salary: 1000+ BGN
Work type: Remote / Hybrid
Alerts: On
Last checked: Today
New matches: 12
```

Actions:
- Edit
- Pause alerts
- View matches
- Delete

---

## 8. Alerts and Notifications Page

The alert system should be simple.

Settings:
- Email alerts on/off
- Push notifications on/off
- Frequency
- Saved search selection
- Minimum match score threshold

Example:

```txt
Send me jobs with at least 80% match score.
```

Options:

```txt
Immediately
Daily
Every 2 days
Weekly
```

---

# Core Components

## 1. AI Match Score Badge

Purpose:
Show how relevant a job is.

Variants:
- Excellent fit
- Good fit
- Possible fit
- Weak fit

Example:

```txt
94% Match
Excellent fit
```

---

## 2. Job Recommendation Card

Purpose:
Main card in the recommendation feed.

Must include:
- Match score
- Job title
- Company
- Location
- Salary
- Work type
- Source
- Short AI explanation
- Skill gaps
- Actions

---

## 3. Gap Analysis Card

Purpose:
Show what the candidate lacks for a job.

Example:

```txt
Missing Skills
Power BI
Advanced SQL
Dashboard reporting
```

Also add a positive framing:

```txt
You already match most requirements. Learning Power BI would improve your match.
```

---

## 4. Skill Chips

Use chips for:
- Skills
- Languages
- Locations
- Job types
- Seniority
- Sources

Examples:

```txt
Python
SQL
Remote
Junior
English C1
Sofia
jobs.bg
```

---

## 5. AI Explanation Panel

Purpose:
Make the platform feel transparent.

Example:

```txt
Why this matches
Your CV shows Python, Excel, and data cleaning experience. The job is junior-level and allows hybrid work, matching your preferred setup.
```

---

## 6. Filter Sidebar / Drawer

Desktop:
- Left sidebar filters

Mobile:
- Bottom sheet / drawer

Filters:
- Country
- Region
- City
- Seniority
- Work type
- Salary
- Source
- Date posted
- Minimum match score
- Language

---

## 7. Empty States

The app needs good empty states.

Example when no CV uploaded:

```txt
No AI profile yet
Upload your CV to start receiving personalized job matches.
```

Example when no matches found:

```txt
No strong matches yet
Try lowering your minimum match score or expanding your preferred locations.
```

Example when saved searches are empty:

```txt
No saved searches
Create different search profiles for remote roles, relocation, or specific cities.
```

---

# UX Priorities

## 1. Explainability Over Magic

Do not just show:

```txt
94% Match
```

Always explain why:

```txt
This matches because your CV includes Python, Excel, and junior-level analytics experience.
```

## 2. Personalization First

The user should feel the platform is built around their CV.

Good:

```txt
Based on your CV, these jobs are your strongest matches.
```

Bad:

```txt
Here are latest jobs.
```

## 3. Reduce Job Search Overwhelm

Job search can feel stressful. The UI should reduce cognitive load.

Use:
- Clear cards
- Short explanations
- Good filtering
- Saved searches
- Match score ranking
- Hide irrelevant jobs

## 4. Keep Real Data in Mind

The UI must work with:
- Long job titles
- Missing salary data
- Multiple locations
- Different languages
- Old job ads
- Duplicate listings
- Incomplete scraped data
- Different source formats

Do not design only for perfect fake data.

---

# Implementation Priority

For the first version, build these pages first:

```txt
1. Landing page
2. CV upload page
3. AI profile page
4. Job matches page
5. Job detail page
6. Saved searches page
```

Do not overbuild:
- Complex animations
- Full dark mode
- Advanced charts
- Social network features
- Employer dashboard
- Application tracker

Those can come later.

---

# Suggested Navigation

## Desktop Sidebar

```txt
Dashboard
Job Matches
Saved Searches
AI Profile
Alerts
Settings
```

## Mobile Bottom Navigation

```txt
Home
Matches
Saved
Profile
```

Additional settings can be placed in the profile screen.

---

# Suggested Copy

## Landing Page

```txt
Find jobs that actually match your CV.
```

```txt
Upload your CV and let AI rank job opportunities by skills, experience, location, salary, and preferences.
```

```txt
Stop scrolling through irrelevant listings. See why each role fits and what skills you may be missing.
```

## CV Upload

```txt
Build your AI career profile
```

```txt
Upload your CV and we’ll extract your skills, experience, languages, and preferred roles.
```

## Job Matches

```txt
Recommended for your profile
```

```txt
Ranked by match score, not just keywords.
```

## Gap Analysis

```txt
Skills to improve this match
```

```txt
You already match most of this role. These skills would make you a stronger candidate.
```

## Saved Searches

```txt
Save different job search profiles
```

```txt
Create separate searches for remote roles, relocation, or specific cities.
```

---

# Recommended Design Direction Summary

Build the UI around this final concept:

```txt
Name: Career Intelligence Dashboard
Style: Premium AI SaaS
Palette: Light mode, indigo/cyan accent, soft gradients
Layout: Bento dashboard + job cards + right-side AI insights
Core visual hook: match score + why it matches + missing skills
Mobile style: simplified recommendation feed with filter drawer
```

This direction gives the project a stronger identity than a normal job board and makes the AI matching feature visible immediately.
