import json
import uuid
from datetime import datetime, timedelta, timezone

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Assessment, Question, CandidateSubmission


# ============================================================
# Request Models
# ============================================================

class CandidateStartRequest(BaseModel):
    candidate_name: str = Field(
        min_length=1,
        max_length=200
    )

    candidate_email: str = Field(
        min_length=3,
        max_length=255
    )


class CandidateSubmissionRequest(BaseModel):
    submission_id: str = Field(
        min_length=1,
        max_length=36
    )

    candidate_name: str = Field(
        min_length=1,
        max_length=200
    )

    candidate_email: str = Field(
        min_length=3,
        max_length=255
    )

    answers: dict[str, str]


# ============================================================
# FastAPI Application
# ============================================================

app = FastAPI(
    title="AI Salesforce Assessment Platform",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Utility Functions
# ============================================================

def utc_now():
    return datetime.now(timezone.utc)


def ensure_utc(value: datetime) -> datetime:
    """
    SQLite may return datetime values without timezone information.
    This function ensures the datetime is treated as UTC.
    """

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


# ============================================================
# Health Endpoints
# ============================================================

@app.get("/")
def home():
    return {
        "application": "AI Salesforce Assessment Platform",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# ============================================================
# Generate Assessment
# ============================================================

@app.post("/api/assessment/generate")
def generate_assessment(payload: dict):

    job_description = payload.get(
        "job_description",
        ""
    ).strip()

    if not job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description is required."
        )

    role_title = str(payload.get("role_title", "")).strip()
    experience_level = str(payload.get("experience_level", "Infer from the job description")).strip()
    interview_type = str(payload.get("interview_type", "balanced")).strip().lower()
    try:
        question_count = int(payload.get("question_count", 2))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Question count must be a number.")

    if question_count < 2 or question_count > 10:
        raise HTTPException(status_code=400, detail="Question count must be between 2 and 10.")

    allowed_interview_types = {"balanced", "technical", "scenario", "behavioral"}
    if interview_type not in allowed_interview_types:
        raise HTTPException(
            status_code=400,
            detail="Interview type must be balanced, technical, scenario, or behavioral."
        )

    role_instruction = (
        f"Use this recruiter-provided role title as the target role: {role_title}."
        if role_title
        else "Infer the primary job role from the job description. Do not assume the role is Salesforce Administrator or Salesforce Developer."
    )

    interview_type_instructions = {
        "balanced": "Create a balanced mix appropriate to the JD: technical/role knowledge, practical scenarios, and behavioral questions only where relevant.",
        "technical": "Focus on technical or functional knowledge explicitly required by the JD, including realistic troubleshooting or implementation questions.",
        "scenario": "Focus on realistic workplace scenarios and ask the candidate to explain decisions, steps, trade-offs, and validation.",
        "behavioral": "Focus on job-related past behavior, collaboration, ownership, prioritization, and stakeholder communication. Use STAR-style prompts where appropriate, while keeping questions tied to the JD."
    }

    prompt = f"""
You are an experienced technical interviewer creating a structured, job-specific interview assessment.

JOB DESCRIPTION (the primary source of truth):
{job_description}

ROLE GUIDANCE:
{role_instruction}
Experience/seniority: {experience_level}
Interview format: {interview_type}
Format instructions: {interview_type_instructions[interview_type]}
Number of questions required: exactly {question_count}
Assessment duration: 30 minutes

REQUIREMENTS:
- Extract the role, key responsibilities, mandatory skills, seniority, and technologies from the supplied job description.
- Generate questions that directly test those requirements. Use role-specific terminology and realistic tasks.
- Do not default to Salesforce Administrator, Salesforce Developer, Apex, or any other role/technology unless the job description or explicit role title supports it.
- For Salesforce roles, distinguish Admin, Developer, QA/Tester, Architect, Sales Cloud, Service Cloud, CPQ, Marketing Cloud, B2B Commerce, Data Cloud, and other specialisms based on the actual JD. Do not mix unrelated specialisms.
- Do not invent employer-specific systems, metrics, products, or responsibilities not present in the JD.
- Match the difficulty to the stated experience/seniority. Include practical application rather than trivia alone.
- Keep every question answerable, unambiguous, and distinct. Cover different important competencies rather than asking the same thing in different words.
- Expected answers must be concise but technically accurate and specific enough to evaluate a response.
- For each question, add 1-2 useful follow_up_questions and 2-4 observable evidence_to_assess items. Evidence must describe what a strong answer demonstrates, not vague traits.
- Return exactly {question_count} questions. Each question must have all required fields.
- Use only these question types: technical, scenario, behavioral, coding, functional.
- Difficulty must be one of: easy, medium, hard.
- Marks must be an integer from 1 to 10.
- Return a JSON object only. Do not wrap it in Markdown or add explanatory text.
- JSON strings must be valid and must not contain unescaped line breaks.

Required JSON shape:
{{
  "role": "Role inferred from the JD",
  "total_duration_minutes": 30,
  "key_skills": ["Skill grounded in the JD"],
  "questions": [
    {{
      "id": 1,
      "topic": "Specific skill or competency from the JD",
      "type": "technical",
      "difficulty": "medium",
      "question": "A clear, role-specific interview question",
      "correct_answer": "Expected answer and key points a good response should include",
      "follow_up_questions": ["A focused follow-up question"],
      "evidence_to_assess": ["An observable technical point expected in a strong answer"],
      "marks": 5
    }}
  ]
}}
"""
    try:

        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "qwen2.5:3b",
                "prompt": prompt,
                "stream": False,
                "format": "json",
                "keep_alive": "10m",
                "options": {
                    "temperature": 0.2,
                    "num_predict": 700
                }
            },
            timeout=120
        )

        response.raise_for_status()

        ai_result = response.json()

        assessment = json.loads(
            ai_result["response"]
        )

    except requests.RequestException as error:

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to connect to Ollama. "
                "Make sure Ollama is running and the model is available. "
                f"Details: {error}"
            )
        )

    except (KeyError, ValueError, TypeError) as error:

        raise HTTPException(
            status_code=502,
            detail=(
                f"The AI returned an invalid response: {error}"
            )
        )

    if not isinstance(assessment, dict):
        raise HTTPException(
            status_code=502,
            detail="The AI response must be a JSON object."
        )

    questions = assessment.get("questions", [])
    if not isinstance(questions, list) or len(questions) != question_count:
        raise HTTPException(
            status_code=502,
            detail=(
                f"The AI must return exactly {question_count} questions. "
                "Please retry generation."
            )
        )

    # Normalize common model variations at the API boundary. The database and
    # frontend use one stable schema regardless of whether Ollama returns
    # question/question_text or correct_answer/expected_answer.
    for index, question in enumerate(questions, start=1):
        if not isinstance(question, dict):
            raise HTTPException(
                status_code=502,
                detail=f"Question {index} must be a JSON object."
            )

        question_text = question.get("question") or question.get("question_text")
        expected_answer = question.get("correct_answer") or question.get("expected_answer")

        if not isinstance(question_text, str) or not question_text.strip():
            raise HTTPException(
                status_code=502,
                detail=f"Question {index} is missing question text."
            )
        if not isinstance(expected_answer, str) or not expected_answer.strip():
            raise HTTPException(
                status_code=502,
                detail=f"Question {index} is missing its expected answer."
            )

        question["question"] = question_text.strip()
        question["correct_answer"] = expected_answer.strip()
        question["id"] = index
        question["topic"] = str(question.get("topic") or "General")
        question["type"] = str(question.get("type") or "technical").lower()
        difficulty = str(question.get("difficulty") or "medium").lower()
        question["difficulty"] = difficulty if difficulty in {"easy", "medium", "hard"} else "medium"
        try:
            marks = int(question.get("marks", 5))
        except (TypeError, ValueError):
            marks = 5
        question["marks"] = min(10, max(1, marks))
        for list_field in ("follow_up_questions", "evidence_to_assess"):
            value = question.get(list_field, [])
            question[list_field] = [str(item).strip() for item in value if str(item).strip()] if isinstance(value, list) else []

    key_skills = assessment.get("key_skills", [])
    assessment["key_skills"] = [str(skill).strip() for skill in key_skills if str(skill).strip()] if isinstance(key_skills, list) else []

    assessment["questions"] = questions
    assessment["role"] = str(assessment.get("role") or role_title or "Salesforce Assessment")
    assessment["total_duration_minutes"] = 30

    db = SessionLocal()

    try:

        new_assessment = Assessment(
            public_id=str(uuid.uuid4()),

            title=assessment.get(
                "role",
                "Salesforce Assessment"
            ),

            job_description=job_description,

            duration_minutes=assessment.get(
                "total_duration_minutes",
                30
            ),

            status="draft"
        )

        db.add(new_assessment)

        db.flush()

        for index, question in enumerate(
            questions,
            start=1
        ):

            if not question.get("question"):

                raise ValueError(
                    "A question is missing its question text."
                )

            if not question.get("correct_answer"):

                raise ValueError(
                    "A question is missing its expected answer."
                )

            db_question = Question(

                assessment_id=new_assessment.id,

                question_number=question.get(
                    "id",
                    index
                ),

                topic=question.get(
                    "topic",
                    "General"
                ),

                question_type=question.get(
                    "type",
                    "technical"
                ),

                difficulty=question.get(
                    "difficulty",
                    "medium"
                ),

                question_text=question[
                    "question"
                ],

                correct_answer=question[
                    "correct_answer"
                ],

                marks=question.get(
                    "marks",
                    5
                )
            )

            db.add(db_question)

        db.commit()

        assessment_id = new_assessment.public_id

        return {

            "message":
                "Assessment generated and saved successfully.",