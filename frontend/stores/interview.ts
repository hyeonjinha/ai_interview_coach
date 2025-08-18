import { create } from 'zustand';
import type { NextQuestionResponse, SubmitAnswerResponse } from '@/types/api';

interface InterviewMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  timestamp: Date;
  questionId?: number;
  rating?: string;
  notes?: Record<string, any>;
}

interface InterviewState {
  sessionId: number | null;
  jobPostingId: number | null;
  selectedExperienceIds: number[];
  messages: InterviewMessage[];
  currentQuestionId: number | null;
  currentQuestionType: string | null;
  currentRound: number;
  isRecording: boolean;
  isLoading: boolean;
  isSessionActive: boolean;
  startTime: Date | null;
  
  // Actions
  startSession: (sessionId: number, jobPostingId: number, selectedExperienceIds: number[], firstQuestion: string, firstQuestionId: number) => void;
  addQuestion: (question: NextQuestionResponse) => void;
  addAnswer: (answer: string, response: SubmitAnswerResponse) => void;
  setRecording: (isRecording: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  endSession: () => void;
  resetSession: () => void;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  sessionId: null,
  jobPostingId: null,
  selectedExperienceIds: [],
  messages: [],
  currentQuestionId: null,
  currentQuestionType: null,
  currentRound: 0,
  isRecording: false,
  isLoading: false,
  isSessionActive: false,
  startTime: null,

  startSession: (sessionId, jobPostingId, selectedExperienceIds, firstQuestion, firstQuestionId) => {
    const questionMessage: InterviewMessage = {
      id: `question-${Date.now()}`,
      type: 'question',
      content: firstQuestion,
      timestamp: new Date(),
    };

    set({
      sessionId,
      jobPostingId,
      selectedExperienceIds,
      messages: [questionMessage],
      isSessionActive: true,
      startTime: new Date(),
      currentRound: 1,
      currentQuestionId: firstQuestionId,
      currentQuestionType: 'main',
    });
  },

  addQuestion: (question) => {
    const questionMessage: InterviewMessage = {
      id: `question-${question.question_id}`,
      type: 'question',
      content: question.question,
      timestamp: new Date(),
      questionId: question.question_id,
    };

    set((state) => ({
      messages: [...state.messages, questionMessage],
      currentQuestionId: question.question_id,
      currentQuestionType: question.question_type,
      currentRound: question.round_index,
    }));
  },

  addAnswer: (answer, response) => {
    const answerMessage: InterviewMessage = {
      id: `answer-${Date.now()}`,
      type: 'answer',
      content: answer,
      timestamp: new Date(),
      rating: response.rating,
      notes: response.notes,
    };

    set((state) => ({
      messages: [...state.messages, answerMessage],
    }));
  },

  setRecording: (isRecording) => {
    set({ isRecording });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  endSession: () => {
    set({
      isSessionActive: false,
      isLoading: false,
      isRecording: false,
    });
  },

  resetSession: () => {
    set({
      sessionId: null,
      jobPostingId: null,
      selectedExperienceIds: [],
      messages: [],
      currentQuestionId: null,
      currentQuestionType: null,
      currentRound: 0,
      isRecording: false,
      isLoading: false,
      isSessionActive: false,
      startTime: null,
    });
  },
}));

