"use client";

import { useState } from "react";

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generateAssessment = async () => {
    if (!jobDescription.trim()) {
      setResult("Please enter a job description.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const response = await fetch(
        "http://localhost:8000/api/assessment/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_description: jobDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setResult(data.detail || "Something went wrong.");
        return;
      }

      setResult(
        `Backend response: ${data.message}\n\nStatus: ${data.status}`
      );
    } catch (error) {
      setResult(
        "Unable to connect to the backend. Make sure the FastAPI server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold">
          AI Salesforce Assessment Platform
        </h1>

        <p className="mb-8 text-gray-600">
          Create AI-powered Salesforce technical assessments from job
          descriptions.
        </p>

        <div className="rounded-lg bg-white p-6 shadow">
          <label className="mb-2 block text-lg font-semibold">
            Job Description
          </label>

          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the Salesforce job description here..."
            className="min-h-64 w-full rounded-md border border-gray-300 p-4 outline-none focus:border-blue-500"
          />

          <button
            onClick={generateAssessment}
            disabled={loading}
            className="mt-4 rounded-md bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? "Sending..." : "Generate Assessment"}
          </button>

          {result && (
            <div className="mt-6 whitespace-pre-line rounded-md bg-gray-100 p-4">
              {result}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}