# app/chat/schemas.py
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List


class ConversationCreate(BaseModel):
    senior_id: int = Field(gt=0, description="ID del adulto mayor")
    doctor_user_id: int | None = Field(default=None, description="ID del doctor (opcional)")


class ConversationPublic(BaseModel):
    id: int
    senior_id: int
    doctor_user_id: int | None
    status: str

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
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


class LastMessageInfo(BaseModel):
    content: str
    sent_at: str


class ConversationWithLastMessage(BaseModel):
    id: int
    senior_id: int
    senior_name: str
    doctor_user_id: Optional[int]
    status: str
    last_message: Optional[LastMessageInfo]
    created_at: str
    updated_at: str
