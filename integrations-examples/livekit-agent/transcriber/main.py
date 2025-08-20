import logging
import os

from dotenv import load_dotenv

from livekit.agents import (
    Agent,
    AgentSession,
    AutoSubscribe,
    JobContext,
    MetricsCollectedEvent,
    RoomOutputOptions,
    StopResponse,
    WorkerOptions,
    cli,
    llm,
    metrics,
)

from livekit.plugins.gladia.stt import STT as GladiaSTT

load_dotenv()

logger = logging.getLogger("transcriber")

class Transcriber(Agent):
    def __init__(self):
        super().__init__(
            instructions="not-needed",
            stt=GladiaSTT(
                api_key=os.getenv("GLADIA_API_KEY"),
                interim_results=True
            ),
        )

    async def on_user_turn_completed(self, chat_ctx: llm.ChatContext, new_message: llm.ChatMessage):
        user_transcript = new_message.text_content
        logger.info(f" -> {user_transcript}")

        raise StopResponse()
    
async def entrypoint(ctx: JobContext):
    logger.info(f"Starting transcriber (speech to text) in room: ${ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    session = AgentSession()

    @session.on("metrics_collected")
    def on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)

    await session.start(
        agent=Transcriber(),
        room=ctx.room,
        room_output_options=RoomOutputOptions(
            transcription_enabled=True,
            # disable audio output if it's not needed
            audio_enabled=False,
        ),
    )

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
