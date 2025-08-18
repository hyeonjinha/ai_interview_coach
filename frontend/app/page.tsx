'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { 
  MessageCircle, 
  Brain, 
  Target, 
  TrendingUp,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI 맞춤형 질문',
    description: '지원 공고와 본인의 경험을 바탕으로 AI가 실제 면접과 유사한 질문을 생성합니다.',
  },
  {
    icon: Target,
    title: '실시간 피드백',
    description: '답변에 대한 즉각적인 평가와 개선점을 제공하여 면접 실력을 향상시킵니다.',
  },
  {
    icon: TrendingUp,
    title: '성장 추적',
    description: '면접 연습 기록과 성과를 추적하여 지속적인 개선을 도와드립니다.',
  },
  {
    icon: MessageCircle,
    title: '자연스러운 대화',
    description: '실제 면접관과 대화하는 것처럼 자연스러운 면접 시뮬레이션을 제공합니다.',
  },
];

const benefits = [
  '개인별 맞춤형 면접 준비',
  '실제 면접 환경과 유사한 경험',
  '체계적인 피드백과 개선 방향 제시',
  '언제 어디서나 면접 연습 가능',
  '다양한 직무와 회사에 대응',
];

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // 이미 로그인한 사용자는 대시보드로 리다이렉트
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null; // 리다이렉트 중이므로 아무것도 렌더링하지 않음
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">AI 면접 도우미</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">로그인</Button>
              </Link>
              <Link href="/signup">
                <Button>회원가입</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-text-primary mb-6">
            AI와 함께하는<br />
            <span className="text-primary">스마트한 면접 준비</span>
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-3xl mx-auto">
            개인 맞춤형 AI 면접관이 실제 면접과 같은 환경에서 
            질문하고 피드백을 제공하여 완벽한 면접을 준비할 수 있도록 도와드립니다.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                무료로 시작하기
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg">
                데모 보기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            왜 AI 면접 도우미를 선택해야 할까요?
          </h2>
          <p className="text-lg text-text-secondary">
            실제 면접에서 성공하기 위한 모든 기능을 제공합니다
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="card-hover">
              <CardHeader className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-text-primary mb-6">
                체계적인 면접 준비로<br />
                성공률을 높이세요
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    <span className="text-text-primary">{benefit}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Link href="/signup">
                  <Button size="lg" className="gap-2">
                    지금 시작하기
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-card p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-4">
                  실제 면접과 동일한 경험
                </h3>
                <p className="text-text-secondary">
                  AI 면접관과의 실시간 대화를 통해 
                  실제 면접 상황을 완벽하게 시뮬레이션합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            지금 바로 면접 준비를 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            무료 회원가입으로 모든 기능을 체험해보세요
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="gap-2">
              무료로 시작하기
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">AI 면접 도우미</span>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 AI 면접 도우미. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

