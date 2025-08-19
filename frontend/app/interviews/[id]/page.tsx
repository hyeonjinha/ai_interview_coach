'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { interviewApi } from '@/lib/api';
import { useInterviewStore } from '@/stores/interview';

export default function ResumeInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params.id as string);

  const { data: nextQ } = useQuery({
    queryKey: ['interview-next', id],
    queryFn: () => interviewApi.nextQuestion(id),
  });

  useEffect(() => {
    if (!nextQ) return;
    // 최소한의 상태로 복구: sessionId만 세팅해도 진행 가능
    useInterviewStore.setState({
      sessionId: id,
      currentQuestionId: nextQ.question_id,
      currentQuestionType: nextQ.question_type,
      currentRound: nextQ.round_index,
    });
    // 재개는 기존 인터뷰 페이지로 이동 (jobId 경로 대신 세션 기반 페이지 유지)
    router.push(`/jobs/${id}/interview`);
  }, [nextQ]);

  return <div className="p-6">세션을 복구하는 중...</div>;
}


