'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api';
import { Brain, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (data: { email: string; password: string }) => 
      authApi.login(data.email, data.password),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token);
      router.push('/dashboard');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || '로그인에 실패했습니다.';
      setErrors({ general: errorMessage });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // 기본 유효성 검사
    const newErrors: Record<string, string> = {};
    
    if (!email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }
    
    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-primary">AI 면접 도우미</span>
          </div>
          <p className="text-text-secondary">계정에 로그인하세요</p>
        </div>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>로그인</CardTitle>
            <CardDescription>
              이메일과 비밀번호를 입력하여 로그인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="p-3 text-sm text-danger bg-red-50 border border-red-200 rounded-component">
                  {errors.general}
                </div>
              )}

              <Input
                type="email"
                label="이메일"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                required
              />

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="비밀번호"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-text-secondary hover:text-text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                loading={loginMutation.isPending}
              >
                로그인
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-text-secondary">
                계정이 없으신가요?{' '}
                <Link 
                  href="/signup" 
                  className="text-primary hover:underline font-medium"
                >
                  회원가입
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo Account Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-component">
          <h3 className="text-sm font-medium text-blue-900 mb-2">데모 계정</h3>
          <p className="text-xs text-blue-700 mb-2">
            데모 계정으로 바로 체험해보세요:
          </p>
          <div className="text-xs text-blue-700 space-y-1">
            <p>이메일: demo@example.com</p>
            <p>비밀번호: demo123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

