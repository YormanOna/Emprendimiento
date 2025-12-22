# app/chat/websocket.py
from typing import Dict, Set
from datetime import datetime, timezone, timedelta

from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.core.database import AsyncSessionLocal
from app.chat.service import send_message
from app.chat.models import Conversation
from app.seniors.models import CareTeam

# Zona horaria de Ecuador (ECT - UTC-5)
ECUADOR_TZ = timezone(timedelta(hours=-5))


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


async def conversations_ws(ws: WebSocket, conversation_id: int):
    # Primero validar el token ANTES de aceptar la conexión
    print(f"🔌 Nueva conexión WebSocket a conversación {conversation_id}")
    print(f"🔍 Query params: {ws.query_params}")
    
    try:
        token = ws.query_params.get("token")
        if not token:
            print(f"❌ Token faltante en query params")
            await ws.close(code=4001, reason="Missing token")
            return
        
        print(f"🔑 Token recibido (primeros 20 chars): {token[:20]}...")
        payload = decode_token(token)
        print(f"✅ Token decodificado: {payload}")
        
        if payload.get("type") != "access":
            print(f"❌ Tipo de token inválido: {payload.get('type')}")
            await ws.close(code=4001, reason="Invalid token type")
            return
        
        user_id = int(payload["sub"])
        print(f"👤 Usuario autenticado: {user_id}")
    except Exception as e:
        print(f"❌ Error validando token WebSocket: {e}")
        await ws.close(code=4001, reason="Invalid token")
        return
    
    # Validar autorización: doctor dueño o miembro del care team
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = res.scalar_one_or_none()
        if not conv:
            await ws.close(code=4004, reason="Conversation not found")
            return

        # Doctor dueño (si existe) o miembro del care team
        is_authorized = False
        if conv.doctor_user_id and conv.doctor_user_id == user_id:
            is_authorized = True
        else:
            # Verificar si es miembro del care team
            cres = await db.execute(
                select(CareTeam).where(
                    CareTeam.senior_id == conv.senior_id,
                    CareTeam.user_id == user_id,
                )
            )
            if cres.scalar_one_or_none():
                is_authorized = True
        
        if not is_authorized:
            await ws.close(code=4003, reason="Unauthorized")
            return
    
    # Ahora sí, aceptar la conexión
    await manager.connect(conversation_id, ws)
    print(f"✅ WebSocket conectado: user_id={user_id}, conversation_id={conversation_id}")

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
            print(f"📨 Mensaje enviado: user_id={user_id}, content={content[:50]}")

    except WebSocketDisconnect:
        manager.disconnect(conversation_id, ws)
        print(f"🔌 WebSocket desconectado: user_id={user_id}, conversation_id={conversation_id}")
