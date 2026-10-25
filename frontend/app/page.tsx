"use client";

import { useState } from "react";

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [message, setMessage] = useState("");

  function handleGenerate() {
    if (!jobDescription.trim()) {
      setMessage("Please enter a job description first.");
      return;
    }

    setMessage(
      "Job description received! AI assessment generation will be connected in the next phase."
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-700">
            AI Recruitment Platform
          </p>

          <h1 className="text-4xl font-bold text-slate-900">
            Salesforce Technical Assessment
          </h1>

          <p className="mt-3 text-slate-600">
            Generate practical technical assessments from a job description.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            Create an Assessment
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Paste the job description to prepare a tailored assessment.
          </p>

          <label
            htmlFor="jobDescription"
            className="mt-6 block text-sm font-medium text-slate-800"
          >
            Job Description
          </label>

          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(event) => {
              setJobDescription(event.target.value);
              setMessage("");
            }}
            placeholder="Example: Salesforce Developer with 5+ years of experience in Apex, LWC, integrations, Flow, and Agentforce..."
            rows={9}
            className="mt-2 w-full rounded-xl border border-slate-300 p-4 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Assessment duration: 30 minutes
            </p>

            <button
              onClick={handleGenerate}
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Generate Assessment
            </button>
          </div>

          {message && (
            <p
              role="status"
              className="mt-5 rounded-lg bg-blue-50 p-4 text-sm text-blue-800"
            >
              {message}
            </p>
          )}
        </section>

        <footer className="mt-8 text-center text-sm text-slate-500">
          AI Salesforce Assessment Platform · Development Version
        </footer>
      </div>
    </main>
  );
}