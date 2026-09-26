# LinkOS system design

> Proposed user experience for the first release. This is a design, not an implemented product. [README.md](README.md) records the technical boundaries.

## Purpose

- LinkOS is a desktop assistant that notices work context, offers timely help, and keeps useful notes without requiring a question each time.
- The user can see what LinkOS thinks they are doing, pause observation, dismiss suggestions, and edit its Markdown (plain-text) memory.
- A screenshot or page change is a signal to consider; it is not automatically a reason to call an AI model or save a memory.

## A normal work session

1. LinkOS starts after sign-in or a manual launch. It loads the local Markdown memory, current tasks, and the last known activity. It checks for incoming file changes from other devices.
2. While the screen is unlocked, Electron captures one screen image per minute and reads basic system status. OCR turns useful visible text into local text. The microphone is optional and can be switched off.
3. The desktop Engine groups screen changes, activity counts, timers, and manual requests into events. It compares images locally and applies trigger rules and cooldowns before using an API.
4. Jev, a quick decision model, answers short questions such as whether the work context changed or whether an assistant run would be useful. If the answer justifies more work, Gemini receives the relevant image, text, and selected memory. A manual user request can call Gemini directly.
5. Gemini may suggest an action or request an approved memory, task, research, or API-read tool. The Engine controls those tool calls and presents the result to the user.
6. The Engine writes useful summaries, notes, or task updates to Markdown. The local gateway syncs those versioned files to the other devices. A conflict is shown for review.

```text
Screen, status, optional speech
  -> local comparison and event rules
  -> Jev decision when useful
  -> Gemini and approved tools when needed
  -> suggestion or Markdown update
  -> Git sync to other devices
```

## Example situations

The time values below are proposed starting settings, not final requirements. The user can change them.

| Situation | Expected LinkOS behavior | What the user sees |
| --- | --- | --- |
| The user works or reads on nearly the same screen for 10 minutes. | Keep the one-minute local screen check. Avoid repeated OCR and Gemini calls for an unchanged image. If there is continued keyboard or mouse activity, Jev may check once whether help is useful. Do not repeat a suggestion during its cooldown. | Current activity stays visible. At most one quiet, dismissible suggestion appears if there is a useful next step. |
| The user rapidly switches pages while researching. | Group changes into one episode. Wait for roughly 30 seconds of a stable screen before deciding whether to classify the activity. A visual change alone never calls Gemini for every page. Without a browser adapter, LinkOS sees the visible page and window status, not a reliable list of URLs. | No burst of notifications. A later suggestion may connect the pages to the current task. |
| The user leaves for lunch with the computer unlocked. | After about 10 minutes without keyboard, mouse, or enabled voice activity, mark the session Away. The minute tick may compare the screen locally, but unchanged images are discarded. Pause microphone capture and new model calls while Away. | Status reads Away; no suggestions or paid AI activity. |
| The computer is locked, asleep, or off. | Pause capture and model calls. When work resumes, continue from current context; do not replay missed timer events or send a backlog of screenshots. | The previous task and any pending result remain available. |
| The user works in a code repository. | Use visible context and files in approved read-only folders to understand the task. Offer an explanation or code suggestion without changing project files. Editor diffs and unsaved code are outside the first release. | A suggestion linked to the current task, with the user retaining control of code changes. |
| The user asks a question or edits a task. | Handle the request immediately. Read only approved folders and the relevant memory; save an accepted task or note change to Markdown. | A response with the source or changed note. |

The system cannot reliably tell whether a still screen means focused reading, thinking, or being stuck. It therefore offers help sparingly and lets the user ask directly.

## Memory, privacy, and cost

- `SOUL.md`, short memory, today's note, and long memory provide the usual context. Older daily, weekly, and monthly notes are searched when relevant; the archive is opened on demand.
- Useful outcomes become editable Markdown. Raw screenshots and audio do not sync between devices. Screenshots expire after three days; raw audio expires one day after transcription.
- The assistant may edit its memory, notes, and task files. Only the user edits `SOUL.md`. It can read only approved folders and cannot run arbitrary local commands or change project code.
- The Engine counts model usage against a target of about HK$80 per month. Local capture and comparisons should continue even when an AI call is skipped.
- The first release does not include a VS Code extension. A later extension can supply code diffs and editor context to the same Engine.

## Decisions still needed before implementation

1. **Capture scope:** Which monitor or applications/windows should be observed or excluded? Site-specific exclusions need a browser adapter; the first release can offer a manual pause instead.
2. **Away and interruption settings:** Confirm the proposed 10-minute Away threshold, 30-second page-settling period, and suggestion cooldown. Decide whether an unlocked Away screen should still be sampled locally.
3. **Speech processing:** When the microphone is enabled, should transcription run locally or send selected audio to Gemini? Decide how long failed or untranscribed audio may remain, and show the choice clearly in settings.
4. **Budget limit:** At the monthly limit, should paid calls stop until the user raises the limit, or should LinkOS only warn?
5. **Git destination:** Should the remote be a bare sync repository, or should the Markdown files also be directly browsable on the remote filesystem?

These choices affect privacy, interruptions, cost, or device setup. Model prompts, exact file splits, and individual trigger rules can be refined during implementation.
