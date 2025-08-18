import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 날짜 포맷팅
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 상대 시간 계산
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return '방금 전';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}분 전`;
  } else if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  } else if (diffInDays < 7) {
    return `${diffInDays}일 전`;
  } else {
    return formatDate(d);
  }
}

// D-Day 계산
export function calculateDDay(targetDate: string | Date): string {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  
  const diffInMs = target.getTime() - today.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 0) {
    return `D+${Math.abs(diffInDays)}`;
  } else if (diffInDays === 0) {
    return 'D-Day';
  } else {
    return `D-${diffInDays}`;
  }
}

// 텍스트 트렁케이트
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// 면접 시간 포맷팅
export function formatInterviewDuration(startTime: Date, endTime?: Date): string {
  const end = endTime || new Date();
  const diffInMs = end.getTime() - startTime.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(diffInSeconds / 60);
  const seconds = diffInSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 파일 크기 포맷팅
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 점수를 색상으로 변환
export function getScoreColor(score: number): string {
  if (score >= 4.5) return 'text-green-600';
  if (score >= 3.5) return 'text-blue-600';
  if (score >= 2.5) return 'text-yellow-600';
  return 'text-red-600';
}

// 점수를 배경 색상으로 변환
export function getScoreBgColor(score: number): string {
  if (score >= 4.5) return 'bg-green-100';
  if (score >= 3.5) return 'bg-blue-100';
  if (score >= 2.5) return 'bg-yellow-100';
  return 'bg-red-100';
}

// 상태에 따른 배지 스타일
export function getStatusBadgeStyle(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'applied':
      return 'bg-blue-100 text-blue-800';
    case 'interviewing':
      return 'bg-yellow-100 text-yellow-800';
    case 'offer':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// 상태 한글 변환
export function getStatusText(status: string): string {
  switch (status) {
    case 'draft':
      return '임시저장';
    case 'applied':
      return '지원완료';
    case 'interviewing':
      return '면접중';
    case 'offer':
      return '합격';
    case 'rejected':
      return '불합격';
    case 'active':
      return '진행중';
    case 'completed':
      return '완료';
    default:
      return status;
  }
}

// 경험 카테고리 한글 변환
export function getCategoryText(category: string): string {
  switch (category) {
    case 'project':
      return '프로젝트';
    case 'career':
      return '경력';
    case 'education':
      return '학력';
    case 'certification':
      return '자격증';
    case 'language':
      return '어학';
    default:
      return category;
  }
}

// 질문 타입 한글 변환
export function getQuestionTypeText(type: string): string {
  switch (type) {
    case 'main':
      return '주 질문';
    case 'follow_up':
      return '꼬리 질문';
    default:
      return type;
  }
}

// 로딩 상태 메시지
export function getLoadingMessage(context: string): string {
  switch (context) {
    case 'analyzing':
      return 'AI가 경험을 분석하고 있습니다';
    case 'generating':
      return 'AI가 질문을 생성하고 있습니다';
    case 'evaluating':
      return 'AI가 답변을 평가하고 있습니다';
    case 'transcribing':
      return '음성을 텍스트로 변환하고 있습니다';
    default:
      return '처리 중입니다';
  }
}

