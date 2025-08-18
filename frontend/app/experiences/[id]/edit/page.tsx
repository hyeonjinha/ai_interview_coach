'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { experienceApi } from '@/lib/api';
import { getCategoryText } from '@/lib/utils';
import type { ExperienceCreate } from '@/types/api';

const categories = [
  { value: 'project', label: '프로젝트', description: '개인/팀 프로젝트 경험' },
  { value: 'career', label: '경력', description: '직장, 인턴십, 아르바이트 경험' },
  { value: 'education', label: '학력', description: '학교, 교육 과정 경험' },
  { value: 'certification', label: '자격증', description: '취득한 자격증이나 인증' },
  { value: 'language', label: '어학', description: '언어 능력이나 어학 연수 경험' },
];

const contentFields = {
  project: [
    { key: 'description', label: '프로젝트 설명', type: 'textarea', required: true },
    { key: 'role', label: '역할', type: 'input', required: true },
    { key: 'technologies', label: '사용 기술', type: 'input', required: false },
    { key: 'achievements', label: '성과', type: 'textarea', required: false },
    { key: 'challenges', label: '어려웠던 점과 해결 방법', type: 'textarea', required: false },
  ],
  career: [
    { key: 'company', label: '회사명', type: 'input', required: true },
    { key: 'position', label: '직책/직무', type: 'input', required: true },
    { key: 'responsibilities', label: '주요 업무', type: 'textarea', required: true },
    { key: 'achievements', label: '성과', type: 'textarea', required: false },
    { key: 'skills', label: '습득한 스킬', type: 'textarea', required: false },
  ],
  education: [
    { key: 'institution', label: '기관명', type: 'input', required: true },
    { key: 'major', label: '전공/과정', type: 'input', required: true },
    { key: 'grade', label: '성적/등급', type: 'input', required: false },
    { key: 'activities', label: '주요 활동', type: 'textarea', required: false },
    { key: 'thesis', label: '논문/프로젝트', type: 'textarea', required: false },
  ],
  certification: [
    { key: 'name', label: '자격증명', type: 'input', required: true },
    { key: 'issuer', label: '발급기관', type: 'input', required: true },
    { key: 'score', label: '점수/등급', type: 'input', required: false },
    { key: 'preparation', label: '준비 과정', type: 'textarea', required: false },
    { key: 'application', label: '활용 방안', type: 'textarea', required: false },
  ],
  language: [
    { key: 'language', label: '언어', type: 'input', required: true },
    { key: 'level', label: '수준', type: 'input', required: true },
    { key: 'test_score', label: '시험 점수', type: 'input', required: false },
    { key: 'experience', label: '사용 경험', type: 'textarea', required: false },
    { key: 'study_method', label: '학습 방법', type: 'textarea', required: false },
  ],
};

export default function EditExperiencePage() {
  const params = useParams();
  const experienceId = parseInt(params.id as string);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [content, setContent] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();
  const queryClient = useQueryClient();

  // 기존 경험 데이터 로드
  const { data: experienceData, isLoading } = useQuery({
    queryKey: ['experience', experienceId],
    queryFn: () => experienceApi.get(experienceId),
    enabled: !!experienceId,
  });

  // 기존 데이터로 폼 초기화
  useEffect(() => {
    if (experienceData) {
      setSelectedCategory(experienceData.category || '');
      setTitle(experienceData.title || '');
      setStartDate(experienceData.start_date || '');
      setEndDate(experienceData.end_date || '');
      setContent(experienceData.content || {});
    }
  }, [experienceData]);

  const updateMutation = useMutation({
    mutationFn: (data: ExperienceCreate) => experienceApi.update(experienceId, data),
    onSuccess: () => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['experience', experienceId] });
      router.push('/experiences');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || '경험 수정에 실패했습니다.';
      setErrors({ general: errorMessage });
    },
  });

  const handleContentChange = (key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};

    if (!selectedCategory) {
      newErrors.category = '카테고리를 선택해주세요.';
    }

    if (!title.trim()) {
      newErrors.title = '제목을 입력해주세요.';
    }

    // 필수 필드 검사
    if (selectedCategory) {
      const fields = contentFields[selectedCategory as keyof typeof contentFields];
      fields.forEach(field => {
        if (field.required && !content[field.key]?.trim()) {
          newErrors[field.key] = `${field.label}을(를) 입력해주세요.`;
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const experienceData: ExperienceCreate = {
      category: selectedCategory,
      title: title.trim(),
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      content,
    };

    updateMutation.mutate(experienceData);
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

  if (!experienceData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-text-secondary">경험을 찾을 수 없습니다.</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const currentFields = selectedCategory ? contentFields[selectedCategory as keyof typeof contentFields] : [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">경험 수정</h1>
          <p className="text-text-secondary">경험 정보를 수정하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {errors.general && (
          <div className="p-3 text-sm text-danger bg-red-50 border border-red-200 rounded-component">
            {errors.general}
          </div>
        )}

        {/* Category Selection */}
        <Card>
          <CardHeader>
            <CardTitle>카테고리 선택</CardTitle>
            <CardDescription>어떤 종류의 경험인지 선택해주세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setSelectedCategory(category.value)}
                  className={`p-4 border-2 rounded-component text-left transition-colors ${
                    selectedCategory === category.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-medium text-text-primary mb-1">{category.label}</h3>
                  <p className="text-sm text-text-secondary">{category.description}</p>
                </button>
              ))}
            </div>
            {errors.category && (
              <p className="text-sm text-danger mt-2">{errors.category}</p>
            )}
          </CardContent>
        </Card>

        {/* Basic Information */}
        {selectedCategory && (
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>경험의 기본적인 정보를 수정해주세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="제목"
                placeholder="경험의 제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="시작일"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  label="종료일"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Content */}
        {selectedCategory && (
          <Card>
            <CardHeader>
              <CardTitle>상세 내용</CardTitle>
              <CardDescription>
                {getCategoryText(selectedCategory)} 경험에 대한 구체적인 내용을 수정해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentFields.map((field) => (
                <div key={field.key}>
                  {field.type === 'textarea' ? (
                    <Textarea
                      label={field.label}
                      placeholder={`${field.label}을(를) 입력하세요`}
                      value={content[field.key] || ''}
                      onChange={(e) => handleContentChange(field.key, e.target.value)}
                      error={errors[field.key]}
                      required={field.required}
                      rows={4}
                    />
                  ) : (
                    <Input
                      label={field.label}
                      placeholder={`${field.label}을(를) 입력하세요`}
                      value={content[field.key] || ''}
                      onChange={(e) => handleContentChange(field.key, e.target.value)}
                      error={errors[field.key]}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {selectedCategory && (
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              취소
            </Button>
            <Button type="submit" loading={updateMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" />
              수정 완료
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

