from dotenv import load_dotenv
import os

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomOutputOptions
from livekit.plugins import (
    gladia,
)

load_dotenv(".env")

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions="") # Agent instructions of your choice


async def entrypoint(ctx: agents.JobContext):
    session = AgentSession(
        stt=gladia.STT(
            api_key=os.getenv('GLADIA_API_KEY'),
            interim_results=True,
        ),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_output_options=RoomOutputOptions(
            transcription_enabled=True,
            audio_enabled=False
        )
    )


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))