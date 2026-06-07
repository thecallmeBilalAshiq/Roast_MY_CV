import asyncio
import json
from typing import Any, AsyncGenerator, Dict

from openai import AsyncOpenAI

from models import Intensity
from services.db import get_settings


PROMPTS = {
    Intensity.mild: "You are an encouraging career coach. Be funny, kind, specific, and practical.",
    Intensity.medium: "You are an honest recruiter who does not sugarcoat weak CVs. Be witty, direct, and useful.",
    Intensity.brutal: "You are Gordon Ramsay reviewing a CV: savage, theatrical, and painfully true, but never hateful.",
}


def fallback_result(cv_text: str, intensity: Intensity) -> Dict[str, Any]:
    short = " ".join(cv_text.split())[:160]
    spice = {
        Intensity.mild: "This CV has potential, but it is currently whispering when it needs to speak clearly.",
        Intensity.medium: "This CV reads like it was assembled during a calendar reminder called 'panic'.",
        Intensity.brutal: "This CV walked into the kitchen undercooked and somehow blamed the printer.",
    }[intensity]
    return {
        "roast": f"{spice} The content is there, but the impact needs sharper numbers, cleaner structure, and fewer vague claims. Right now the strongest line might be: '{short}...' and even that needs a gym membership.",
        "scores": {"skills": 6, "experience": 5, "formatting": 6, "impact": 4, "overall": 5},
        "serious_feedback": [
            "Add measurable outcomes to your experience bullets.",
            "Put your strongest skills and projects near the top.",
            "Replace generic responsibilities with concrete achievements.",
        ],
        "section_feedback": {
            "summary": ["Make the summary specific to the role you want."],
            "experience": ["Use action verbs and numbers for each major bullet."],
            "skills": ["Group skills by category and remove anything outdated."],
            "projects": ["Explain the problem, tools used, and result."],
            "education": ["Keep this concise unless you are early career."],
        },
        "verdict": "Promising ingredients, questionable plating.",
    }


async def generate_roast(cv_text: str, sections: Dict[str, str], intensity: Intensity) -> Dict[str, Any]:
    settings = get_settings()
    if not settings.openai_api_key:
        return fallback_result(cv_text, intensity)

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    user_prompt = {
        "task": "Roast this CV with humor and useful career advice.",
        "cv_text": cv_text[:22000],
        "sections": sections,
        "required_json_schema": {
            "roast": "string",
            "scores": {"skills": "1-10", "experience": "1-10", "formatting": "1-10", "impact": "1-10", "overall": "1-10"},
            "serious_feedback": ["tip1", "tip2", "tip3"],
            "section_feedback": {"summary": ["tips"], "experience": ["tips"], "skills": ["tips"], "projects": ["tips"], "education": ["tips"]},
            "verdict": "one funny sentence",
        },
    }

    response = await client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": PROMPTS[intensity]},
            {"role": "user", "content": json.dumps(user_prompt)},
        ],
        temperature=0.85,
    )
    content = response.choices[0].message.content or "{}"
    parsed = json.loads(content)
    return normalize_result(parsed, cv_text, intensity)


def normalize_result(result: Dict[str, Any], cv_text: str, intensity: Intensity) -> Dict[str, Any]:
    fallback = fallback_result(cv_text, intensity)
    merged = {**fallback, **result}
    scores = {**fallback["scores"], **merged.get("scores", {})}
    merged["scores"] = {key: max(1, min(10, int(value))) for key, value in scores.items()}
    if not isinstance(merged.get("serious_feedback"), list):
        merged["serious_feedback"] = fallback["serious_feedback"]
    if not isinstance(merged.get("section_feedback"), dict):
        merged["section_feedback"] = fallback["section_feedback"]
    return merged


async def stream_words(result: Dict[str, Any]) -> AsyncGenerator[str, None]:
    words = result["roast"].split(" ")
    for word in words:
        yield json.dumps({"type": "word", "value": word + " "})
        await asyncio.sleep(0.025)
    yield json.dumps({"type": "result", "value": result})
