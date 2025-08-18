from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Column, JSON
from passlib.context import CryptContext


class Experience(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(default="default", index=True)
    category: str = Field(index=True)  # project | career | education | certification | language
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    content: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        return pwd_context.verify(password, hashed)


class JobPosting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(default="default", index=True)
    source_type: str = Field(index=True)  # url | manual
    url: Optional[str] = None
    raw_text: Optional[str] = None
    sections: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    status: str = Field(default="draft", index=True)  # draft | applied | interviewing | offer | rejected
    application_qa: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class InterviewSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(default="default", index=True)
    job_posting_id: int = Field(index=True)
    selected_experience_ids: List[int] = Field(default_factory=list, sa_column=Column(JSON))
    status: str = Field(default="active", index=True)
    current_round: int = Field(default=0)
    follow_up_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class InterviewQuestion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(index=True)
    round_index: int = Field(default=0, index=True)
    question_type: str = Field(default="main")  # main | follow_up
    text: str
    parent_question_id: Optional[int] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class InterviewAnswer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(index=True)
    question_id: int = Field(index=True)
    answer_text: str
    evaluation: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FeedbackReport(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(index=True)
    status: str = Field(default="pending", index=True)  # pending → processing → completed → failed
    progress: int = Field(default=0)  # 0-100%
    report: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

