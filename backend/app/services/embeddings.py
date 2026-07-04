"""Embedding providers.

"voyage" — real multilingual embeddings (BG/RO/EN share one vector space).
"mock"  — offline feature-hashing of tokens; similarity degrades to keyword
overlap but the whole pipeline runs without API keys.
"""

import hashlib
import math
import re

from app.config import get_settings

_WORD_RE = re.compile(r"\w+", re.UNICODE)


def _mock_embed(text: str, dim: int) -> list[float]:
    vec = [0.0] * dim
    for token in _WORD_RE.findall(text.lower()):
        h = hashlib.md5(token.encode("utf-8")).digest()
        idx = int.from_bytes(h[:4], "big") % dim
        sign = 1.0 if h[4] % 2 == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def embed_texts(texts: list[str], input_type: str = "document") -> list[list[float]]:
    settings = get_settings()
    if settings.embedding_provider == "voyage":
        import voyageai

        client = voyageai.Client(api_key=settings.voyage_api_key)
        result = client.embed(
            texts,
            model=settings.voyage_model,
            input_type=input_type,
            output_dimension=settings.embedding_dim,
        )
        return result.embeddings
    return [_mock_embed(t, settings.embedding_dim) for t in texts]


def embed_text(text: str, input_type: str = "document") -> list[float]:
    return embed_texts([text], input_type=input_type)[0]


def job_embedding_text(title: str, company: str, skills: list[str], description: str) -> str:
    return f"{title}\n{company}\nSkills: {', '.join(skills)}\n{description}"


def profile_embedding_text(
    roles: list[str], skills: list[str], seniority: str | None, summary: str | None
) -> str:
    parts = [
        f"Roles: {', '.join(roles)}",
        f"Skills: {', '.join(skills)}",
    ]
    if seniority:
        parts.append(f"Seniority: {seniority}")
    if summary:
        parts.append(summary)
    return "\n".join(parts)
