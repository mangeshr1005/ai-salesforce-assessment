"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Question = {
  id: number;
  topic: string;
  type: string;
  difficulty: string;
  question: string;
  marks: number;
};

type AssessmentData = {
  assessment_id: string;
  title: string;
  duration_minutes: number;
  questions: Question[];
};

function CandidateAssessmentContent() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;

  const [assessment, setAssessment] =
    useState<AssessmentData | null>(null);

  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [submissionId, setSubmissionId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [submitMessage, setSubmitMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------
  // Load assessment
  // --------------------------------

  useEffect(() => {
    async function loadAssessment() {
      try {
        const response = await fetch(
          `http://localhost:8000/api/candidate/assessment/${assessmentId}`
        );

        if (!response.ok) {
          throw new Error("Assessment not found.");
        }

        const data: AssessmentData = await response.json();

        setAssessment(data);
      } catch {
        setError(
          "Unable to load this assessment. Please check the link."
        );
      } finally {
        setLoading(false);
      }
    }

    if (assessmentId) {
      loadAssessment();
    }
  }, [assessmentId]);

  // --------------------------------
  // Countdown timer
  // --------------------------------

  useEffect(() => {
    if (!started || !expiresAt || submitted) {
      return;
    }

    function updateTimer() {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();

      const difference = Math.max(
        0,
        Math.ceil((expiry - now) / 1000)
      );

      setRemainingSeconds(difference);

      if (difference <= 0 && !submitting) {
        handleSubmit(true);
      }
    }

    updateTimer();

    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [started, expiresAt, submitted]);

  // --------------------------------
  // Format timer
  // --------------------------------

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remaining
    ).padStart(2, "0")}`;
  }

  // --------------------------------
  // Start assessment
  // --------------------------------

  async function handleStartAssessment() {
    if (!assessment) {
      return;
    }

    if (!candidateName.trim() || !candidateEmail.trim()) {
      setSubmitMessage(
        "Please enter your name and email."
      );
      return;
    }

    const email = candidateEmail.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubmitMessage(
        "Please enter a valid email address."
      );
      return;
    }

    setSubmitMessage("");

    try {
      const response = await fetch(
        `http://localhost:8000/api/candidate/assessment/${assessmentId}/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidate_name: candidateName.trim(),
            candidate_email: email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to start assessment."
        );
      }

      setSubmissionId(data.submission_id);
      setExpiresAt(data.expires_at);

      const expiry = new Date(
        data.expires_at
      ).getTime();

      const now = Date.now();

      setRemainingSeconds(
        Math.max(
          0,
          Math.ceil((expiry - now) / 1000)
        )
      );

      setStarted(true);
    } catch (error) {
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "Unable to start assessment."
      );
    }
  }

  // --------------------------------
  // Submit assessment
  // --------------------------------

  async function handleSubmit(
    automatic = false
  ) {
    if (
      !assessment ||
      submitting ||
      submitted ||
      !submissionId
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitMessage("");

    try {
      const response = await fetch(
        `http://localhost:8000/api/candidate/assessment/${assessmentId}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submission_id: submissionId,
            candidate_name: candidateName.trim(),
            candidate_email: candidateEmail.trim(),
            answers,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Assessment submission failed."
        );
      }

      setSubmitted(true);
      setRemainingSeconds(0);

      if (automatic) {
        setSubmitMessage(
          "Time expired. Your assessment was submitted automatically."
        );
      } else {
        setSubmitMessage(
          "Your answers have been saved successfully."
        );
      }
    } catch (error) {
      setSubmitMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit assessment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // --------------------------------
  // Loading
  // --------------------------------

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        Loading assessment...
      </main>
    );
  }

  // --------------------------------
  // Error
  // --------------------------------

  if (error || !assessment) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-red-600">
        {error || "Assessment not found."}
      </main>
    );
  }

  // --------------------------------
  // Submitted
  // --------------------------------

  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center">
        <div className="mb-6 text-5xl text-green-600">
          ✓
        </div>

        <h1 className="mb-4 text-3xl font-bold">
          Assessment Submitted Successfully!
        </h1>

        <p className="mb-3 text-gray-700">
          Thank you, {candidateName}. Your responses
          have been recorded.
        </p>

        <p className="mb-6 text-gray-600">
          {submitMessage}
        </p>

        <div className="rounded-lg border p-4 text-left">
          <p className="mb-2 font-semibold">
            Submission Details
          </p>

          <p>
            <strong>Assessment:</strong>{" "}
            {assessment.title}
          </p>

          <p>
            <strong>Candidate:</strong>{" "}
            {candidateName}
          </p>

          <p className="break-all">
            <strong>Reference ID:</strong>{" "}
            {submissionId}
          </p>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          You may now close this page.
        </p>
      </main>
    );
  }

  // --------------------------------
  // Candidate information screen
  // --------------------------------

  if (!started) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="mb-4 text-3xl font-bold">
          {assessment.title}
        </h1>

        <p className="mb-6 text-gray-600">
          Duration: {assessment.duration_minutes} minutes
        </p>

        <label className="mb-2 block font-medium">
          Full Name
        </label>

        <input
          className="mb-4 w-full rounded border p-3"
          value={candidateName}
          onChange={(e) =>
            setCandidateName(e.target.value)
          }
          placeholder="Enter your full name"
          autoComplete="name"
        />

        <label className="mb-2 block font-medium">
          Email Address
        </label>

        <input
          className="mb-4 w-full rounded border p-3"
          type="email"
          value={candidateEmail}
          onChange={(e) =>
            setCandidateEmail(e.target.value)
          }
          placeholder="Enter your email"
          autoComplete="email"
        />

        {submitMessage && (
          <p
            className="mb-4 text-red-600"
            role="alert"
          >
            {submitMessage}
          </p>
        )}

        <button
          className="rounded bg-blue-600 px-6 py-3 text-white disabled:opacity-50"
          disabled={
            !candidateName.trim() ||
            !candidateEmail.trim()
          }
          onClick={handleStartAssessment}
        >
          Start Assessment
        </button>
      </main>
    );
  }

  // --------------------------------
  // Active assessment
  // --------------------------------

  return (
    <main className="mx-auto max-w-3xl p-8">

      {/* Header */}

      <div className="mb-8 flex items-center justify-between border-b pb-4">

        <div>
          <h1 className="text-3xl font-bold">
            {assessment.title}
          </h1>

          <p className="mt-2 text-gray-600">
            Candidate: {candidateName}
          </p>
        </div>

        {/* Timer */}

        <div
          className={`rounded-lg border px-5 py-3 text-center ${
            remainingSeconds <= 300
              ? "border-red-500 text-red-600"
              : "border-gray-300"
          }`}
        >
          <p className="text-xs font-medium uppercase">
            Time Remaining
          </p>

          <p className="text-2xl font-bold">
            {formatTime(remainingSeconds)}
          </p>
        </div>
      </div>

      {/* Questions */}

      {assessment.questions.map((question) => (
        <section
          key={question.id}
          className="mb-6 rounded-lg border p-5"
        >
          <p className="mb-2 text-sm text-gray-500">
            Question {question.id} ·{" "}
            {question.topic} ·{" "}
            {question.difficulty} ·{" "}
            {question.marks} marks
          </p>

          <h2 className="mb-4 font-semibold">
            {question.question}
          </h2>

          <textarea
            className="w-full rounded border p-3"
            rows={6}
            placeholder="Type your answer here..."
            value={
              answers[String(question.id)] || ""
            }
            onChange={(e) =>
              setAnswers((previous) => ({
                ...previous,
                [String(question.id)]:
                  e.target.value,
              }))
            }
            disabled={submitting}
          />
        </section>
      ))}

      {submitMessage && (
        <p
          className="mb-4 text-red-600"
          role="alert"
        >
          {submitMessage}
        </p>
      )}

      <button
        className="rounded bg-blue-600 px-6 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => handleSubmit(false)}
        disabled={submitting}
      >
        {submitting
          ? "Submitting..."
          : "Submit Assessment"}
      </button>

    </main>
  );
}
export default function CandidateAssessmentPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading assessment...</div>}>
      <CandidateAssessmentContent />
    </Suspense>
  );
}