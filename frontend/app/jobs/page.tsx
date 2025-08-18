'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  ExternalLink,
  Search,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Loading, ListSkeleton } from '@/components/ui/loading';
import { jobApi } from '@/lib/api';
import { formatDate, getStatusText, getStatusBadgeStyle, calculateDDay, truncateText } from '@/lib/utils';
import type { JobPosting } from '@/types/api';

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; job: JobPosting | null }>({
    isOpen: false,
    job: null,
  });

  const queryClient = useQueryClient();

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: jobApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: jobApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setDeleteModal({ isOpen: false, job: null });
    },
  });

  // 필터링된 지원 공고들
  const filteredJobs = jobs?.filter((job) => {
    const matchesSearch = !searchTerm || 
      job.sections?.main?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.url?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || job.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const statuses = ['all', 'draft', 'applied', 'interviewing', 'offer', 'rejected'];
  const statusStats = statuses.reduce((acc, status) => {
    if (status === 'all') {
      acc[status] = jobs?.length || 0;
    } else {
      acc[status] = jobs?.filter(job => job.status === status).length || 0;
    }
    return acc;
  }, {} as Record<string, number>);

  const handleDelete = (job: JobPosting) => {
    setDeleteModal({ isOpen: true, job });
  };

  const confirmDelete = () => {
    if (deleteModal.job) {
      deleteMutation.mutate(deleteModal.job.id);
    }
  };

  // 회사명과 직무 추출 함수
  const extractJobInfo = (job: JobPosting) => {
    const sections = job.sections || {};
    const mainText = sections.main || job.raw_text || '';
    
    // 간단한 휴리스틱으로 회사명과 직무 추출
    const lines = mainText.split('\n').filter((line: string) => line.trim());
    const companyName = lines[0] || '회사명 미상';
    const position = lines[1] || '직무 미상';
    
    return { companyName: truncateText(companyName, 30), position: truncateText(position, 40) };
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <ListSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-danger mb-4">지원 공고 데이터를 불러오는데 실패했습니다.</p>
          <Button onClick={() => window.location.reload()}>다시 시도</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">내 지원 공고</h1>
          <p className="text-text-secondary">
            지원한 공고들을 관리하고 면접을 준비하세요
          </p>
        </div>
        <Link href="/jobs/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            새 공고 등록
          </Button>
        </Link>
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
                  placeholder="공고를 검색하세요..."
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

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {searchTerm || selectedStatus !== 'all' ? '검색 결과가 없습니다' : '아직 등록된 공고가 없습니다'}
            </h3>
            <p className="text-text-secondary mb-6">
              {searchTerm || selectedStatus !== 'all' 
                ? '다른 검색어나 상태로 시도해보세요'
                : '첫 번째 지원 공고를 등록해보세요'
              }
            </p>
            {(!searchTerm && selectedStatus === 'all') && (
              <Link href="/jobs/new">
                <Button>첫 공고 등록하기</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const { companyName, position } = extractJobInfo(job);
            const hasApplicationQA = job.application_qa && job.application_qa.length > 0;
            
            return (
              <Card key={job.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusBadgeStyle(job.status)}>
                          {getStatusText(job.status)}
                        </Badge>
                        {job.source_type === 'url' && (
                          <Badge variant="outline">URL</Badge>
                        )}
                        {hasApplicationQA && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            지원서 {job.application_qa.length}개
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mb-3">
                        <h3 className="text-xl font-semibold text-text-primary mb-1">
                          {companyName}
                        </h3>
                        <p className="text-lg text-text-secondary">{position}</p>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-text-secondary mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          등록일: {formatDate(job.created_at)}
                        </div>
                        {job.url && (
                          <a 
                            href={job.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="w-4 h-4" />
                            원본 보기
                          </a>
                        )}
                      </div>

                      {job.raw_text && (
                        <p className="text-sm text-text-secondary">
                          {truncateText(job.raw_text, 200)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <div className="flex gap-2">
                        <Link href={`/jobs/${job.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(job)}
                        >
                          <Trash2 className="w-4 h-4 text-danger" />
                        </Button>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Link href={`/jobs/${job.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            상세 보기
                          </Button>
                        </Link>
                        {hasApplicationQA && (
                          <Link href={`/jobs/${job.id}/interview`}>
                            <Button size="sm" className="w-full gap-1">
                              <MessageCircle className="w-4 h-4" />
                              면접 시작
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal 
        open={deleteModal.isOpen} 
        onOpenChange={(open) => setDeleteModal({ isOpen: open, job: null })}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>공고 삭제</ModalTitle>
            <ModalDescription>
              정말로 이 지원 공고를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, job: null })}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              loading={deleteMutation.isPending}
            >
              삭제
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
