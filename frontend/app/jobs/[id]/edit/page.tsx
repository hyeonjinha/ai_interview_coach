'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, Trash2, Globe, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loading } from '@/components/ui/loading';
import { jobApi } from '@/lib/api';
import type { JobPostingCreate } from '@/types/api';

interface ApplicationQuestion {
  id: string;
  question: string;
}

export default function EditJobPage() {
  const params = useParams();
  const jobId = parseInt(params.id as string);
  const [currentStep, setCurrentStep] = useState(1);
  const [sourceType, setSourceType] = useState<'url' | 'manual'>('manual');
  
  // Step 1: Basic Info
  const [url, setUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  
  // Step 2: Job Details
  const [rawText, setRawText] = useState('');
  
  // Step 3: Application Questions
  const [applicationQuestions, setApplicationQuestions] = useState<ApplicationQuestion[]>([
    { id: '1', question: '' }
  ]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();

  // 기존 채용 공고 데이터 로드
  const { data: jobData, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobApi.get(jobId),
    enabled: !!jobId,
  });

  // 기존 데이터로 폼 초기화
  useEffect(() => {
    if (jobData) {
      setSourceType(jobData.source_type as 'url' | 'manual');
      setUrl(jobData.url || '');
      setRawText(jobData.raw_text || '');
      
      // application_qa 데이터를 applicationQuestions 형태로 변환
      if (jobData.application_qa && jobData.application_qa.length > 0) {
        const questions = jobData.application_qa.map((qa, index) => ({
          id: (index + 1).toString(),
          question: qa.question || ''
        }));
        setApplicationQuestions(questions);
      }

      // URL에서 회사명과 직무명 추출 시도 (기본값 설정)
      if (jobData.url) {
        try {
          const domain = new URL(jobData.url).hostname;
          setCompanyName(domain.replace('www.', '').split('.')[0]);
          setPosition('개발자'); // 기본값
        } catch (error) {
          setCompanyName('');
          setPosition('');
        }
      }
    }
  }, [jobData]);

  const updateMutation = useMutation({
    mutationFn: (data: JobPostingCreate) => jobApi.update(jobId, data),
    onSuccess: (data) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      router.push(`/jobs/${data.id}`);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || '공고 수정에 실패했습니다.';
      setErrors({ general: errorMessage });
    },
  });

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const addQuestion = () => {
    const newQuestion: ApplicationQuestion = {
      id: Date.now().toString(),
      question: ''
    };
    setApplicationQuestions([...applicationQuestions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    if (applicationQuestions.length > 1) {
      setApplicationQuestions(applicationQuestions.filter(q => q.id !== id));
    }
  };

  const updateQuestion = (id: string, question: string) => {
    setApplicationQuestions(applicationQuestions.map(q => 
      q.id === id ? { ...q, question } : q
    ));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (sourceType === 'url' && !url.trim()) {
          newErrors.url = 'URL을 입력해주세요.';
        }
        if (sourceType === 'manual') {
          if (!companyName.trim()) {
            newErrors.companyName = '회사명을 입력해주세요.';
          }
          if (!position.trim()) {
            newErrors.position = '직무명을 입력해주세요.';
          }
        }
        break;
      case 2:
        if (!rawText.trim()) {
          newErrors.rawText = '채용 공고 내용을 입력해주세요.';
        }
        break;
      case 3:
        const hasValidQuestions = applicationQuestions.some(q => q.question.trim());
        if (!hasValidQuestions) {
          newErrors.questions = '최소 하나의 지원서 질문을 입력해주세요.';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
    setErrors({});
  };

  const handleSubmit = () => {
    if (!validateStep(currentStep)) return;

    const validQuestions = applicationQuestions
      .filter(q => q.question.trim())
      .map(q => ({ question: q.question.trim() }));

    const jobData: JobPostingCreate = {
      source_type: sourceType,
      url: sourceType === 'url' ? url : undefined,
      raw_text: rawText.trim(),
      status: 'draft',
      application_qa: validQuestions,
    };

    updateMutation.mutate(jobData);
  };

  const loadFromUrl = async () => {
    if (!url.trim()) {
      setErrors({ url: 'URL을 입력해주세요.' });
      return;
    }

    setIsLoadingFromUrl(true);
    setErrors({});

    try {
      // URL에서 기본 정보 추출 (실제로는 백엔드에서 처리)
      const domain = new URL(url).hostname;
      setCompanyName(domain.replace('www.', '').split('.')[0]);
      setPosition('개발자'); // 기본값
      
      // 실제로는 백엔드에서 스크래핑된 내용을 받아올 것
      setRawText(`채용공고 URL: ${url}\n\n여기에 스크래핑된 내용이 표시됩니다.`);
      
      setCurrentStep(2);
    } catch (error) {
      setErrors({ url: '올바른 URL을 입력해주세요.' });
    } finally {
      setIsLoadingFromUrl(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-text-secondary">채용 공고를 찾을 수 없습니다.</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            돌아가기
          </Button>
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
          <h1 className="text-3xl font-bold text-text-primary">공고 수정</h1>
          <p className="text-text-secondary">채용 공고 정보를 수정하세요</p>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-4xl mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">
            단계 {currentStep} / {totalSteps}
          </span>
          <span className="text-sm text-text-secondary">
            {Math.round(progress)}% 완료
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step Labels */}
        <div className="flex justify-between mt-4 text-sm">
          <span className={currentStep >= 1 ? 'text-primary font-medium' : 'text-text-secondary'}>
            기본 정보
          </span>
          <span className={currentStep >= 2 ? 'text-primary font-medium' : 'text-text-secondary'}>
            상세 내용
          </span>
          <span className={currentStep >= 3 ? 'text-primary font-medium' : 'text-text-secondary'}>
            지원서 질문
          </span>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {errors.general && (
          <div className="p-3 text-sm text-danger bg-red-50 border border-red-200 rounded-component">
            {errors.general}
          </div>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>
                채용 공고의 기본 정보를 수정하거나 URL에서 가져오세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Source Type Selection */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  입력 방식 선택
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSourceType('manual')}
                    className={`p-4 border-2 rounded-component text-left transition-colors ${
                      sourceType === 'manual'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <h3 className="font-medium">직접 입력</h3>
                    </div>
                    <p className="text-sm text-text-secondary">
                      회사명과 직무명을 직접 입력합니다
                    </p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSourceType('url')}
                    className={`p-4 border-2 rounded-component text-left transition-colors ${
                      sourceType === 'url'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Globe className="w-5 h-5 text-primary" />
                      <h3 className="font-medium">URL에서 가져오기</h3>
                    </div>
                    <p className="text-sm text-text-secondary">
                      채용 사이트 URL에서 자동으로 정보를 추출합니다
                    </p>
                  </button>
                </div>
              </div>

              {/* URL Input */}
              {sourceType === 'url' && (
                <div>
                  <Input
                    label="채용 공고 URL"
                    placeholder="https://example.com/jobs/123"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    error={errors.url}
                    required
                  />
                  <div className="mt-4">
                    <Button 
                      type="button" 
                      onClick={loadFromUrl}
                      loading={isLoadingFromUrl}
                      className="gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      URL에서 정보 가져오기
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual Input */}
              {sourceType === 'manual' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="회사명"
                    placeholder="회사명을 입력하세요"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    error={errors.companyName}
                    required
                  />
                  <Input
                    label="직무명"
                    placeholder="직무명을 입력하세요"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    error={errors.position}
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Job Details */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>상세 내용</CardTitle>
              <CardDescription>
                채용 공고의 상세 내용을 수정하세요 (주요 업무, 자격 요건, 우대 사항 등)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                label="채용 공고 내용"
                placeholder="주요 업무, 자격 요건, 우대 사항 등 채용 공고의 전체 내용을 복사해서 붙여넣거나 직접 입력하세요"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                error={errors.rawText}
                required
                rows={15}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Application Questions */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>지원서 질문</CardTitle>
              <CardDescription>
                면접에서 활용할 지원서 질문들을 수정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {applicationQuestions.map((question, index) => (
                <div key={question.id} className="flex gap-2">
                  <div className="flex-1">
                    <Textarea
                      label={`질문 ${index + 1}`}
                      placeholder="지원서 질문을 입력하세요"
                      value={question.question}
                      onChange={(e) => updateQuestion(question.id, e.target.value)}
                      rows={3}
                    />
                  </div>
                  {applicationQuestions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(question.id)}
                      className="mt-8"
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </Button>
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                질문 추가
              </Button>
              
              {errors.questions && (
                <p className="text-sm text-danger">{errors.questions}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? () => router.back() : handlePrevious}
          >
            {currentStep === 1 ? '취소' : '이전'}
          </Button>
          
          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>
              다음
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit}
              loading={updateMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              수정 완료
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
