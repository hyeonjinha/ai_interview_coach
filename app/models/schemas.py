from __future__ import annotations

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ExperienceCreate(BaseModel):
    user_id: str = "default"
    category: str
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    content: Dict[str, Any] = Field(default_factory=dict)


class ExperienceRead(ExperienceCreate):
    id: int


class JobPostingCreate(BaseModel):
    user_id: str = "default"
    source_type: str  # url | manual
    url: Optional[str] = None
    raw_text: Optional[str] = None
    status: Optional[str] = None
    application_qa: Optional[List[Dict[str, Any]]] = None


class JobPostingRead(BaseModel):
    id: int
    user_id: str
    source_type: str
    url: Optional[str]
    raw_text: Optional[str]
    sections: Dict[str, Any]
    status: str
    application_qa: List[Dict[str, Any]]
    created_at: datetime


class RecommendationRequest(BaseModel):
    user_id: str = "default"
    job_posting_id: int
    experience_ids: Optional[List[int]] = None  # if None, use all for user
    threshold: float = 0.32


class RecommendedItem(BaseModel):
    experience_id: int
    score: float
    selected: bool


class RecommendationResponse(BaseModel):
    items: List[RecommendedItem]


class InterviewStartRequest(BaseModel):
    user_id: str = "default"
    job_posting_id: int
    selected_experience_ids: List[int]


class InterviewStartResponse(BaseModel):
    session_id: int
    first_question: str
    first_question_id: int


class NextQuestionResponse(BaseModel):
    question: str
    question_id: int
    question_type: str
    round_index: int


class SubmitAnswerRequest(BaseModel):
    answer: str


class SubmitAnswerResponse(BaseModel):
    rating: str
    notes: Dict[str, Any]
    next_action: str  # next_question | follow_up | end
    follow_up_count: int


class FeedbackResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    overall: str
    strengths: List[str]
    areas: List[str]
    model_answer: str


class InterviewSessionSummary(BaseModel):
    id: int
    user_id: str
    job_posting_id: int
    status: str
    current_round: int
    follow_up_count: int
    created_at: datetime


class InterviewSessionDetail(InterviewSessionSummary):
    last_question: Optional[str] = None

