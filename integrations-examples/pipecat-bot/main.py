import logging
import os

from dotenv import load_dotenv

from pipecat.frames.frames import Frame, TranscriptionFrame, InterimTranscriptionFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.processors.frameworks.rtvi import (
    RTVIConfig,
    RTVIObserver,
    RTVIProcessor,
    RTVIObserverParams,
)
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.gladia.config import GladiaInputParams, MessagesConfig
from pipecat.services.gladia.stt import GladiaSTTService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.network.small_webrtc import SmallWebRTCTransport
from pipecat.audio.vad.silero import SileroVADAnalyzer

load_dotenv()

logger = logging.getLogger("transcriber")

transport_params = {
    "webrtc": lambda: TransportParams(
        audio_in_enabled=True,
        audio_out_enabled=False,
        vad_analyzer=SileroVADAnalyzer(),
    ),
}

class TranscriptionLogger(FrameProcessor):
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, TranscriptionFrame):
            print(f"Transcription: {frame.text}")
        elif isinstance(frame, InterimTranscriptionFrame):
            print(f"Partial transcription: {frame.text}")

        await self.push_frame(frame, direction)


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    logger.info(f"Starting bot {runner_args}")

    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

    stt = GladiaSTTService(
        api_key=os.getenv("GLADIA_API_KEY"),
        params=GladiaInputParams(
            messages_config=MessagesConfig(
                receive_partial_transcripts=True,
            ),
        ),
    )

    tl = TranscriptionLogger()

    pipeline = Pipeline(
        [
            transport.input(),
            rtvi,
            stt,
            tl,
            transport.output(),
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[RTVIObserver(rtvi)],
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=runner_args.handle_sigint)

    await runner.run(task)

async def bot(runner_args: RunnerArguments):
    """Main bot entry point for the bot starter."""
    transport = await create_transport(runner_args, transport_params)
    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
