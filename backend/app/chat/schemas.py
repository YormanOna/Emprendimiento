# app/chat/schemas.py
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List


class ConversationCreate(BaseModel):
    senior_id: int = Field(gt=0, description="ID del adulto mayor")
    doctor_user_id: int = Field(gt=0, description="ID del doctor")


class ConversationPublic(BaseModel):
    id: int
    senior_id: int
    doctor_user_id: int
    status: str

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    conversation_id: int = Field(gt=0, description="ID de la conversación")
    content: str = Field(
        min_length=1,
        max_length=4000,
        description="Contenido del mensaje"
    )


class MessagePublic(BaseModel):
    id: int
    conversation_id: int
    sender_user_id: int
    content: str
    sent_at: datetime
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationWithMessages(BaseModel):
    conversation: ConversationPublic
    messages: List[MessagePublic]
