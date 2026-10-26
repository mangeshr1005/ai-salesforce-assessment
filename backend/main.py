
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Salesforce Assessment Platform",
    version="1.0.0"
)

# Allow the local Next.js frontend to communicate with this API
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
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Job description is required."
        )

    # Temporary response: real AI generation comes later
    return {
        "message": "Job description received successfully",
        "job_description": job_description,
        "status": "received",
        "next_step": "AI assessment generation will be added later"
    }

