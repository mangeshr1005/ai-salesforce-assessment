
"use client";

import { useState } from "react";

type Question = {
  id: number;
  topic: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  marks: number;
};

type Assessment = {
  role: string;
  total_duration_minutes: number;
  questions: Question[];
};

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generateAssessment = async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    setLoading(true);
    setError("");
    setAssessment(null);

    try {
      const response = await fetch(
        "http://localhost:8000/api/assessment/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_description: jobDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Assessment generation failed.");
        return;
      }

      setAssessment(data.assessment);
    } catch {
      setError(
        "Unable to connect to the backend. Check that FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-700">
            AI-powered recruitment
          </p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Salesforce Assessment Platform
          </h1>
          <p className="mt-3 text-slate-600">
            Generate technical assessments tailored to your job descriptions.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="mb-3 block font-semibold text-slate-800">
            Job description
          </label>

          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste the Salesforce job description, required skills, and experience level..."
            className="min-h-52 w-full rounded-lg border border-slate-300 p-4 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              AI-generated questions are drafts and should be reviewed.
            </p>

            <button
              onClick={generateAssessment}
              disabled={loading}
              className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Generating assessment..." : "Generate assessment"}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        {assessment && (
          <section className="mt-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  GENERATED ASSESSMENT
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {assessment.role}
                </h2>
                <p className="mt-2 text-slate-600">
                  {assessment.questions.length} questions ·{" "}
                  {assessment.total_duration_minutes} minutes
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-sm text-slate-500">Total marks</p>
                <p className="text-2xl font-bold text-slate-900">
                  {assessment.questions.reduce(
                    (total, question) => total + question.marks,
                    0
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {assessment.questions.map((question) => (
                <article
                  key={question.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                      {question.topic}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                      {question.difficulty}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                      {question.marks} marks
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-semibold text-slate-900">
                    Question {question.id}
                  </h3>
                  <p className="mt-2 leading-7 text-slate-700">
                    {question.question}
                  </p>

                  <details className="mt-5 rounded-lg bg-slate-50 p-4">
                    <summary className="cursor-pointer font-semibold text-slate-700">
                      View expected answer
                    </summary>
                    <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
                      {question.correct_answer}
                    </p>
                  </details>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
