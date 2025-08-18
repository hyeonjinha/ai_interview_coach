'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Send, 
  Clock,
  MessageCircle,
  StopCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Loading } from '@/components/ui/loading';
import { jobApi, experienceApi, interviewApi } from '@/lib/api';
import { useInterviewStore } from '@/stores/interview';
import { formatInterviewDuration, getQuestionTypeText, getLoadingMessage } from '@/lib/utils';

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = parseInt(params.id as string);

  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);
  // 오디오 입력 제거: 텍스트 기반만 사용
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    sessionId,
    messages,
    currentQuestionId,
    currentQuestionType,
    currentRound,
    isLoading,
    isSessionActive,
    startTime,
    startSession,
    addQuestion,
    addAnswer,
    setLoading,
    endSession,
    resetSession,
  } = useInterviewStore();

  // 데이터 조회
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobApi.get(jobId),
  });

  const { data: experiences } = useQuery({
    queryKey: ['experiences'],
    queryFn: experienceApi.list,
  });

  // 면접 시작 mutation
  const startInterviewMutation = useMutation({
    mutationFn: interviewApi.start,
    onSuccess: (data) => {
      const expIds = experiences?.map(exp => exp.id) || [];
      startSession(data.session_id, jobId, expIds, data.first_question, data.first_question_id);
    },
  });

  // 다음 질문 받기 mutation
  const nextQuestionMutation = useMutation({
    mutationFn: () => interviewApi.nextQuestion(sessionId!),
    onSuccess: (data) => {
      addQuestion(data);
      setLoading(false);
    },
  });

  // 답변 제출 mutation
  const submitAnswerMutation = useMutation({
    mutationFn: ({ answer }: { answer: string }) => {
      return interviewApi.submitAnswer(sessionId!, currentQuestionId!, { answer });
    },
    onSuccess: (data) => {
      addAnswer(currentAnswer, data);
      setCurrentAnswer('');
      
      if (data.next_action === 'next_question') {
        setLoading(true);
        setTimeout(() => {
          nextQuestionMutation.mutate();
        }, 1000);
      } else if (data.next_action === 'end') {
        endSession();
        router.push(`/interviews/${sessionId}/feedback`);
      }
    },
  });

  // 면접 종료 mutation
  const endInterviewMutation = useMutation({
    mutationFn: () => interviewApi.endInterview(sessionId!),
    onSuccess: () => {
      endSession();
      // 비동기 피드백 생성이 시작되므로 즉시 피드백 페이지로 이동
      router.push(`/interviews/${sessionId}/feedback`);
    },
  });

  // 컴포넌트 마운트 시 면접 시작
  useEffect(() => {
    if (job && experiences && !isSessionActive) {
      startInterviewMutation.mutate({
        job_posting_id: jobId,
        selected_experience_ids: experiences.map(exp => exp.id),
      });
    }
  }, [job, experiences, isSessionActive]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 답변 제출
  const handleSubmitAnswer = () => {
    if (!currentAnswer.trim()) return;
    submitAnswerMutation.mutate({ answer: currentAnswer.trim() });
  };

  // 면접 종료 확인
  const handleEndInterview = () => {
    setShowEndModal(true);
  };

  const confirmEndInterview = () => {
    if (sessionId) {
      endInterviewMutation.mutate();
    } else {
      resetSession();
      router.push('/jobs');
    }
  };

  if (startInterviewMutation.isPending || !isSessionActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loading size="lg" text="면접을 준비하고 있습니다..." />
            <p className="text-sm text-text-secondary mt-4">
              AI 면접관이 질문을 생성하고 있습니다
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentTime = startTime ? formatInterviewDuration(startTime) : '00:00';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handleEndInterview}
              className="text-danger hover:text-danger/80"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              면접 종료
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-secondary" />
                <span className="font-mono text-sm">{currentTime}</span>
              </div>
              
              {currentQuestionType && (
                <Badge variant="outline">
                  {getQuestionTypeText(currentQuestionType)} (Round {currentRound})
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto p-4">
        {/* 대화창 */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-0">
            <div className="h-96 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'answer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl p-4 rounded-lg ${
                      message.type === 'answer'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-text-primary'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {message.type === 'question' && (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.rating && (
                          <div className="mt-2 text-xs opacity-75">
                            평가: {message.rating}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Loading size="sm" />
                        <span className="text-sm text-text-secondary">
                          {getLoadingMessage('generating')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
        </Card>

        {/* 입력창 (텍스트 전용) */}
        {!isLoading && currentQuestionId && (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Textarea
                  placeholder="답변을 입력하세요..."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  rows={4}
                  disabled={submitAnswerMutation.isPending}
                  className="resize-none"
                />
                
                <div className="flex items-center justify-between">
                  <div />
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!currentAnswer.trim() || submitAnswerMutation.isPending}
                    loading={submitAnswerMutation.isPending}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    답변 전송
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* 면접 종료 확인 모달 */}
      <Modal open={showEndModal} onOpenChange={setShowEndModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>면접 종료</ModalTitle>
            <ModalDescription>
              정말로 면접을 종료하시겠습니까? 종료 후 피드백을 확인할 수 있습니다.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowEndModal(false)}
            >
              계속하기
            </Button>
            <Button
              variant="destructive"
              onClick={confirmEndInterview}
              loading={endInterviewMutation.isPending}
            >
              종료하기
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

