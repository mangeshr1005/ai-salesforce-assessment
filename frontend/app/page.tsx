
"use client";

import { useState } from "react";

type Question = {
  id: number;
  topic: string;
  type: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  follow_up_questions?: string[];
  evidence_to_assess?: string[];
  marks: number;
};

type Assessment = {
  role: string;
  total_duration_minutes: number;
  questions: Question[];
  key_skills?: string[];
};

type Submission = {
  submission_id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  submitted_at: string | null;
};

type SubmissionList = {
  assessment_id: string;
  assessment_title: string;
  total_submissions: number;
  submissions: Submission[];
};

type ResultQuestion = {
  question_id: number;
  question_number: number;
  topic: string;
  question_type: string;
  difficulty: string;
  question_text: string;
  candidate_answer: string;
  expected_answer: string;
  marks: number;
};

type SubmissionDetails = {
  submission_id: string;
  assessment_id: string;
  assessment_title: string;
  candidate: {
    name: string;
    email: string;
  };
  status: string;
  started_at: string | null;
  expires_at: string | null;
  submitted_at: string | null;
  questions: ResultQuestion[];
};


type EvaluationResult = {
  submission_id: string;
  candidate: string;
  assessment_title: string;
  evaluation: {
    total_marks_awarded: number;
    total_possible_marks: number;
    percentage: number;
    question_results: {
      question_number: number;
      topic: string;
      question: string;
      candidate_answer: string;
      answer_status: string;
      marks_awarded: number;
      maximum_marks: number;
      feedback: string;
      strengths: string[];
      improvements: string[];
    }[];
    strengths: string[];
    weaknesses: string[];
    summary: string;
    recommendation: string;
  };
};
const API_URL = "http://127.0.0.1:8001";

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    submitted: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    expired: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        colors[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function Home() {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const [jobDescription, setJobDescription] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Infer from the job description");
  const [interviewType, setInterviewType] = useState("balanced");
  const [questionCount, setQuestionCount] = useState(5);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [assessmentId, setAssessmentId] = useState("");
  const [submissionList, setSubmissionList] =
    useState<SubmissionList | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionDetails | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");

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
        `${API_URL}/api/assessment/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_description: jobDescription,
            role_title: roleTitle,
            experience_level: experienceLevel,
            interview_type: interviewType,
            question_count: questionCount,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Assessment generation failed.");
        return;
      }

      setAssessment(data.assessment);

      if (data.assessment_id) {
        setAssessmentId(data.assessment_id);
      }
    } catch {
      setError(
        "Unable to connect to the backend. Check that FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    if (!assessmentId.trim()) {
      setResultsError("Please enter an assessment ID.");
      return;
    }

    setResultsLoading(true);
    setResultsError("");
    setSubmissionList(null);
    setSelectedSubmission(null);

    try {
      const response = await fetch(
        `${API_URL}/api/recruiter/assessment/${encodeURIComponent(
          assessmentId.trim()
        )}/submissions`
      );

      const data = await response.json();

      if (!response.ok) {
        setResultsError(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to load submissions."
        );
        return;
      }

      setSubmissionList(data);
    } catch {
      setResultsError(
        "Unable to connect to the backend. Check that FastAPI is running."
      );
    } finally {
      setResultsLoading(false);
    }
  };

  const viewSubmission = async (submissionId: string) => {
    setResultsLoading(true);
    setResultsError("");
    setSelectedSubmission(null);

    try {
      const response = await fetch(
        `${API_URL}/api/recruiter/submission/${encodeURIComponent(
          submissionId
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        setResultsError(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to load candidate details."
        );
        return;
      }

      setSelectedSubmission(data);
    } catch {
      setResultsError(
        "Unable to connect to the backend. Check that FastAPI is running."
      );
    } finally {
      setResultsLoading(false);
    }
  };

  const evaluateCandidate = async (submissionId: string) => {
    setEvaluating(true);
    setResultsError("");
    setEvaluation(null);

    try {
      const response = await fetch(
        `${API_URL}/api/recruiter/submission/${encodeURIComponent(submissionId)}/evaluate`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        setResultsError(
          typeof data.detail === "string"
            ? data.detail
            : "Candidate evaluation failed."
        );
        return;
      }

      setEvaluation(data as EvaluationResult);
    } catch {
      setResultsError(
        "Unable to connect to the backend. Check that FastAPI and Ollama are running."
      );
    } finally {
      setEvaluating(false);
    }
  };
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-700">
            AI-powered recruitment
          </p>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Salesforce Assessment Platform
          </h1>
          <p className="mt-3 text-slate-600">
            Generate technical assessments and review candidate submissions.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            1. Generate an assessment
          </h2>

          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block font-semibold text-slate-800">
                Job title / target role (optional)
              </label>
              <input
                value={roleTitle}
                onChange={(event) => setRoleTitle(event.target.value)}
                placeholder="e.g. Salesforce QA Lead, CPQ Consultant, LWC Developer"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-slate-500">Leave blank to infer the role from the JD.</p>
            </div>
            <div>
              <label className="mb-2 block font-semibold text-slate-800">
                Experience / seniority
              </label>
              <select
                value={experienceLevel}
                onChange={(event) => setExperienceLevel(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option>Infer from the job description</option>
                <option>Entry level (0–2 years)</option>
                <option>Mid level (3–5 years)</option>
                <option>Senior (6–9 years)</option>
                <option>Lead / Architect (10+ years)</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block font-semibold text-slate-800">
                Interview type
              </label>
              <select
                value={interviewType}
                onChange={(event) => setInterviewType(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="balanced">Balanced interview</option>
                <option value="technical">Technical / functional knowledge</option>
                <option value="scenario">Practical scenarios</option>
                <option value="behavioral">Behavioral / STAR questions</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block font-semibold text-slate-800">
                Number of questions
              </label>
              <select
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value={2}>2 questions (quick test)</option>
                <option value={4}>4 questions</option>
                <option value={5}>5 questions (balanced, 30 minutes)</option>
                <option value={6}>6 questions</option>
                <option value={8}>8 questions</option>
                <option value={10}>10 questions</option>
              </select>
            </div>
          </div>

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
          <section className="mt-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  GENERATED ASSESSMENT
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {assessment.role}
                </h2>
                {assessment.key_skills && assessment.key_skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {assessment.key_skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-slate-600">
                  {assessment.questions.length} questions Â·{" "}
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

            {assessment.questions.map((question, index) => (
              <article
                key={question.id ?? index}
                className="mb-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
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
                  Question {index + 1}
                </h3>
                <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
                  {question.question}
                </p>

                {question.follow_up_questions && question.follow_up_questions.length > 0 && (
                  <details className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                    <summary className="cursor-pointer font-semibold text-slate-700">
                      Suggested follow-up questions
                    </summary>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                      {question.follow_up_questions.map((followUp, followUpIndex) => (
                        <li key={followUpIndex}>{followUp}</li>
                      ))}
                    </ul>
                  </details>
                )}

                {question.evidence_to_assess && question.evidence_to_assess.length > 0 && (
                  <details className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                    <summary className="cursor-pointer font-semibold text-slate-700">
                      Evidence to look for in a strong answer
                    </summary>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                      {question.evidence_to_assess.map((evidence, evidenceIndex) => (
                        <li key={evidenceIndex}>{evidence}</li>
                      ))}
                    </ul>
                  </details>
                )}

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
          </section>
        )}

        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            2. Recruiter results
          </h2>
          <p className="mt-2 text-slate-600">
            Enter an assessment ID to view candidate submissions and inspect
            their responses.
          </p>

          <label className="mb-2 mt-5 block font-semibold text-slate-800">
            Assessment ID
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={assessmentId}
              onChange={(event) => setAssessmentId(event.target.value)}
              placeholder="Paste the assessment ID"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              onClick={loadSubmissions}
              disabled={resultsLoading}
              className="rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {resultsLoading ? "Loading..." : "Load submissions"}
            </button>
          </div>

          {resultsError && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {resultsError}
            </p>
          )}

          {submissionList && (
            <div className="mt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {submissionList.assessment_title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Assessment ID: {submissionList.assessment_id}
                  </p>
                </div>
                <p className="rounded-lg bg-blue-50 px-4 py-2 font-semibold text-blue-800">
                  {submissionList.total_submissions} submissions
                </p>
              </div>

              {submissionList.submissions.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-slate-600">
                  No candidates have started this assessment yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Candidate</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">
                          Submitted at
                        </th>
                        <th className="px-4 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {submissionList.submissions.map((submission) => (
                        <tr key={submission.submission_id}>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-900">
                              {submission.candidate_name}
                            </p>
                            <p className="mt-1 text-slate-500">
                              {submission.candidate_email}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={submission.status} />
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {formatDate(submission.submitted_at)}
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() =>
                                viewSubmission(submission.submission_id)
                              }
                              disabled={resultsLoading}
                              className="font-semibold text-blue-700 hover:text-blue-900 disabled:text-slate-400"
                            >
                              View details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        {selectedSubmission && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
                  Candidate report
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {selectedSubmission.candidate.name}
                </h2>
                <p className="mt-1 text-slate-600">
                  {selectedSubmission.candidate.email}
                </p>
                <button
                  onClick={() => evaluateCandidate(selectedSubmission.submission_id)}
                  disabled={evaluating || selectedSubmission.status !== "submitted"}
                  className="mt-4 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {evaluating ? "Evaluating candidate..." : "Evaluate Candidate"}
                </button>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedSubmission.assessment_title}
                </p>
              </div>
              <StatusBadge status={selectedSubmission.status} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Started</p>
                <p className="mt-1 font-medium text-slate-900">
                  {formatDate(selectedSubmission.started_at)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Deadline</p>
                <p className="mt-1 font-medium text-slate-900">
                  {formatDate(selectedSubmission.expires_at)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Submitted</p>
                <p className="mt-1 font-medium text-slate-900">
                  {formatDate(selectedSubmission.submitted_at)}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {selectedSubmission.questions.map((question) => (
                <article
                  key={question.question_id}
                  className="rounded-lg border border-slate-200 p-5"
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

                  <h3 className="mt-4 font-bold text-slate-900">
                    Question {question.question_number}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
                    {question.question_text}
                  </p>

                  <div className="mt-4 rounded-lg bg-blue-50 p-4">
                    <h4 className="font-semibold text-blue-900">
                      Candidate answer
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
                      {question.candidate_answer.trim() ||
                        "No answer was recorded for this question."}
                    </p>
                  </div>

                  <details className="mt-4 rounded-lg bg-slate-50 p-4">
                    <summary className="cursor-pointer font-semibold text-slate-700">
                      View expected answer
                    </summary>
                    <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
                      {question.expected_answer}
                    </p>
                  </details>
                </article>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 text-center text-sm text-slate-500">
          Salesforce Assessment Platform Â· Recruiter workspace
        </footer>
      </div>
    
        {evaluation && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">
              AI Evaluation Report
            </h2>
            <p className="mt-2 text-slate-600">
              Candidate: {evaluation.candidate} · {evaluation.assessment_title}
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Score</p>
                <p className="text-2xl font-bold">
                  {evaluation.evaluation.total_marks_awarded}/
                  {evaluation.evaluation.total_possible_marks}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Percentage</p>
                <p className="text-2xl font-bold">
                  {evaluation.evaluation.percentage}%
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Recommendation</p>
                <p className="text-xl font-bold">
                  {evaluation.evaluation.recommendation}
                </p>
              </div>
            </div>

            <h3 className="mt-6 text-lg font-bold">Question-wise feedback</h3>
            {evaluation.evaluation.question_results.map((result) => (
              <article
                key={result.question_number}
                className="mt-4 rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h4 className="font-semibold">
                    Question {result.question_number}: {result.topic}
                  </h4>
                  <span className="font-semibold">
                    {result.marks_awarded}/{result.maximum_marks} marks
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-slate-700">
                  {result.question}
                </p>
                <p className="mt-3 font-semibold">Candidate answer</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-600">
                  {result.candidate_answer || "No answer provided."}
                </p>
                <p className="mt-3 font-semibold">Feedback</p>
                <p className="mt-1 text-slate-600">{result.feedback}</p>
                {result.strengths.length > 0 && (
                  <div className="mt-3">
                    <p className="font-semibold">Strengths</p>
                    <ul className="list-disc pl-5">
                      {result.strengths.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {result.improvements.length > 0 && (
                  <div className="mt-3">
                    <p className="font-semibold">Areas to improve</p>
                    <ul className="list-disc pl-5">
                      {result.improvements.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </article>
            ))}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="font-bold">Overall strengths</h3>
                {evaluation.evaluation.strengths.length
                  ? <ul className="list-disc pl-5">{evaluation.evaluation.strengths.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  : <p className="mt-1 text-slate-500">None identified.</p>}
              </div>
              <div>
                <h3 className="font-bold">Weaknesses</h3>
                {evaluation.evaluation.weaknesses.length
                  ? <ul className="list-disc pl-5">{evaluation.evaluation.weaknesses.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  : <p className="mt-1 text-slate-500">None identified.</p>}
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-slate-50 p-4">
              <h3 className="font-bold">AI summary</h3>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">
                {evaluation.evaluation.summary}
              </p>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Review the candidate's actual responses before making a hiring decision.
            </p>
          </section>
        )}
</main>
  );
}



