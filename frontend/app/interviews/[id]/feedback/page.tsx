'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  ArrowLeft,
  Download,
  Share,
  Star,
  TrendingUp,
  Target,
  MessageCircle,
  FileText,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  Copy,
  Check,
  X,
  Plus,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loading, CardSkeleton } from '@/components/ui/loading';
import { FeedbackLoadingUI } from '@/components/ui/feedback-loading';
import { interviewApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// 등급별 색상 및 라벨 매핑
const getRatingConfig = (rating: string) => {
  switch (rating) {
    case 'GOOD':
      return { color: 'bg-green-100 text-green-800 border-green-200', label: '우수', icon: CheckCircle };
    case 'VAGUE':
      return { color: 'bg-orange-100 text-orange-800 border-orange-200', label: '개선 필요', icon: AlertCircle };
    case 'OFF_TOPIC':
      return { color: 'bg-red-100 text-red-800 border-red-200', label: '부적절', icon: X };
    default:
      return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: '평가 없음', icon: AlertCircle };
  }
};

// 평가 항목별 배지 시스템
const getDimensionBadge = (dimension: string, score: 'gold' | 'silver' | 'bronze' | 'none') => {
  const config = {
    gold: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🥇' },
    silver: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '🥈' },
    bronze: { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: '🥉' },
    none: { color: 'bg-red-50 text-red-600 border-red-200', icon: '❌' }
  };
  
  const dimLabels: Record<string, string> = {
    'understanding': '이해도',
    'quantitative': '정량성', 
    'justification': '정당화',
    'tradeoff': '트레이드오프',
    'process': '과정'
  };
  
  return (
    <Badge className={`${config[score].color} border text-xs px-2 py-1`}>
      <span className="mr-1">{config[score].icon}</span>
      {dimLabels[dimension] || dimension}
    </Badge>
  );
};

// 평가 항목별 점수 계산 (배지 부여용)
const calculateDimensionScores = (evaluations: any[]) => {
  const dimensions = ['understanding', 'quantitative', 'justification', 'tradeoff', 'process'];
  const scores: Record<string, number> = {};
  
  dimensions.forEach(dim => {
    scores[dim] = 0;
  });
  
  evaluations.forEach(evaluation => {
    if (evaluation.notes?.missing_dims) {
      evaluation.notes.missing_dims.forEach((dim: string) => {
        if (scores[dim] !== undefined) {
          scores[dim] += 1; // missing_dims가 있으면 점수 감점
        }
      });
    }
  });
  
  // 배지 부여 (missing_dims가 적을수록 높은 배지)
  const badges: Record<string, 'gold' | 'silver' | 'bronze' | 'none'> = {};
  dimensions.forEach(dim => {
    if (scores[dim] === 0) badges[dim] = 'gold';
    else if (scores[dim] <= 1) badges[dim] = 'silver';
    else if (scores[dim] <= 2) badges[dim] = 'bronze';
    else badges[dim] = 'none';
  });
  
  return badges;
};

// missing_dims 칩 컴포넌트
const MissingDimsChips = ({ missingDims }: { missingDims: string[] }) => {
  const dimLabels: Record<string, string> = {
    'understanding': '이해도',
    'quantitative': '정량성',
    'justification': '정당화',
    'tradeoff': '트레이드오프',
    'process': '과정'
  };

  return (
    <div className="flex flex-wrap gap-2">
      {missingDims?.map((dim) => (
        <Badge 
          key={dim} 
          variant="outline" 
          className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
        >
          {dimLabels[dim] || dim}
        </Badge>
      ))}
    </div>
  );
};

