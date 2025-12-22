# app/chat/router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.auth.models import User
from app.chat.schemas import ConversationCreate, ConversationPublic, MessagePublic, MessageCreate, ConversationWithLastMessage
from app.chat.service import create_conversation, list_messages, send_message, get_user_conversations

router = APIRouter()


@router.get("/conversations", response_model=list[ConversationWithLastMessage])
async def list_user_conversations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Listar todas las conversaciones del usuario actual"""
    return await get_user_conversations(db, user.id)


@router.post("/conversations", response_model=ConversationPublic)
async def create_conversation_endpoint(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Crear una nueva conversación"""
    conv = await create_conversation(db, payload.senior_id, payload.doctor_user_id)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessagePublic])
async def list_messages_endpoint(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Obtener mensajes de una conversación"""
    return await list_messages(db, conversation_id)


@router.post("/conversations/{conversation_id}/messages", response_model=MessagePublic)
async def send_message_endpoint(
    conversation_id: int,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Enviar un mensaje a una conversación"""
    msg = await send_message(db, conversation_id, user.id, payload.content)
    await db.commit()
    await db.refresh(msg)
    return msg
