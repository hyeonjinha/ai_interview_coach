import axios from 'axios';
import type {
  AuthResponse,
  User,
  Experience,
  ExperienceCreate,
  JobPosting,
  JobPostingCreate,
  DashboardSummary,
  RecommendationRequest,
  RecommendationResponse,
  InterviewStartRequest,
  InterviewStartResponse,
  NextQuestionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  FeedbackResponse,
  InterviewSessionSummary,
  TranscriptResponse,
} from '@/types/api';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 에러 처리
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // 에러 객체를 직렬화 가능한 형태로 변환
    const serializedError = {
      message: error.message || 'Unknown error',
      status: error.response?.status || 500,
      data: error.response?.data || null,
      statusText: error.response?.statusText || 'Internal Server Error'
    };
    
    return Promise.reject(serializedError);
  }
);

// Auth API
export const authApi = {
  signup: async (email: string, password: string, name?: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/signup', { email, password, name });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get('/dashboard/summary');
    return response.data;
  },
};

// Experience API
export const experienceApi = {
  list: async (): Promise<Experience[]> => {
    const response = await api.get('/experiences/');
    return response.data;
  },

  get: async (id: number): Promise<Experience> => {
    const response = await api.get(`/experiences/${id}`);
    return response.data;
  },

  create: async (data: ExperienceCreate): Promise<Experience> => {
    const response = await api.post('/experiences/', data);
    return response.data;
  },

  update: async (id: number, data: ExperienceCreate): Promise<Experience> => {
    const response = await api.put(`/experiences/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ ok: boolean }> => {
    const response = await api.delete(`/experiences/${id}`);
    return response.data;
  },
};

// Job Posting API
export const jobApi = {
  list: async (): Promise<JobPosting[]> => {
    const response = await api.get('/jobs/');
    return response.data;
  },

  get: async (id: number): Promise<JobPosting> => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  create: async (data: JobPostingCreate): Promise<JobPosting> => {
    const response = await api.post('/jobs/', data);
    return response.data;
  },

  update: async (id: number, data: JobPostingCreate): Promise<JobPosting> => {
    const response = await api.put(`/jobs/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ ok: boolean }> => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
};

// Recommendation API
export const recommendationApi = {
  getRecommendations: async (data: RecommendationRequest): Promise<RecommendationResponse> => {
    const response = await api.post('/recommendations/', data);
    return response.data;
  },
};

// Interview API
export const interviewApi = {
  start: async (data: InterviewStartRequest): Promise<InterviewStartResponse> => {
    const response = await api.post('/interviews/start', data);
    return response.data;
  },

  nextQuestion: async (sessionId: number): Promise<NextQuestionResponse> => {
    const response = await api.get(`/interviews/${sessionId}/next`);
    return response.data;
  },

  submitAnswer: async (
    sessionId: number,
    questionId: number,
    data: SubmitAnswerRequest
  ): Promise<SubmitAnswerResponse> => {
    const response = await api.post(`/interviews/${sessionId}/answer/${questionId}`, data);
    return response.data;
  },

  submitAnswerAudio: async (
    sessionId: number,
    questionId: number,
    file: File
  ): Promise<SubmitAnswerResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/interviews/${sessionId}/answer/${questionId}/audio`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getFeedback: async (sessionId: number): Promise<FeedbackResponse> => {
    const response = await api.get(`/interviews/${sessionId}/feedback`);
    return response.data;
  },

  endInterview: async (sessionId: number): Promise<{ message: string; session_id: number; report_id: number }> => {
    const response = await api.post(`/interviews/${sessionId}/end`);
    return response.data;
  },

  getFeedbackStatus: async (sessionId: number): Promise<{
    status: string;
    progress: number;
    report: any | null;
    error: string | null;
    created_at: string;
    completed_at: string | null;
  }> => {
    const response = await api.get(`/interviews/${sessionId}/feedback/status`);
    return response.data;
  },

  // 하위 호환을 위한 별칭
  endAndFeedback: async (sessionId: number): Promise<{ message: string; session_id: number; report_id: number }> => {
    const response = await api.post(`/interviews/${sessionId}/end`);
    return response.data;
  },

  getTranscript: async (sessionId: number): Promise<TranscriptResponse> => {
    const response = await api.get(`/interviews/${sessionId}/transcript`);
    return response.data;
  },

  listSessions: async (): Promise<InterviewSessionSummary[]> => {
    const response = await api.get('/interviews/');
    return response.data;
  },
};

export default api;
