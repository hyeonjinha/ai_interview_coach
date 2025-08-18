'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { jobApi, experienceApi, interviewApi } from '@/lib/api';
import { useAuth } from '@/lib/store';

export default function NewInterviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedExperienceIds, setSelectedExperienceIds] = useState<number[]>([]);

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: jobApi.list,
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ['experiences'],
    queryFn: experienceApi.list,
  });

  const startInterviewMutation = useMutation({
    mutationFn: interviewApi.start,
    onSuccess: (data) => {
      router.push(`/interviews/${data.session_id}`);
    },
    onError: (error) => {
      console.error('Failed to start interview:', error);
      alert('면접 시작에 실패했습니다.');
    },
  });

  // 회사명과 직무 추출 함수
  const extractJobInfo = (job: any) => {
    const sections = job.sections || {};
    const mainText = sections.main || job.raw_text || '';
    
    // 간단한 휴리스틱으로 회사명과 직무 추출
    const lines = mainText.split('\n').filter((line: string) => line.trim());
    const companyName = lines[0] || '회사명 미상';
    const position = lines[1] || '직무 미상';
    
    return { companyName, position };
  };

  const handleStartInterview = () => {
    if (!selectedJobId) {
      alert('채용공고를 선택해주세요.');
      return;
    }

    if (selectedExperienceIds.length === 0) {
      alert('최소 하나의 경험을 선택해주세요.');
      return;
    }

    startInterviewMutation.mutate({
      job_posting_id: selectedJobId,
      selected_experience_ids: selectedExperienceIds,
    });
  };

  const handleExperienceToggle = (id: number) => {
    setSelectedExperienceIds(prev => 
      prev.includes(id) 
        ? prev.filter(expId => expId !== id)
        : [...prev, id]
    );
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return <div>로그인이 필요합니다.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-text-primary mb-6">새 면접 시작</h1>

      <div className="space-y-6">
        {/* 채용공고 선택 */}
        <div className="bg-white rounded-card shadow-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">채용공고 선택</h2>
          <div className="space-y-3">
            {jobs.map((job) => {
              const { companyName, position } = extractJobInfo(job);
              return (
                <label key={job.id} className="flex items-center space-x-3 p-3 border rounded-component hover:bg-gray-50">
                  <input
                    type="radio"
                    name="job"
                    value={job.id}
                    checked={selectedJobId === job.id}
                    onChange={(e) => setSelectedJobId(Number(e.target.value))}
                    className="w-4 h-4 text-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">{position}</div>
                    <div className="text-sm text-text-secondary">{companyName}</div>
                  </div>
                </label>
              );
            })}
            {jobs.length === 0 && (
              <div className="text-text-secondary text-center py-4">
                등록된 채용공고가 없습니다. 
                <button 
                  onClick={() => router.push('/jobs/new')}
                  className="text-primary hover:underline ml-1"
                >
                  새 채용공고 등록
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 경험 선택 */}
        <div className="bg-white rounded-card shadow-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">면접에 활용할 경험 선택</h2>
          <p className="text-sm text-text-secondary mb-4">면접에서 활용하고 싶은 경험을 선택해주세요. (복수 선택 가능)</p>
          <div className="space-y-3">
            {experiences.map((experience) => (
              <label key={experience.id} className="flex items-center space-x-3 p-3 border rounded-component hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedExperienceIds.includes(experience.id)}
                  onChange={() => handleExperienceToggle(experience.id)}
                  className="w-4 h-4 text-primary"
                />
                <div className="flex-1">
                  <div className="font-medium text-text-primary">{experience.title || '경험 제목'}</div>
                  <div className="text-sm text-text-secondary">{experience.content?.company || experience.content?.organization || '조직명 미상'}</div>
                  <div className="text-sm text-text-secondary mt-1">
                    {experience.start_date} ~ {experience.end_date || '현재'}
                  </div>
                </div>
              </label>
            ))}
            {experiences.length === 0 && (
              <div className="text-text-secondary text-center py-4">
                등록된 경험이 없습니다. 
                <button 
                  onClick={() => router.push('/experiences/new')}
                  className="text-primary hover:underline ml-1"
                >
                  새 경험 등록
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 면접 시작 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={handleStartInterview}
            disabled={!selectedJobId || selectedExperienceIds.length === 0 || startInterviewMutation.isPending}
            className="px-8 py-3 bg-primary text-white rounded-component hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {startInterviewMutation.isPending ? '면접 준비 중...' : '면접 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}
