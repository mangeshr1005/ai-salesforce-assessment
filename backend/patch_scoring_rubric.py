from pathlib import Path
import re
import shutil

path = Path("main.py")
source = path.read_text(encoding="utf-8")

decorator = '@app.post("/api/recruiter/submission/{submission_id}/evaluate")'
start = source.find(decorator)

if start < 0:
    raise SystemExit("STOP: Evaluation endpoint not found. No changes made.")

next_endpoint = re.search(r"(?m)^@app\.", source[start + len(decorator):])
end = start + len(decorator) + next_endpoint.start() if next_endpoint else len(source)
endpoint = source[start:end]

if "SCORING_RUBRIC_V2" in endpoint:
    raise SystemExit("The scoring rubric is already installed. No changes made.")

request_match = re.search(r"(?m)^([ \t]*)response\s*=\s*requests\.post\(", endpoint)
if not request_match:
    raise SystemExit("STOP: Could not find the evaluator's Ollama request. No changes made.")

indent = request_match.group(1)
rubric = '''SCORING_RUBRIC_V2 = """
Apply this scoring rubric independently to every candidate answer.
Preserve the existing required JSON response schema.

SCORING:
- Award an integer from 0 through the question's maximum marks.
- 0 marks: blank, irrelevant, or technically incorrect answer with no meaningful correct concepts.
- Partial marks: award credit for each relevant, correct technical concept even if the answer is incomplete.
- Full marks: the answer correctly addresses the requirements with sound technical reasoning or working code.
- Never award marks merely because an answer is long or uses technical terminology.
- Do not require exact wording when the candidate explains the correct concept in their own words.
- For code, assess syntax, logic, the requested behavior, null handling where relevant, and Salesforce best practices.
- For Apex triggers, consider bulkification, correct trigger context, SOQL/DML usage, and whether the code meets the stated requirement.
- For duplicate validation, consider querying for existing records, handling the current record on update, and using addError() or another valid enforcement approach.
- Do not demand every best practice for full marks unless the question requires it.
- Explain exactly which parts are correct, incorrect, or missing.
- Suggest a concrete correction or missing technical concept in improvements.
- Do not invent candidate statements or claim code was tested when it was not.
- A non-empty answer is not automatically correct. An irrelevant answer should receive zero.
- Keep marks_awarded within the maximum marks. Use feedback, strengths, and improvements consistent with the awarded score.
"""
prompt = prompt + "\\n\\n" + SCORING_RUBRIC_V2

'''
endpoint = endpoint[:request_match.start()] + rubric + endpoint[request_match.start():]

updated = source[:start] + endpoint + source[end:]
backup = path.with_name("main.py.before_scoring_rubric.bak")
shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")
print(f"Scoring rubric added. Backup: {backup}")