// 힌트를 액션 아이템으로 변환하는 컴포넌트
const ActionItems = ({ hints }: { hints: string[] }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  const formatActionItem = (hint: string) => {
    // 힌트를 액션 아이템 형태로 변환
    if (hint.includes('수치') || hint.includes('구체')) {
      return { what: '구체적 수치 제시', how: hint, example: '예: "사용자 10만명, 처리량 1000TPS"' };
    } else if (hint.includes('이유') || hint.includes('근거')) {
      return { what: '선택 이유 명시', how: hint, example: '예: "성능 향상을 위해 Redis를 선택했습니다"' };
    } else if (hint.includes('비교') || hint.includes('대안')) {
      return { what: '대안 비교', how: hint, example: '예: "A와 B를 비교하여 A를 선택했습니다"' };
    } else {
      return { what: '구체화', how: hint, example: '예: "더 구체적인 사례를 들어보세요"' };
    }
  };

  return (
    <div className="space-y-3">
      {hints?.map((hint, index) => {
        const action = formatActionItem(hint);
        return (
          <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-blue-900 text-sm">{action.what}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(hint, index)}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              >
                {copiedIndex === index ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-blue-800">
                <span className="font-medium">방법:</span> {action.how}
              </div>
              <div className="text-xs text-blue-600 italic">
                {action.example}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};



export default function FeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = parseInt(params.id as string);

  const [selectedQAIndex, setSelectedQAIndex] = useState<number | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'loading' | 'pending' | 'processing' | 'completed' | 'failed' | 'not_found'>('loading');
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 타임라인 필터 상태
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'main' | 'follow_up'>('all');
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([0])); // 첫 번째 라운드는 기본 펼침

  // 피드백 상태 폴링
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollFeedbackStatus = async () => {
      try {
        const statusData = await interviewApi.getFeedbackStatus(sessionId);
        
        setFeedbackStatus(statusData.status as any);
        setProgress(statusData.progress);
        setError(statusData.error);
        
        if (statusData.status === 'completed' && statusData.report) {
          setFeedback(statusData.report);
          clearInterval(pollInterval);
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval);
        } else if (statusData.status === 'not_found') {
          // 기존 방식으로 피드백 생성 시도
          try {
            const feedbackData = await interviewApi.getFeedback(sessionId);
            setFeedback(feedbackData);
            setFeedbackStatus('completed');
            setProgress(100);
            clearInterval(pollInterval);
          } catch (error) {
            console.error('피드백 조회 실패:', error);
            setFeedbackStatus('failed');
            setError('피드백을 불러올 수 없습니다');
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('피드백 상태 확인 실패:', error);
        setFeedbackStatus('failed');
        setError('피드백 상태를 확인할 수 없습니다');
        clearInterval(pollInterval);
      }
    };

    // 즉시 한 번 실행
    pollFeedbackStatus();

    // 2초마다 상태 확인 (processing 상태일 때만)
    pollInterval = setInterval(() => {
      if (feedbackStatus === 'processing' || feedbackStatus === 'pending' || feedbackStatus === 'loading') {
        pollFeedbackStatus();
      } else {
        clearInterval(pollInterval);
      }
    }, 2000);

    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [sessionId, feedbackStatus]);

  // 면접 전사 데이터 조회 (피드백이 완료된 경우에만)
  const { data: transcript, isLoading: transcriptLoading } = useQuery({
    queryKey: ['interview-transcript', sessionId],
    queryFn: () => interviewApi.getTranscript(sessionId),
    enabled: feedbackStatus === 'completed' && !!feedback,
  });

  const isLoading = transcriptLoading;
  
  // 가상의 상세 Q&A 피드백 데이터
  const qaFeedbacks = transcript?.items.map((item, index) => ({
    question: item.question,
    answer: item.answer || '답변 없음',
    score: Math.floor(Math.random() * 2) + 3, // 3-5점
    strengths: [
      '구체적인 사례를 제시했습니다',
      'STAR 기법을 잘 활용했습니다',
    ],
    improvements: [
      '좀 더 간결하게 답변할 수 있을 것 같습니다',
      '수치적 성과를 추가하면 더 좋겠습니다',
    ],
    modelAnswer: '모범 답안 예시가 여기에 표시됩니다...',
  })) || [];

  // 피드백 생성 중인 경우 로딩 UI 표시
  if (feedbackStatus === 'processing' || feedbackStatus === 'pending' || feedbackStatus === 'loading') {
    return <FeedbackLoadingUI progress={progress} status={feedbackStatus} />;
  }

  // 피드백 생성 실패한 경우
  if (feedbackStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-primary mb-4">
              피드백 생성 실패
            </h2>
            <p className="text-text-secondary mb-6">
              {error || '피드백을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="flex-1"
              >
                돌아가기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 전사 데이터 로딩 중
  if (isLoading) {
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

  // 피드백 데이터가 없는 경우
  if (!feedback) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-danger mb-4">피드백 데이터를 찾을 수 없습니다.</p>
          <Button onClick={() => router.back()}>돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="success">
              면접 완료
            </Badge>
            <Badge variant="outline">
              Session #{sessionId}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">면접 피드백 리포트</h1>
          <p className="text-text-secondary">
            AI가 분석한 면접 결과와 개선 방향을 확인하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            리포트 다운로드
          </Button>
          <Button variant="outline" className="gap-2">
            <Share className="w-4 h-4" />
            공유하기
          </Button>
        </div>
      </div>

      {/* 핵심 요약 블록 */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="font-semibold text-blue-900 mb-4 text-xl">면접 평가 결과</h3>
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              {(() => {
                const evaluations = transcript?.items
                  ?.filter((item: any) => item.evaluation)
                  ?.map((item: any) => item.evaluation) || [];
                const badges = calculateDimensionScores(evaluations);
                
                return Object.entries(badges).map(([dim, score]) => (
                  <div key={dim} className="text-center">
                    {getDimensionBadge(dim, score)}
                  </div>
                ));
              })()}
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {(() => {
                  const evaluations = transcript?.items
                    ?.filter((item: any) => item.evaluation)
                    ?.map((item: any) => item.evaluation) || [];
                  const badges = calculateDimensionScores(evaluations);
                  const goldCount = Object.values(badges).filter(score => score === 'gold').length;
                  const totalCount = Object.keys(badges).length;
                  return `${goldCount}/${totalCount}`;
                })()} 항목 우수
              </div>
              <div className="text-sm text-blue-700">5개 평가 항목 중</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통합 Q&A 타임라인 */}
      {transcript?.items && transcript.items.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  면접 Q&A 타임라인
                </CardTitle>
                <CardDescription>
                  모든 질문, 답변, 평가를 한 곳에서 확인하세요
                </CardDescription>
              </div>
              
              {/* 간단한 필터 */}
              <div className="flex items-center gap-3">
                <select
                  value={timelineFilter}
                  onChange={(e) => setTimelineFilter(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded px-3 py-1 bg-white"
                >
                  <option value="all">전체</option>
                  <option value="main">메인만</option>
                  <option value="follow_up">꼬리만</option>
                </select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (expandedRounds.size === 0) {
                      const allRounds = new Set(
                        Object.keys(
                          transcript.items.reduce((acc: Record<number, any[]>, item: any) => {
                            const r = item.round ?? 0;
                            if (!acc[r]) acc[r] = [];
                            acc[r].push(item);
                            return acc;
                          }, {})
                        ).map(Number)
                      );
                      setExpandedRounds(allRounds);
                    } else {
                      setExpandedRounds(new Set());
                    }
                  }}
                  className="text-xs"
                >
                  {expandedRounds.size === 0 ? '모두 펼치기' : '모두 접기'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(
                transcript.items
                  .filter((item: any) => {
                    if (timelineFilter === 'main' && item.type !== 'main') return false;
                    if (timelineFilter === 'follow_up' && item.type !== 'follow_up') return false;
                    return true;
                  })
                  .reduce((acc: Record<number, any[]>, item: any) => {
                    const r = item.round ?? 0;
                    if (!acc[r]) acc[r] = [];
                    acc[r].push(item);
                    return acc;
                  }, {})
              ).map(([round, items]) => {
                const roundNum = parseInt(round);
                const isExpanded = expandedRounds.has(roundNum);
                
                return (
                  <div key={round} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        const newExpanded = new Set(expandedRounds);
                        if (isExpanded) {
                          newExpanded.delete(roundNum);
                        } else {
                          newExpanded.add(roundNum);
                        }
                        setExpandedRounds(newExpanded);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-sm">Round {round}</Badge>
                        <span className="text-sm text-text-secondary">
                          {items.length}개 질문
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary">
                          {isExpanded ? '접기' : '펼치기'}
                        </span>
                        <div className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          ▼
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 space-y-4">
                        {(items as any[]).map((it, idx) => (
                          <div key={idx} className="border-l-4 border-blue-200 pl-4">
                            {/* 질문 */}
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    it.type === 'main' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-300'
                                  }`}
                                >
                                  {it.type === 'main' ? '메인' : '꼬리'}
                                </Badge>
                                {it.evaluation && (
                                  (() => {
                                    const config = getRatingConfig(it.evaluation.rating);
                                    const IconComponent = config.icon;
                                    return (
                                      <Badge className={`${config.color} border text-xs`}>
                                        <IconComponent className="w-3 h-3 mr-1" />
                                        {config.label}
                                      </Badge>
                                    );
                                  })()
                                )}
                              </div>
                              <div className="text-sm text-text-primary leading-relaxed">
                                {it.question}
                              </div>
                            </div>
                            
                            {/* 답변 */}
                            {it.answer && (
                              <div className="mb-3">
                                <div className="text-xs text-text-secondary mb-1">답변:</div>
                                <div className="bg-blue-50 p-3 rounded-lg">
                                  <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                                    {it.answer}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* 평가 및 피드백 */}
                            {it.evaluation && (
                              <div className="space-y-3">
                                {/* Missing Dimensions */}
                                {it.evaluation.notes?.missing_dims && it.evaluation.notes.missing_dims.length > 0 && (
                                  <div>
                                    <div className="text-xs text-text-secondary mb-2">부족한 요소:</div>
                                    <MissingDimsChips missingDims={it.evaluation.notes.missing_dims} />
                                  </div>
                                )}
                                
                                {/* 액션 아이템 */}
                                {it.evaluation.notes?.hints && it.evaluation.notes.hints.length > 0 && (
                                  <div>
                                    <div className="text-xs text-text-secondary mb-2">개선 액션:</div>
                                    <ActionItems hints={it.evaluation.notes.hints} />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 종합 피드백 및 다음 단계 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 종합 피드백 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                종합 피드백
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 전체 요약 */}
                <div>
                  <h3 className="font-semibold text-text-primary mb-2">전체 요약</h3>
                  <p className="text-text-secondary leading-relaxed">{feedback.overall}</p>
                </div>
                
                {/* 상세 분석 */}
                {feedback.detailed_analysis && (
                  <div>
                    <h3 className="font-semibold text-text-primary mb-2">상세 분석</h3>
                    <p className="text-text-secondary leading-relaxed">{feedback.detailed_analysis}</p>
                  </div>
                )}
                
                {/* 강점과 개선점 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 강점 */}
                  <div>
                    <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      강점
                    </h3>
                    <ul className="space-y-2">
                      {feedback.strengths?.map((strength: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-text-secondary leading-relaxed">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* 개선점 */}
                  <div>
                    <h3 className="font-semibold text-orange-600 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      개선점
                    </h3>
                    <ul className="space-y-2">
                      {feedback.areas?.map((area: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-text-secondary leading-relaxed">{area}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 프로젝트 개선 제안 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                프로젝트 개선 제안
              </CardTitle>
              <CardDescription>
                면접 내용을 바탕으로 프로젝트 발전 방향을 제안합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 추가하면 좋을 내용 */}
                {feedback.project_suggestions?.additional_content && (
                  <div>
                    <h3 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      추가하면 좋을 내용
                    </h3>
                    <ul className="space-y-2">
                      {feedback.project_suggestions.additional_content.map((content: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <Plus className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-text-secondary leading-relaxed">{content}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* 구체화 방향 */}
                {feedback.project_suggestions?.concretization && (
                  <div>
                    <h3 className="font-semibold text-purple-600 mb-2 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      구체화 방향
                    </h3>
                    <ul className="space-y-2">
                      {feedback.project_suggestions.concretization.map((direction: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-text-secondary leading-relaxed">{direction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* 실무 적용 */}
                {feedback.project_suggestions?.practical_application && (
                  <div>
                    <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      실무 적용 방법
                    </h3>
                    <ul className="space-y-2">
                      {feedback.project_suggestions.practical_application.map((method: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <Briefcase className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-text-secondary leading-relaxed">{method}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 다음 단계 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                다음 단계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <MessageCircle className="w-4 h-4" />
                  다시 면접 연습하기
                </Button>
                <Link href="/experiences/new">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <FileText className="w-4 h-4" />
                    새 경험 추가하기
                  </Button>
                </Link>
                <Link href="/jobs/new">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Target className="w-4 h-4" />
                    새 공고 등록하기
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 성장 추이 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                성장 추이
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-green-600 mb-1">+3개</div>
                <div className="text-sm text-text-secondary">이전 면접 대비</div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">이번 면접</span>
                  <span className="font-medium">🥇 2개, 🥈 2개, 🥉 1개</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">이전 면접</span>
                  <span className="text-text-secondary">🥇 1개, 🥈 1개, 🥉 3개</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">첫 면접</span>
                  <span className="text-text-secondary">🥈 1개, 🥉 4개</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

