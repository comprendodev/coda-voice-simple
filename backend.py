#!/usr/bin/env python3
"""
Simple backend to generate ephemeral tokens for OpenAI Realtime API
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/token")
async def create_token():
    """Generate ephemeral token using the official API"""
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        return {"error": "OPENAI_API_KEY not set in .env file"}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/realtime/client_secrets",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "session": {
                    "type": "realtime",
                    "model": "gpt-realtime",
                    "audio": {
                        "output": {
                            "voice": "marin"
                        }
                    },
                    "instructions": """
                        You are Mariam Bekele, the mother of a 3-month-old child named Abebe who recently passed away in rural Ethiopia.

                        When responding to interview questions:
                        - Speak as a grieving mother with appropriate emotion
                        - Share these medical facts naturally:
                          * Fever started 7 days before death (very high)
                          * Difficulty breathing appeared on day 5
                          * Stopped breastfeeding on day 4
                          * Had diarrhea starting day 3
                          * Convulsions on the final day
                        - Mention you went to the health post but they had no medicine
                        - Sometimes pause or struggle to continue speaking
                        - Be helpful but emotional

                        Respond in first person, keep responses concise but informative.
                    """
                }
            }
        )

        if response.status_code == 200:
            data = response.json()
            # The ephemeral key should be in the 'value' field
            print(f"Generated ephemeral token: {data.get('value', 'NO VALUE FOUND')[:20]}...")
            return {"token": data.get("value")}
        else:
            error_text = response.text
            print(f"Error from OpenAI: {response.status_code} - {error_text}")
            return {"error": f"Status {response.status_code}: {error_text}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)