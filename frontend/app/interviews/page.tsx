'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  MessageCircle, 
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  Search,
  FileText,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading, ListSkeleton } from '@/components/ui/loading';
import { interviewApi } from '@/lib/api';
import { formatDate, formatRelativeTime, getStatusText, getStatusBadgeStyle } from '@/lib/utils';

export default function InterviewsPage() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['interview-sessions'],
    queryFn: () => interviewApi.listSessions(true),
  });

  // 필터링된 세션들
  const filteredSessions = sessions?.filter((session) => {
    const matchesSearch = !searchTerm || 
      session.id.toString().includes(searchTerm) ||
      session.job_posting_id.toString().includes(searchTerm);
    
    const matchesStatus = selectedStatus === 'all' || session.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const statuses = ['all', 'active', 'completed'];
  const statusStats = statuses.reduce((acc, status) => {
    if (status === 'all') {
      acc[status] = sessions?.length || 0;
    } else {
      acc[status] = sessions?.filter(session => session.status === status).length || 0;
    }
    return acc;
  }, {} as Record<string, number>);

  // 통계 계산
  const totalSessions = sessions?.length || 0;
  const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
  const averageRounds = sessions?.length 
    ? sessions.reduce((sum, s) => sum + s.current_round, 0) / sessions.length 
    : 0;
  const recentGrowth = 15; // 가상의 성장률

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <ListSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-danger mb-4">면접 데이터를 불러오는데 실패했습니다.</p>
          <Button onClick={() => window.location.reload()}>다시 시도</Button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: '총 면접 수',
      value: totalSessions,
      icon: MessageCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '완료한 면접',
      value: completedSessions,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '평균 라운드',
      value: averageRounds.toFixed(1),
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: '성장률',
      value: `+${recentGrowth}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">면접 내역</h1>
          <p className="text-text-secondary">
            진행한 면접 연습 기록을 확인하고 성장을 추적하세요
          </p>
        </div>
        <Link href="/jobs">
          <Button className="gap-2">
            <MessageCircle className="w-4 h-4" />
            새 면접 시작
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index}>
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
        ))}
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
                <Input
                  placeholder="세션 ID나 공고 ID로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedStatus === status
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? '전체' : getStatusText(status)} ({statusStats[status]})
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {searchTerm || selectedStatus !== 'all' ? '검색 결과가 없습니다' : '아직 면접 기록이 없습니다'}
            </h3>
            <p className="text-text-secondary mb-6">
              {searchTerm || selectedStatus !== 'all' 
                ? '다른 검색어나 상태로 시도해보세요'
                : '첫 번째 면접을 시작해보세요'
              }
            </p>
            {(!searchTerm && selectedStatus === 'all') && (
              <Link href="/jobs">
                <Button>첫 면접 시작하기</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            // 가상의 점수 계산
            const mockScore = Math.floor(Math.random() * 30) + 70; // 70-100점
            const isCompleted = session.status === 'completed';
            
            return (
              <Card key={session.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getStatusBadgeStyle(session.status)}>
                          {getStatusText(session.status)}
                        </Badge>
                        <Badge variant="outline">
                          Session #{session.id}
                        </Badge>
                        <Badge variant="outline">
                          공고 #{session.job_posting_id}
                        </Badge>
                        {isCompleted && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium">{mockScore}점</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-text-secondary" />
                          <span className="text-sm text-text-secondary">
                            {formatDate(session.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-text-secondary" />
                          <span className="text-sm text-text-secondary">
                            Round {session.current_round}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-text-secondary" />
                          <span className="text-sm text-text-secondary">
                            꼬리질문 {session.follow_up_count}개
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-text-secondary">
                        {formatRelativeTime(session.created_at)}에 진행
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {isCompleted ? (
                        <Link href={`/interviews/${session.id}/feedback`}>
                          <Button variant="outline" size="sm">
                            피드백 보기
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/interviews/${session.id}`}>
                          <Button size="sm">
                            계속하기
                          </Button>
                        </Link>
                      )}
                      
                      <Link href={`/interviews/${session.id}/feedback`}>
                        <Button variant="ghost" size="sm" className="text-text-secondary">
                          대화 기록
                        </Button>
                      </Link>
                      <DeleteButton sessionId={session.id} onDeleted={() => qc.invalidateQueries({ queryKey: ['interview-sessions'] })} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeleteButton({ sessionId, onDeleted }: { sessionId: number; onDeleted: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: () => interviewApi.deleteSession(sessionId),
    onSuccess: () => onDeleted(),
  });
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => {
        if (confirm('정말 이 면접 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
          deleteMutation.mutate();
        }
      }}
    >
      삭제
    </Button>
  );
}

