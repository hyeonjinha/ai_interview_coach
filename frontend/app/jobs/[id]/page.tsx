'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  MessageCircle, 
  Lightbulb, 
  Copy,
  ExternalLink,
  Calendar,
  Building,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Loading, CardSkeleton } from '@/components/ui/loading';
import { jobApi, experienceApi, recommendationApi } from '@/lib/api';
import { formatDate, getCategoryText, getStatusText, getStatusBadgeStyle } from '@/lib/utils';
import type { JobPosting, Experience, RecommendedItem } from '@/types/api';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = parseInt(params.id as string);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [showExperienceModal, setShowExperienceModal] = useState(false);

  // 데이터 조회
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobApi.get(jobId),
  });

  const { data: experiences, isLoading: experiencesLoading } = useQuery({
    queryKey: ['experiences'],
    queryFn: experienceApi.list,
  });

  // 지원서 답변 저장 mutation
  const updateJobMutation = useMutation({
    mutationFn: (data: { application_qa: any[] }) => 
      jobApi.update(jobId, { ...job!, application_qa: data.application_qa }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });

  // 초기 답변 로드
  useEffect(() => {
    if (job?.application_qa) {
      const initialAnswers: Record<number, string> = {};
      job.application_qa.forEach((qa, index) => {
        if (qa.answer) {
          initialAnswers[index] = qa.answer;
        }
      });
      setAnswers(initialAnswers);
    }
  }, [job]);

  // AI 경험 추천 요청
  const getRecommendations = async (questionIndex: number) => {
    if (!job || !experiences) return;

    setIsLoadingRecommendations(true);
    setSelectedQuestionIndex(questionIndex);

    try {
      const response = await recommendationApi.getRecommendations({
        job_posting_id: jobId,
        experience_ids: experiences.map(exp => exp.id),
        threshold: 0.3,
      });
      setRecommendations(response.items);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // 답변 업데이트
  const updateAnswer = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  // 지원서 저장
  const saveApplicationAnswers = () => {
    if (!job) return;

    const updatedQA = job.application_qa.map((qa, index) => ({
      ...qa,
      answer: answers[index] || '',
    }));

    updateJobMutation.mutate({ application_qa: updatedQA });
  };

  // 경험 내용을 클립보드에 복사
  const copyExperienceContent = (experience: Experience) => {
    const content = Object.entries(experience.content)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(content);
    // 토스트 메시지 표시 (실제로는 toast 라이브러리 사용)
    alert('경험 내용이 클립보드에 복사되었습니다.');
  };

  if (jobLoading || experiencesLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-danger mb-4">지원 공고를 찾을 수 없습니다.</p>
          <Button onClick={() => router.back()}>돌아가기</Button>
        </div>
      </div>
    );
  }

  const hasApplicationQuestions = job.application_qa && job.application_qa.length > 0;
  const recommendedExperiences = recommendations
    .filter(rec => rec.selected)
    .map(rec => experiences?.find(exp => exp.id === rec.experience_id))
    .filter(Boolean) as Experience[];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={getStatusBadgeStyle(job.status)}>
              {getStatusText(job.status)}
            </Badge>
            {job.source_type === 'url' && (
              <Badge variant="outline">URL</Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold text-text-primary">공고 상세 및 지원서 작성</h1>
          <p className="text-text-secondary">
            AI 추천을 활용해 지원서를 작성하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/jobs/${jobId}/edit`}>
            <Button variant="outline">수정</Button>
          </Link>
          {hasApplicationQuestions && (
            <Link href={`/jobs/${jobId}/interview`}>
              <Button className="gap-2">
                <MessageCircle className="w-4 h-4" />
                면접 시작
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 공고 요약 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                공고 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-secondary">등록일:</span>
                  <span className="text-sm">{formatDate(job.created_at)}</span>
                </div>
                {job.url && (
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm">원본 공고 보기</span>
                  </a>
                )}
              </div>
              
              {job.raw_text && (
                <div>
                  <h4 className="font-medium text-text-primary mb-2">공고 내용</h4>
                  <div className="bg-gray-50 p-4 rounded-component">
                    <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans">
                      {job.raw_text}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 지원서 질문 및 답변 */}
          {hasApplicationQuestions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  지원서 작성
                </CardTitle>
                <CardDescription>
                  각 질문에 대한 답변을 작성하고 AI 추천을 활용하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-4">
                  {job.application_qa.map((qa, index) => (
                    <AccordionItem key={index} value={`question-${index}`} className="border rounded-component p-4">
                      <AccordionTrigger className="text-left">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-medium">질문 {index + 1}</span>
                          {answers[index] && (
                            <Badge variant="success" className="text-xs">
                              답변 완료
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-4">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-component">
                          <p className="text-text-primary">{qa.question}</p>
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => getRecommendations(index)}
                            loading={isLoadingRecommendations && selectedQuestionIndex === index}
                            className="gap-2"
                          >
                            <Lightbulb className="w-4 h-4" />
                            AI 경험 추천
                          </Button>
                        </div>
                        
                        <Textarea
                          placeholder="답변을 작성하세요..."
                          value={answers[index] || ''}
                          onChange={(e) => updateAnswer(index, e.target.value)}
                          rows={6}
                          className="min-h-[150px]"
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={saveApplicationAnswers}
                    loading={updateJobMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    지원서 저장
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 사이드 패널 - AI 추천 */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                AI 경험 추천
              </CardTitle>
              <CardDescription>
                질문에 적합한 경험을 AI가 추천해드립니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedQuestionIndex === null ? (
                <div className="text-center py-8">
                  <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-text-secondary text-sm">
                    질문의 "AI 경험 추천" 버튼을 클릭하여<br />
                    관련 경험을 찾아보세요
                  </p>
                </div>
              ) : isLoadingRecommendations ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <Loading size="md" text="AI가 분석 중입니다..." />
                  </div>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : recommendedExperiences.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-text-secondary mb-4">
                    질문 {selectedQuestionIndex + 1}과 관련된 경험들:
                  </p>
                  {recommendedExperiences.map((experience) => (
                    <div 
                      key={experience.id}
                      className="p-3 border border-gray-200 rounded-component hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {getCategoryText(experience.category)}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedExperience(experience);
                              setShowExperienceModal(true);
                            }}
                          >
                            보기
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyExperienceContent(experience)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <h4 className="font-medium text-text-primary text-sm mb-1">
                        {experience.title || '제목 없음'}
                      </h4>
                      <p className="text-xs text-text-secondary">
                        {Object.values(experience.content)[0]?.toString().slice(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-secondary text-sm">
                    해당 질문과 관련된 경험이 없습니다.<br />
                    새로운 경험을 추가해보세요.
                  </p>
                  <Link href="/experiences/new" className="mt-4 inline-block">
                    <Button size="sm" variant="outline">
                      경험 추가
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 경험 상세 모달 */}
      <Modal open={showExperienceModal} onOpenChange={setShowExperienceModal}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>
              {selectedExperience?.title || '경험 상세'}
            </ModalTitle>
            <ModalDescription>
              {selectedExperience && getCategoryText(selectedExperience.category)} 경험
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedExperience && Object.entries(selectedExperience.content).map(([key, value]) => (
              <div key={key}>
                <h4 className="font-medium text-text-primary capitalize mb-1">{key}:</h4>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">
                  {String(value)}
                </p>
              </div>
            ))}
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowExperienceModal(false)}
            >
              닫기
            </Button>
            <Button
              onClick={() => {
                if (selectedExperience) {
                  copyExperienceContent(selectedExperience);
                }
                setShowExperienceModal(false);
              }}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              내용 복사
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

