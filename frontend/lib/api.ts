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

  // SSE 스트리밍: 답변 제출 → 평가 이벤트 즉시 → 질문 토큰 스트리밍
  submitAnswerStream: async (
    sessionId: number,
    questionId: number,
    answer: string,
    handlers: {
      onEvaluation?: (payload: { rating: string; notes: any }) => void;
      onChunk?: (textChunk: string) => void;
      onEnd?: (meta: { question_id: number; question_type: string; round_index: number }) => void;
      onError?: (error: any) => void;
    }
  ): Promise<() => void> => {
    const controller = new AbortController();
    const signal = controller.signal;

    try {
      const res = await fetch(
        `${api.defaults.baseURL}/interviews/${sessionId}/answer/${questionId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 인증 토큰 헤더 붙이기
            ...(api.defaults.headers.common as any),
          },
          body: JSON.stringify({ answer }),
          signal,
        }
      );

      if (!res.body) throw new Error('No response body for SSE');
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent: string | null = null;

      const processBuffer = () => {
        const messages = buffer.split('\n\n');
        // 마지막은 불완전할 수 있으니 남겨둔다
        buffer = messages.pop() || '';
        for (const msg of messages) {
          if (!msg.trim()) continue;
          let dataLine: string | null = null;
          currentEvent = null;
          for (const line of msg.split('\n')) {
            if (line.startsWith('event:')) currentEvent = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLine = (dataLine || '') + line.slice(5).trim();
          }
          if (!dataLine) continue;
          try {
            const payload = JSON.parse(dataLine);
            if (currentEvent === 'evaluation') handlers.onEvaluation?.(payload);
            else if (currentEvent === 'question_chunk') handlers.onChunk?.(payload.content || '');
            else if (currentEvent === 'question_end') handlers.onEnd?.(payload);
            else if (currentEvent === 'done') {
              // ignore; caller will stop when onEnd fired
            }
          } catch (e) {
            handlers.onError?.(e);
          }
        }
      };

      (async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            processBuffer();
          }
        } catch (e) {
          handlers.onError?.(e);
        }
      })();
    } catch (e) {
      handlers.onError?.(e);
    }

    return () => controller.abort();
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

  listSessions: async (includeLegacy: boolean = false): Promise<InterviewSessionSummary[]> => {
    const response = await api.get('/interviews/', { params: includeLegacy ? { include_legacy: true } : {} });
    return response.data;
  },
};

export default api;
