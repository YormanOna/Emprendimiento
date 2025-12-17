# app/chat/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
# from app.core.deps import get_current_user
from app.chat.schemas import ConversationCreate, ConversationPublic, MessagePublic
from app.chat.service import create_conversation, list_messages

router = APIRouter()


@router.post("/conversations", response_model=ConversationPublic)
async def create_conversation_endpoint(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    # _=Depends(get_current_user),  # Autenticación deshabilitada temporalmente
):
    conv = await create_conversation(db, payload.senior_id, payload.doctor_user_id)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessagePublic])
async def list_messages_endpoint(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),

):
    return await list_messages(db, conversation_id)
