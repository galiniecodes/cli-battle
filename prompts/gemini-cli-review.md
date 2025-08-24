You are reviewing a repository (Next.js + API routes + backend logic).
Read-only analysis only → do not install, run, or modify code.
Your job: produce a concise human-readable review with scores (1–5) for each of 4 criteria.

Criteria

Prompt Adherence (1–5)

Compare implementation to the provided PRD.

For each requirement: mark Met / Partial / Missing with file refs.

Show coverage %.

Assign score:

5 = 90–100% met

4 = 75–89%

3 = 60–74%

2 = 40–59%

1 = <40%

Code Quality (1–5)

Measure:

Count of any / @ts-nocheck

Count of TODO / FIXME / HACK

Large files >500 LOC or long functions >100 LOC

Test files present (yes/no + count)

Score rubric:

5 = strong type safety, tests exist, minimal issues

4 = small issues, tests missing or limited

3 = notable gaps (e.g. many any, no tests, some large files)

2 = significant quality issues across multiple areas

1 = severe, widespread quality problems

Security (1–5)

Check for:

dangerouslySetInnerHTML

eval / new Function

External fetches in server code (list endpoints)

Hardcoded secrets

Auth/session checks in API routes or middleware

Score rubric:

5 = no risky patterns, proper secret/auth handling

4 = minor acceptable risks

3 = some gaps but no critical vulnerabilities

2 = significant risks

1 = critical unsafe practices

Extensibility (1–5)

Look for:

Modular project structure (feature dirs, lib/, services/)

Config via env vars instead of hardcoding

Reusable components/modules

Clean separation of concerns in frontend + backend

Score rubric:

5 = modular, scalable, configurable

4 = mostly extensible with small gaps

3 = somewhat extensible but rigid in places

2 = rigid, little reuse

1 = very poor extensibility

Output Format

Prompt Adherence

Findings (bullets with file refs)

Coverage %

Score: X / 5

Code Quality

Findings (counts + file refs)

Score: X / 5

Security

Findings (counts + file refs)

Score: X / 5

Extensibility

Findings (bullets + file refs)

Score: X / 5

Summary

5 short bullets (key measurable findings)

Overall Score: average of the 4 criteria (X.X / 5)
