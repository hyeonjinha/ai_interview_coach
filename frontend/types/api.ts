// 사용자 관련 타입
export interface User {
  id: number;
  email: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// 경험 관련 타입
export interface Experience {
  id: number;
  user_id: string;
  category: string; // project | career | education | certification | language
  title?: string;
  start_date?: string;
  end_date?: string;
  content: Record<string, any>;
  created_at: string;
}

export interface ExperienceCreate {
  user_id?: string;
  category: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  content: Record<string, any>;
}

// 채용 공고 관련 타입
export interface JobPosting {
  id: number;
  user_id: string;
  source_type: string; // url | manual
  url?: string;
  raw_text?: string;
  sections: Record<string, any>;
  status: string; // draft | applied | interviewing | offer | rejected
  application_qa: Array<Record<string, any>>;
  created_at: string;
}

export interface JobPostingCreate {
  user_id?: string;
  source_type: string;
  url?: string;
  raw_text?: string;
  status?: string;
  application_qa?: Array<Record<string, any>>;
}

// 대시보드 관련 타입
export interface DashboardSummary {
  experiences: number;
  jobs: number;
  sessions: number;
  recent: Array<{
    id: number;
    job_posting_id: number;
    status: string;
    round: number;
    created_at: string;
  }>;
}

// 추천 시스템 관련 타입
export interface RecommendationRequest {
  user_id?: string;
  job_posting_id: number;
  experience_ids?: number[];
  threshold?: number;
}

export interface RecommendedItem {
  experience_id: number;
  score: number;
  selected: boolean;
}

export interface RecommendationResponse {
  items: RecommendedItem[];
}

// 면접 관련 타입
export interface InterviewStartRequest {
  user_id?: string;
  job_posting_id: number;
  selected_experience_ids: number[];
}

export interface InterviewStartResponse {
  session_id: number;
  first_question: string;
  first_question_id: number;
}

export interface NextQuestionResponse {
  question: string;
  question_id: number;
  question_type: string;
  round_index: number;
}

export interface SubmitAnswerRequest {
  answer: string;
}

export interface SubmitAnswerResponse {
  rating: string;
  notes: Record<string, any>;
  next_action: string; // next_question | follow_up | end
  follow_up_count: number;
}

export interface FeedbackResponse {
  overall: string;
  strengths: string[];
  areas: string[];
  model_answer: string;
}

export interface InterviewSessionSummary {
  id: number;
  user_id: string;
  job_posting_id: number;
  status: string;
  current_round: number;
  follow_up_count: number;
  created_at: string;
}

export interface TranscriptItem {
  round: number;
  type: string;
  question: string;
  answer?: string;
  evaluation?: Record<string, any>;
}

export interface TranscriptResponse {
  items: TranscriptItem[];
}

