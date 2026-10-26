from pathlib import Path
import re
import shutil

path = Path("main.py")
source = path.read_text(encoding="utf-8")

endpoint_match = re.search(
    r"(?m)^@app\.post\(\"/api/recruiter/submission/\{submission_id\}/evaluate\"\)\s*\ndef\s+\w+",
    source
)
if not endpoint_match:
    raise SystemExit("STOP: Evaluation endpoint not found. No changes made.")

start = endpoint_match.start()
end_match = re.search(r"(?m)^@app\.", source[endpoint_match.end():])
end = endpoint_match.end() + end_match.start() if end_match else len(source)
endpoint = source[start:end]

loop_start = endpoint.find("        question_results = []")
percentage_match = re.search(r"(?m)^        percentage = \(", endpoint)

if loop_start < 0 or not percentage_match or percentage_match.start() <= loop_start:
    raise SystemExit("STOP: Expected evaluation loop boundaries not found. No changes made.")

new_loop = '''        question_results = []
        total_awarded = 0
        total_possible = 0
        overall_strengths = []
        overall_weaknesses = []

        for question in questions:
            question_number = question.question_number
            candidate_answer = candidate_answers.get(
                str(question.id),
                candidate_answers.get(str(question_number), "")
            )
            candidate_answer = candidate_answer if isinstance(candidate_answer, str) else str(candidate_answer or "")
            result = results_by_number.get(question_number, {})
            maximum = max(0, int(question.marks or 0))

            try:
                awarded = int(float(result.get("marks_awarded", 0)))
            except (TypeError, ValueError):
                awarded = 0

            feedback = str(result.get("feedback", "") or "").strip()
            strengths = result.get("strengths", [])
            improvements = result.get("improvements", [])

            if isinstance(strengths, str):
                strengths = [strengths] if strengths.strip() else []
            if not isinstance(strengths, list):
                strengths = []
            if isinstance(improvements, str):
                improvements = [improvements] if improvements.strip() else []
            if not isinstance(improvements, list):
                improvements = []

            if not candidate_answer.strip():
                status = "Blank"
                awarded = 0
                feedback = "The candidate left this answer blank."
                strengths = []
                improvements = [
                    "Attempt the question and explain the relevant Salesforce or Apex concepts."
                ]
            else:
                awarded = max(0, min(awarded, maximum))
                if awarded == 0:
                    status = "Incorrect"
                    if not feedback or "blank answer" in feedback.lower() or "empty response" in feedback.lower():
                        feedback = "The response does not demonstrate a correct solution to the question."
                    if not improvements:
                        improvements = [
                            "Review the required Salesforce concepts and provide a technically accurate explanation or working code."
                        ]
                elif awarded < maximum:
                    status = "Partially Correct"
                    if not improvements:
                        improvements = [
                            "Add the missing technical details and explain why the solution works."
                        ]
                else:
                    status = "Correct"
                    if not feedback:
                        feedback = "The answer received full marks based on the evaluator's scoring."

            total_awarded += awarded
            total_possible += maximum

            if status == "Correct":
                overall_strengths.append(
                    f"Question {question_number} ({question.topic}): demonstrated a correct answer."
                )
            elif status == "Partially Correct":
                overall_weaknesses.append(
                    f"Question {question_number} ({question.topic}): the answer was only partially correct. {feedback}"
                )
            else:
                overall_weaknesses.append(
                    f"Question {question_number} ({question.topic}): {status.lower()}. {feedback}"
                )

            question_results.append({
                "question_number": question_number,
                "topic": question.topic,
                "question": question.question_text,
                "candidate_answer": candidate_answer,
                "answer_status": status,
                "marks_awarded": awarded,
                "maximum_marks": maximum,
                "feedback": feedback,
                "strengths": strengths,
                "improvements": improvements
            })

'''
endpoint = endpoint[:loop_start] + new_loop + endpoint[percentage_match.start():]

endpoint = endpoint.replace(
    '"strengths": ai_result.get("strengths", []),',
    '"strengths": overall_strengths or ai_result.get("strengths", []),'
)
endpoint = endpoint.replace(
    '"weaknesses": ai_result.get("weaknesses", []),',
    '"weaknesses": overall_weaknesses or ai_result.get("weaknesses", []),'
)

updated = source[:start] + endpoint + source[end:]
if updated == source:
    raise SystemExit("STOP: No changes were applied.")

backup = path.with_name("main.py.before_evaluation_patch.bak")
shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")
print(f"Updated {path}; backup saved as {backup}")
