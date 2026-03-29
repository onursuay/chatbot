import requests

API_KEY = "sk_710c6f9c44a9595fbc6faf1f5fd85f0d96e2a17e73639ebb"
AGENT_ID = "jbJMQWv1eS4YjQ6PCcn6"
PHONE_NUMBER = "+908503074720"

response = requests.post(
    f"https://api.elevenlabs.io/v1/convai/twilio/outbound_call",
    headers={
        "xi-api-key": API_KEY,
        "Content-Type": "application/json"
    },
    json={
        "agent_id": AGENT_ID,
        "agent_phone_number_id": PHONE_NUMBER,
        "to_phone_number": "+905321234567"  # Senin numaranı buraya koy
    }
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
