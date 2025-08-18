'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  Plus, 
  FileText, 
  Briefcase, 
  MessageCircle, 
  TrendingUp,
  Clock,
  Target,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading, CardSkeleton } from '@/components/ui/loading';
import { dashboardApi } from '@/lib/api';
import { formatRelativeTime, getStatusText, getStatusBadgeStyle } from '@/lib/utils';

export default function DashboardPage() {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getSummary,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-danger mb-4">대시보드 데이터를 불러오는데 실패했습니다.</p>
          <Button onClick={() => window.location.reload()}>다시 시도</Button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: '내 경험',
      value: summary?.experiences || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      href: '/experiences',
    },
    {
      title: '지원 공고',
      value: summary?.jobs || 0,
      icon: Briefcase,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      href: '/jobs',
    },
    {
      title: '면접 세션',
      value: summary?.sessions || 0,
      icon: MessageCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      href: '/interviews',
    },
    {
      title: '성장률',
      value: '85%',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      href: '#',
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">대시보드</h1>
        <p className="text-text-secondary">
          AI 면접 도우미와 함께 면접 준비 현황을 확인하세요
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-4">
          <Link href="/jobs/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              새 공고 등록
            </Button>
          </Link>
          <Link href="/experiences/new">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              경험 추가
            </Button>
          </Link>
          <Link href="/interviews/new">
            <Button variant="secondary" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              면접 시작
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Link key={index} href={stat.href}>
            <Card className="card-hover cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-text-primary">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              최근 면접 세션
            </CardTitle>
            <CardDescription>
              최근에 진행한 면접 연습 기록입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.recent && summary.recent.length > 0 ? (
              <div className="space-y-4">
                {summary.recent.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-component hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline" 
                          className={getStatusBadgeStyle(session.status)}
                        >
                          {getStatusText(session.status)}
                        </Badge>
                        <span className="text-sm text-text-secondary">
                          Round {session.round}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">
                        공고 ID: {session.job_posting_id}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatRelativeTime(session.created_at)}
                      </p>
                    </div>
                    <Link href={`/interviews/${session.id}`}>
                      <Button variant="ghost" size="sm">
                        보기
                      </Button>
                    </Link>
                  </div>
                ))}
                <div className="text-center pt-4">
                  <Link href="/interviews">
                    <Button variant="outline" size="sm">
                      모든 세션 보기
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-text-secondary mb-4">아직 면접 세션이 없습니다</p>
                <Link href="/interviews/new">
                  <Button size="sm">첫 면접 시작하기</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              면접 준비 팁
            </CardTitle>
            <CardDescription>
              더 나은 면접을 위한 조언
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs font-medium text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">
                    경험을 구체적으로 작성하세요
                  </h4>
                  <p className="text-sm text-text-secondary">
                    STAR 기법을 활용해 상황, 과제, 행동, 결과를 명확히 기술하세요.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs font-medium text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">
                    공고를 자세히 분석하세요
                  </h4>
                  <p className="text-sm text-text-secondary">
                    직무 요구사항과 회사 문화를 파악해 맞춤형 답변을 준비하세요.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs font-medium text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">
                    반복 연습이 핵심입니다
                  </h4>
                  <p className="text-sm text-text-secondary">
                    다양한 시나리오로 여러 번 연습해 자신감을 높이세요.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

