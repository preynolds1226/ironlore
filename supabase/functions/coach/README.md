# Coach Edge Function

Deploy to Supabase as function name `coach` (URL: `/functions/v1/coach`).

## Environment variables

- `OPENAI_API_KEY` — required
- `OPENAI_MODEL` — optional, default `gpt-4o-mini`

## Request

`POST` with `Authorization: Bearer <user JWT>`.

```json
{
  "systemPrompt": "string",
  "messages": [{ "role": "user" | "assistant", "content": "string" }],
  "context": {
    "userId": "uuid",
    "workoutTemplates": [{ "id": "uuid", "name": "Leg day" }],
    "nutritionToday": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }
  }
}
```

`context` is optional; it helps the model edit the right template and estimate food without inventing UUIDs.

## Response

```json
{
  "reply": "Assistant message to show the user.",
  "proposals": [],
  "content": [{ "text": "same as reply for backward compatibility" }]
}
```

See `src/ai/coachProposals.ts` for proposal shapes validated on the client after apply.
