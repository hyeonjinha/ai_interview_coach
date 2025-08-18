'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Brain, FileText, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FeedbackLoadingUIProps {
  progress: number;
  status: string;
}

export function FeedbackLoadingUI({ progress, status }: FeedbackLoadingUIProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { 
      name: "면접 데이터 수집", 
      threshold: 30, 
      icon: FileText,
      description: "질문과 답변을 정리하고 있습니다" 
    },
    { 
      name: "답변 품질 평가", 
      threshold: 50, 
      icon: Target,
      description: "STAR 구조와 기술적 깊이를 분석하고 있습니다" 
    },
    { 
      name: "AI 피드백 생성", 
      threshold: 80, 
      icon: Brain,
      description: "개인 맞춤형 개선사항을 찾고 있습니다" 
    },
    { 
      name: "리포트 완성", 
      threshold: 100, 
      icon: CheckCircle,
      description: "최종 피드백 리포트를 완성하고 있습니다" 
    },
  ];

  const getStepMessage = (progress: number) => {
    if (progress < 30) return "면접 내용을 분석하고 있습니다...";
    if (progress < 50) return "답변의 품질을 평가하고 있습니다...";
    if (progress < 80) return "AI가 맞춤형 피드백을 생성하고 있습니다...";
    return "최종 리포트를 완성하고 있습니다...";
  };

  const getEstimatedTime = (progress: number) => {
    const remaining = 100 - progress;
    return Math.max(1, Math.ceil(remaining / 20)); // 20% per minute 가정
  };

  useEffect(() => {
    const current = steps.findIndex(step => progress < step.threshold);
    setCurrentStep(current === -1 ? steps.length - 1 : current);
  }, [progress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardContent className="p-12">
          {/* 메인 로딩 애니메이션 */}
          <div className="text-center mb-12">
            <div className="relative w-32 h-32 mx-auto mb-8">
              {/* 외부 원 */}
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              {/* 진행률 원 */}
              <div 
                className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"
                style={{
                  background: `conic-gradient(from 0deg, #4A90E2 ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`
                }}
              ></div>
              {/* 중앙 아이콘 */}
              <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Brain className="w-12 h-12 text-primary animate-pulse" />
              </div>
              {/* 진행률 텍스트 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white rounded-full px-3 py-1 shadow-md mt-16">
                  <span className="text-lg font-bold text-primary">{progress}%</span>
                </div>
              </div>
            </div>

            {/* 제목 */}
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              AI가 면접을 분석하고 있습니다
            </h2>
            
            {/* 상태 메시지 */}
            <p className="text-lg text-text-secondary mb-8">
              {getStepMessage(progress)}
            </p>
          </div>

          {/* 진행률 바 */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-text-secondary mb-3">
              <span>분석 진행률</span>
              <span className="font-medium">{progress}% 완료</span>
            </div>
            <Progress value={progress} className="h-4 bg-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </Progress>
          </div>

          {/* 예상 소요 시간 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-center gap-3 text-blue-700">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">
                예상 남은 시간: 약 {getEstimatedTime(progress)}분
              </span>
            </div>
          </div>

          {/* 단계별 체크리스트 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4 text-center">
              분석 단계
            </h3>
            {steps.map((step, index) => {
              const isCompleted = progress >= step.threshold;
              const isActive = index === currentStep;
              const Icon = step.icon;
              
              return (
                <div 
                  key={index} 
                  className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-300 ${
                    isActive ? 'bg-primary/10 border border-primary/20' : 'bg-gray-50'
                  }`}
                >
                  {/* 아이콘 */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-300 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                    )}
                  </div>
                  
                  {/* 단계 정보 */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${
                        isCompleted 
                          ? 'text-green-600' 
                          : isActive 
                          ? 'text-primary' 
                          : 'text-text-secondary'
                      }`}>
                        {step.name}
                      </span>
                      {isActive && !isCompleted && (
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-100"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200"></div>
                        </div>
                      )}
                      {isCompleted && (
                        <span className="text-green-600 text-sm font-medium">완료</span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${
                      isActive ? 'text-text-primary' : 'text-text-secondary'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 로딩 상태 정보 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-text-secondary">
                AI가 {status === 'processing' ? '열심히' : ''} 분석 중입니다. 잠시만 기다려주세요.
              </p>
              <p className="text-xs text-text-secondary mt-2">
                페이지를 새로고침하거나 닫지 마세요. 분석이 완료되면 자동으로 결과를 보여드립니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FeedbackLoadingUI;





