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
  X
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
  const [showOnlyGood, setShowOnlyGood] = useState(false);
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

      {/* TL;DR 요약 블록 */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 평가 항목별 배지 */}
            <div className="text-center">
              <h3 className="font-semibold text-blue-900 mb-3">평가 항목별 배지</h3>
              <div className="flex flex-wrap justify-center gap-2">
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
            </div>
            
            {/* 핵심 강점 */}
            <div>
              <h3 className="font-semibold text-blue-900 mb-3">핵심 강점</h3>
              <div className="space-y-2">
                {feedback.strengths?.slice(0, 2).map((strength: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-blue-800">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="line-clamp-2">{strength}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 즉시 실행 액션 */}
            <div>
              <h3 className="font-semibold text-blue-900 mb-3">즉시 실행</h3>
              <div className="space-y-2">
                {feedback.areas?.slice(0, 3).map((area: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`action-${index}`}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor={`action-${index}`} className="text-sm text-blue-800 cursor-pointer line-clamp-2">
                      {area}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 면접 타임라인 */}
          {transcript?.items && transcript.items.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      면접 타임라인 (라운드별 흐름)
                    </CardTitle>
                    <CardDescription>
                      메인 질문과 꼬리 질문의 진행 흐름을 라운드별로 확인하세요
                    </CardDescription>
                  </div>
                  
                  {/* 필터 및 토글 버튼 */}
                  <div className="flex items-center gap-3">
                    {/* 질문 타입 필터 */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-secondary">질문:</span>
                      <select
                        value={timelineFilter}
                        onChange={(e) => setTimelineFilter(e.target.value as any)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                      >
                        <option value="all">전체</option>
                        <option value="main">메인만</option>
                        <option value="follow_up">꼬리만</option>
                      </select>
                    </div>
                    
                    {/* GOOD만 보기 토글 */}
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={showOnlyGood}
                        onChange={(e) => setShowOnlyGood(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                      우수 답변만
                    </label>
                    
                    {/* 모두 접기/펼치기 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (expandedRounds.size === 0) {
                          // 모든 라운드 펼치기
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
                          // 모든 라운드 접기
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
                <div className="space-y-6">
                  {Object.entries(
                    transcript.items
                      .filter((item: any) => {
                        // 질문 타입 필터
                        if (timelineFilter === 'main' && item.type !== 'main') return false;
                        if (timelineFilter === 'follow_up' && item.type !== 'follow_up') return false;
                        
                        // GOOD만 보기 필터
                        if (showOnlyGood && item.evaluation?.rating !== 'GOOD') return false;
                        
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
                      <div key={round} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Round {round}</Badge>
                            <span className="text-sm text-text-secondary">
                              ({items.length}개 질문)
                            </span>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newExpanded = new Set(expandedRounds);
                              if (isExpanded) {
                                newExpanded.delete(roundNum);
                              } else {
                                newExpanded.add(roundNum);
                              }
                              setExpandedRounds(newExpanded);
                            }}
                            className="text-xs"
                          >
                            {isExpanded ? '접기' : '펼치기'}
                          </Button>
                        </div>
                        
                        {isExpanded && (
                          <div className="space-y-3">
                            {(items as any[]).map((it, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  it.type === 'main' ? 'bg-blue-100' : 'bg-gray-200'
                                }`}>
                                  <MessageCircle className={`w-4 h-4 ${it.type === 'main' ? 'text-blue-600' : 'text-gray-600'}`} />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm text-text-secondary">
                                    <span className="font-medium mr-2">{it.type === 'main' ? '메인' : '꼬리'}</span>
                                    <span className="text-text-primary">{it.question}</span>
                                  </div>
                                  {it.answer && (
                                    <div className="mt-2 bg-blue-50 p-3 rounded-component">
                                      <div className="text-xs text-text-secondary whitespace-pre-wrap">{it.answer}</div>
                                    </div>
                                  )}
                                  {it.evaluation && (
                                    <div className="mt-3 space-y-2">
                                      {/* 등급 뱃지 */}
                                      <div className="flex items-center gap-2">
                                        {(() => {
                                          const config = getRatingConfig(it.evaluation.rating);
                                          const IconComponent = config.icon;
                                          return (
                                            <Badge className={`${config.color} border`}>
                                              <IconComponent className="w-3 h-3 mr-1" />
                                              {config.label}
                                            </Badge>
                                          );
                                        })()}
                                      </div>
                                      
                                      {/* Missing Dimensions 칩 */}
                                      {it.evaluation.notes?.missing_dims && it.evaluation.notes.missing_dims.length > 0 && (
                                        <div>
                                          <span className="text-xs text-text-secondary mr-2">부족한 요소:</span>
                                          <MissingDimsChips missingDims={it.evaluation.notes.missing_dims} />
                                        </div>
                                      )}
                                      
                                      {/* 액션 아이템 */}
                                      {it.evaluation.notes?.hints && it.evaluation.notes.hints.length > 0 && (
                                        <div>
                                          <span className="text-xs text-text-secondary mb-2 block">개선 액션:</span>
                                          <ActionItems hints={it.evaluation.notes.hints} />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
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
          {/* 종합 평가 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                종합 평가
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                {/* 평가 항목별 배지 요약 */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">항목별 평가 결과</h3>
                  <div className="flex flex-wrap justify-center gap-3">
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
                </div>
                
                {/* 종합 피드백 */}
                <div className="prose max-w-none">
                  <p className="text-text-secondary">{feedback.overall}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 강점과 개선점 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  강점
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feedback.strengths.map((strength: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-text-secondary">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="w-5 h-5" />
                  개선점
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feedback.areas.map((area: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-text-secondary">{area}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* 모범 답안 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                모범 답안 예시
              </CardTitle>
              <CardDescription>
                비슷한 질문에 대한 모범적인 답변 방식을 참고하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-component p-4">
                <p className="text-sm text-text-secondary whitespace-pre-wrap">
                  {feedback.model_answer}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Q&A 다시보기 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Q&A 다시보기
              </CardTitle>
              <CardDescription>
                각 질문별 상세 평가와 개선 방향을 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-4">
                {qaFeedbacks.map((qa, index) => (
                  <AccordionItem key={index} value={`qa-${index}`} className="border rounded-component p-4">
                    <AccordionTrigger className="text-left hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div>
                          <span className="text-lg font-medium">질문 {index + 1}</span>
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                            {qa.question}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < qa.score ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">{qa.score}/5</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      {/* 질문 */}
                      <div>
                        <h4 className="font-medium text-text-primary mb-2">질문</h4>
                        <div className="bg-gray-50 p-3 rounded-component">
                          <p className="text-sm text-text-secondary">{qa.question}</p>
                        </div>
                      </div>
                      
                      {/* 내 답변 */}
                      <div>
                        <h4 className="font-medium text-text-primary mb-2">내 답변</h4>
                        <div className="bg-blue-50 p-3 rounded-component">
                          <p className="text-sm text-text-secondary whitespace-pre-wrap">{qa.answer}</p>
                        </div>
                      </div>

                      {/* 상세 평가 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-green-600 mb-2 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            잘한 점
                          </h4>
                          <ul className="space-y-1">
                            {qa.strengths.map((strength, i) => (
                              <li key={i} className="text-sm text-text-secondary flex items-start gap-1">
                                <span className="text-green-500">•</span>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-orange-600 mb-2 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            개선할 점
                          </h4>
                          <ul className="space-y-1">
                            {qa.improvements.map((improvement, i) => (
                              <li key={i} className="text-sm text-text-secondary flex items-start gap-1">
                                <span className="text-orange-500">•</span>
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* 모범 답안 */}
                      <div>
                        <h4 className="font-medium text-text-primary mb-2">모범 답안 예시</h4>
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-component">
                          <p className="text-sm text-text-secondary">{qa.modelAnswer}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 역량별 평가 배지 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                역량별 평가
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const evaluations = transcript?.items
                    ?.filter((item: any) => item.evaluation)
                    ?.map((item: any) => item.evaluation) || [];
                  const badges = calculateDimensionScores(evaluations);
                  
                  return Object.entries(badges).map(([dim, score]) => (
                    <div key={dim} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-text-secondary">
                        {dim === 'understanding' ? '이해도' : 
                         dim === 'quantitative' ? '정량성' :
                         dim === 'justification' ? '정당화' :
                         dim === 'tradeoff' ? '트레이드오프' :
                         dim === 'process' ? '과정' : dim}
                      </span>
                      <div className="flex items-center gap-2">
                        {getDimensionBadge(dim, score)}
                      </div>
                    </div>
                  ));
                })()}
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
        </div>
      </div>
    </div>
  );
}

