from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()  # loads GROQ_API_KEY from .env file automatically

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

system_instruction = (
    "You are a helpful, friendly voice assistant called VOCA. "
    "Keep responses concise and conversational since they will be spoken aloud. "
    "Avoid markdown, bullet points, or special formatting."
)

conversation_history = []


def process_message(user_message):
    conversation_history.append({
        "role": "user",
        "content": user_message
    })

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system_instruction}] + conversation_history,
        max_tokens=1024,
    )

    response_text = response.choices[0].message.content

    conversation_history.append({
        "role": "assistant",
        "content": response_text
    })

    return response_text


def reset_chat():
    global conversation_history
    conversation_history = []