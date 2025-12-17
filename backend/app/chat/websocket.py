# app/chat/websocket.py
from typing import Dict, Set
from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.core.database import AsyncSessionLocal
from app.chat.service import send_message
from app.chat.models import Conversation
from app.seniors.models import CareTeam


class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[int, Set[WebSocket]] = {}

    async def connect(self, conversation_id: int, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(conversation_id, set()).add(ws)

    def disconnect(self, conversation_id: int, ws: WebSocket):
        if conversation_id in self.rooms:
            self.rooms[conversation_id].discard(ws)
            if not self.rooms[conversation_id]:
                del self.rooms[conversation_id]

    async def broadcast(self, conversation_id: int, payload: dict):
        # enviamos JSON
        for ws in list(self.rooms.get(conversation_id, set())):
            await ws.send_json(payload)


manager = ConnectionManager()


def get_user_id_from_ws(ws: WebSocket) -> int:
    token = ws.query_params.get("token")
    if not token:
        raise HTTPException(status_code=4401, detail="Missing token")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=4401, detail="Invalid token type")
    return int(payload["sub"])


async def conversations_ws(ws: WebSocket, conversation_id: int):
    user_id = get_user_id_from_ws(ws)
    
    # Validar autorización: doctor dueño o miembro del care team
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = res.scalar_one_or_none()
        if not conv:
            await ws.close(code=4404)
            return

        # Doctor dueño
        if conv.doctor_user_id != user_id:
            # O miembro del care team
            cres = await db.execute(
                select(CareTeam).where(
                    CareTeam.senior_id == conv.senior_id,
                    CareTeam.user_id == user_id,
                )
            )
            if not cres.scalar_one_or_none():
                await ws.close(code=4403)
                return
    
    await manager.connect(conversation_id, ws)

    try:
        while True:
            data = await ws.receive_json()
            # esperado: {"content": "..."}
            content = (data.get("content") or "").strip()
            if not content:
                continue

            # Guardar en DB
            async with AsyncSessionLocal() as db:
                msg = await send_message(db, conversation_id, user_id, content)
                await db.commit()
                await db.refresh(msg)

            # Broadcast a la room
            await manager.broadcast(conversation_id, {
                "type": "message",
                "conversation_id": conversation_id,
                "id": msg.id,
                "sender_user_id": user_id,
                "content": msg.content,
                "sent_at": msg.sent_at.isoformat(),
            })

    except WebSocketDisconnect:
        manager.disconnect(conversation_id, ws)
