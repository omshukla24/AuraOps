"""
AuraOps Voice WebSocket — Real-time voice interaction via Gemini Live API.

Proxies audio between the browser and Gemini's Multimodal Live API using
the google-genai SDK's async live session. Sends echo-control messages
so the frontend can mute the mic while the model is speaking.
"""

import os
import json
import base64
import asyncio
import traceback

from fastapi import WebSocket, WebSocketDisconnect

# ─────────────────────────────────────────────────────────────────────
# GEMINI LIVE CLIENT
# ─────────────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
VOICE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"


def _build_system_instruction() -> str:
    """Build a system prompt that includes the latest pipeline context."""
    base = (
        "You are AuraOps Voice, the spoken interface to AuraOps — an autonomous "
        "AI-powered release authority. You narrate pipeline status, explain "
        "vulnerabilities, and answer questions about security scans, carbon "
        "optimizations, and deployment decisions. Be concise, professional, and "
        "sound like a futuristic mission-control operator. Keep responses under "
        "30 seconds of speech. If you don't have data yet, say the pipeline "
        "hasn't been triggered."
    )

    # Try to inject the latest scan context
    try:
        from backend.orchestrator import _last_ctx
        if _last_ctx:
            sec = _last_ctx.get("sec_result", {})
            eco = _last_ctx.get("eco_result", {})
            risk = _last_ctx.get("risk_result", {})
            context_lines = [
                f"\n\nCurrent pipeline state:",
                f"- Security score: {sec.get('score', 'N/A')}/100",
                f"- Vulnerabilities found: {sec.get('count', 0)}",
                f"- Patches committed: {sec.get('patches_committed', 0)}",
                f"- Eco score: {eco.get('eco_score', 'N/A')}/100",
                f"- CO2 saved: {eco.get('co2_saved', 0)} kg/yr",
                f"- Risk decision: {risk.get('decision', 'N/A')}",
                f"- Confidence: {risk.get('confidence', 'N/A')}%",
            ]
            vulns = sec.get("vulns", [])
            if vulns:
                context_lines.append(f"- Vulnerability details:")
                for v in vulns[:8]:
                    context_lines.append(
                        f"  • {v.get('type', '?')} in {v.get('file', '?')} "
                        f"(severity {v.get('severity', '?')}, "
                        f"{'patched' if v.get('patched') else 'unpatched'})"
                    )
            base += "\n".join(context_lines)
    except Exception:
        pass

    return base


async def handle_voice_ws(websocket: WebSocket):
    """Handle a voice WebSocket connection from the dashboard."""
    await websocket.accept()

    if not GEMINI_API_KEY:
        await websocket.send_json({"type": "error", "message": "GEMINI_API_KEY not set"})
        await websocket.close()
        return

    try:
        from google import genai as _genai
        from google.genai import types

        client = _genai.Client(api_key=GEMINI_API_KEY)

        config = {
            "response_modalities": ["AUDIO"],
            "system_instruction": _build_system_instruction(),
        }

        async with client.aio.live.connect(model=VOICE_MODEL, config=config) as session:
            await websocket.send_json({"type": "connected", "model": VOICE_MODEL})

            # ── Task: Forward browser audio → Gemini ──
            async def send_audio_to_gemini():
                try:
                    while True:
                        raw = await websocket.receive_text()
                        msg = json.loads(raw)

                        if msg.get("type") == "audio":
                            audio_bytes = base64.b64decode(msg["data"])
                            await session.send_realtime_input(
                                audio=types.Blob(
                                    data=audio_bytes,
                                    mime_type="audio/pcm;rate=16000",
                                )
                            )
                        elif msg.get("type") == "close":
                            break
                except WebSocketDisconnect:
                    pass
                except Exception as e:
                    print(f"[Voice] send_audio error: {e}")

            # ── Task: Forward Gemini audio → browser ──
            async def receive_audio_from_gemini():
                try:
                    speaking = False
                    async for response in session.receive():
                        sc = response.server_content
                        if sc is None:
                            continue

                        # Check if model is producing audio
                        if sc.model_turn and sc.model_turn.parts:
                            if not speaking:
                                speaking = True
                                await websocket.send_json({"type": "speaking_start"})

                            for part in sc.model_turn.parts:
                                if part.inline_data and part.inline_data.data:
                                    audio_b64 = base64.b64encode(
                                        part.inline_data.data
                                    ).decode("ascii")
                                    await websocket.send_json({
                                        "type": "audio",
                                        "data": audio_b64,
                                    })

                        # Turn complete — model done speaking
                        if sc.turn_complete:
                            if speaking:
                                speaking = False
                                await websocket.send_json({"type": "speaking_end"})

                except WebSocketDisconnect:
                    pass
                except Exception as e:
                    print(f"[Voice] receive_audio error: {e}")
                    traceback.print_exc()

            # Run both tasks concurrently
            send_task = asyncio.create_task(send_audio_to_gemini())
            recv_task = asyncio.create_task(receive_audio_from_gemini())

            # Wait for either to finish (disconnect or error)
            done, pending = await asyncio.wait(
                [send_task, recv_task],
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[Voice] session error: {e}")
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
