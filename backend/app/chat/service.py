# app/chat/service.py
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.chat.models import Conversation, Message


async def create_conversation(db: AsyncSession, senior_id: int, doctor_user_id: int) -> Conversation:
    conv = Conversation(senior_id=senior_id, doctor_user_id=doctor_user_id, status="OPEN")
    db.add(conv)
    await db.flush()
    return conv


async def list_messages(db: AsyncSession, conversation_id: int) -> list[Message]:
    res = await db.execute(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.sent_at.asc()))
    return list(res.scalars().all())


async def send_message(db: AsyncSession, conversation_id: int, sender_user_id: int, content: str) -> Message:
    # valida conv existe
    res = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg = Message(
        conversation_id=conversation_id,
        sender_user_id=sender_user_id,
        content=content,
        sent_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    await db.flush()
    return msg
