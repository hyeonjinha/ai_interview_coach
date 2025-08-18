'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Loading, ListSkeleton } from '@/components/ui/loading';
import { experienceApi } from '@/lib/api';
import { formatDate, getCategoryText, truncateText } from '@/lib/utils';
import type { Experience } from '@/types/api';

const categoryColors = {
  project: 'bg-blue-100 text-blue-800',
  career: 'bg-green-100 text-green-800',
  education: 'bg-purple-100 text-purple-800',
  certification: 'bg-yellow-100 text-yellow-800',
  language: 'bg-pink-100 text-pink-800',
};

export default function ExperiencesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; experience: Experience | null }>({
    isOpen: false,
    experience: null,
  });

  const queryClient = useQueryClient();

  const { data: experiences, isLoading, error } = useQuery({
    queryKey: ['experiences'],
    queryFn: experienceApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: experienceApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      setDeleteModal({ isOpen: false, experience: null });
    },
  });

  // 필터링된 경험들
  const filteredExperiences = experiences?.filter((exp) => {
    const matchesSearch = !searchTerm || 
      exp.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(exp.content).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || exp.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }) || [];

  const categories = ['all', 'project', 'career', 'education', 'certification', 'language'];
  const categoryStats = categories.reduce((acc, category) => {
    if (category === 'all') {
      acc[category] = experiences?.length || 0;
    } else {
      acc[category] = experiences?.filter(exp => exp.category === category).length || 0;
    }
    return acc;
  }, {} as Record<string, number>);

  const handleDelete = (experience: Experience) => {
    setDeleteModal({ isOpen: true, experience });
  };

  const confirmDelete = () => {
    if (deleteModal.experience) {
      deleteMutation.mutate(deleteModal.experience.id);
    }
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
          <p className="text-danger mb-4">경험 데이터를 불러오는데 실패했습니다.</p>
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
          <h1 className="text-3xl font-bold text-text-primary mb-2">내 경험</h1>
          <p className="text-text-secondary">
            면접에서 활용할 수 있는 경험들을 관리하세요
          </p>
        </div>
        <Link href="/experiences/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            새 경험 추가
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
                  placeholder="경험을 검색하세요..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? '전체' : getCategoryText(category)} ({categoryStats[category]})
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Experiences List */}
      {filteredExperiences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {searchTerm || selectedCategory !== 'all' ? '검색 결과가 없습니다' : '아직 경험이 없습니다'}
            </h3>
            <p className="text-text-secondary mb-6">
              {searchTerm || selectedCategory !== 'all' 
                ? '다른 검색어나 카테고리로 시도해보세요'
                : '첫 번째 경험을 추가해보세요'
              }
            </p>
            {(!searchTerm && selectedCategory === 'all') && (
              <Link href="/experiences/new">
                <Button>첫 경험 추가하기</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExperiences.map((experience) => (
            <Card key={experience.id} className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="secondary" 
                        className={categoryColors[experience.category as keyof typeof categoryColors]}
                      >
                        {getCategoryText(experience.category)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">
                      {experience.title || '제목 없음'}
                    </CardTitle>
                    {(experience.start_date || experience.end_date) && (
                      <CardDescription className="flex items-center gap-1 mt-2">
                        <Calendar className="w-4 h-4" />
                        {experience.start_date && formatDate(experience.start_date)}
                        {experience.start_date && experience.end_date && ' - '}
                        {experience.end_date && formatDate(experience.end_date)}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/experiences/${experience.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(experience)}
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(experience.content).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-sm font-medium text-text-primary capitalize">{key}:</p>
                      <p className="text-sm text-text-secondary">
                        {truncateText(String(value), 100)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal 
        open={deleteModal.isOpen} 
        onOpenChange={(open) => setDeleteModal({ isOpen: open, experience: null })}
      >
        <ModalContent>
          <ModalHeader>
            <ModalTitle>경험 삭제</ModalTitle>
            <ModalDescription>
              정말로 이 경험을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, experience: null })}
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

