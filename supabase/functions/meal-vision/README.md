# meal-vision

POST `/meal-vision` with `Authorization: Bearer <user_jwt>` and JSON body:

```json
{
  "imageBase64": "<base64 without data: prefix>",
  "mimeType": "image/jpeg"
}
```

Requires `OPENAI_API_KEY` (same secret as `coach`). Optional: `OPENAI_MEAL_VISION_MODEL` (default `gpt-4o-mini`).

Deploy:

```bash
supabase functions deploy meal-vision
```
