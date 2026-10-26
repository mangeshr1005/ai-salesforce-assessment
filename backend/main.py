
import json
import requests

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/")
def home():
    return {
        "application": "AI Salesforce Assessment Platform",
        "status": "running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/api/assessment/generate")
def generate_assessment(payload: dict):
    job_description = payload.get("job_description", "").strip()

    if not job_description:
        raise HTTPException(
            status_code=400,
            detail="Job description is required."
        )

    prompt = f"""
Create exactly 2 Salesforce interview questions for this job description:
{job_description}

Return valid JSON only:
{{
  "role": "Salesforce Developer",
  "total_duration_minutes": 30,
  "questions": [
    {{
      "id": 1,
      "topic": "Apex",
      "type": "technical",
      "difficulty": "medium",
      "question": "Question text",
      "correct_answer": "Expected answer",
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
        assessment = json.loads(ai_result["response"])

        return {
            "message": "Assessment generated successfully",
            "status": "success",
            "assessment": assessment
        }

    except requests.RequestException as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to connect to Ollama. "
                "Make sure Ollama is running and the model is available. "
                f"Details: {error}"
            )
        )

    except (KeyError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"The AI returned an invalid response: {error}"
        )
