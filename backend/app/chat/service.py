# app/chat/service.py
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.chat.models import Conversation, Message
from app.seniors.models import CareTeam, SeniorProfile
from app.auth.models import User

# Zona horaria de Ecuador (ECT - UTC-5)
ECUADOR_TZ = timezone(timedelta(hours=-5))


async def get_user_conversations(db: AsyncSession, user_id: int) -> list[dict]:
    """
    Obtener todas las conversaciones donde el usuario participa
    (como doctor o como miembro del care team)
    """
    # Buscar conversaciones donde es doctor
    res = await db.execute(
        select(Conversation)
        .where(Conversation.doctor_user_id == user_id)
    )
    conversations = list(res.scalars().all())
    
    # Buscar conversaciones donde es miembro del care team
    care_res = await db.execute(
        select(CareTeam).where(CareTeam.user_id == user_id)
    )
    care_teams = list(care_res.scalars().all())
    
    for ct in care_teams:
        conv_res = await db.execute(
            select(Conversation).where(Conversation.senior_id == ct.senior_id)
        )
        for conv in conv_res.scalars().all():
            if conv not in conversations:
                conversations.append(conv)
    
    # Agregar información adicional a cada conversación
    result = []
    for conv in conversations:
        # Obtener último mensaje
        last_msg_res = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.sent_at.desc())
            .limit(1)
        )
        last_msg = last_msg_res.scalar_one_or_none()
        
        # Obtener info del senior
        senior_res = await db.execute(
            select(SeniorProfile).where(SeniorProfile.id == conv.senior_id)
        )
        senior = senior_res.scalar_one_or_none()
        
        result.append({
            "id": conv.id,
            "senior_id": conv.senior_id,
            "senior_name": senior.full_name if senior else "Desconocido",
            "doctor_user_id": conv.doctor_user_id,
            "status": conv.status,
            "last_message": {
                "content": last_msg.content,
                "sent_at": last_msg.sent_at.isoformat(),
            } if last_msg else None,
            "created_at": conv.created_at.isoformat(),
            "updated_at": conv.updated_at.isoformat(),
        })
    
    return result


async def create_conversation(db: AsyncSession, senior_id: int, doctor_user_id: int | None = None) -> Conversation:
    # Verificar si ya existe una conversación para este senior
    res = await db.execute(
        select(Conversation).where(
            Conversation.senior_id == senior_id,
            Conversation.status == "OPEN"
        )
    )
    existing = res.scalar_one_or_none()
    if existing:
        return existing
    
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
        sent_at=datetime.now(ECUADOR_TZ),
    )
    db.add(msg)
    await db.flush()
    return msg
