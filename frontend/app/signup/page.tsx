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
import { Brain, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const signupMutation = useMutation({
    mutationFn: (data: { email: string; password: string; name?: string }) => 
      authApi.signup(data.email, data.password, data.name),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token);
      router.push('/dashboard');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || '회원가입에 실패했습니다.';
      setErrors({ general: errorMessage });
    },
  });

  const validatePassword = (pwd: string) => {
    const requirements = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
    };
    return requirements;
  };

  const passwordRequirements = validatePassword(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // 기본 유효성 검사
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = '이름을 입력해주세요.';
    }
    
    if (!email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }
    
    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (!Object.values(passwordRequirements).every(Boolean)) {
      newErrors.password = '비밀번호 요구사항을 모두 만족해주세요.';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    signupMutation.mutate({ email, password, name: name.trim() });
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
          <p className="text-text-secondary">새 계정을 만들어 시작하세요</p>
        </div>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>회원가입</CardTitle>
            <CardDescription>
              계정을 만들어 AI 면접 도우미를 시작하세요
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
                type="text"
                label="이름"
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                required
              />

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

              {/* Password Requirements */}
              {password && (
                <div className="p-3 bg-gray-50 rounded-component">
                  <p className="text-xs font-medium text-text-primary mb-2">비밀번호 요구사항:</p>
                  <div className="space-y-1">
                    {Object.entries({
                      length: '8자 이상',
                      uppercase: '대문자 포함',
                      lowercase: '소문자 포함',
                      number: '숫자 포함',
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <CheckCircle
                          className={`w-3 h-3 ${
                            passwordRequirements[key as keyof typeof passwordRequirements]
                              ? 'text-accent'
                              : 'text-gray-300'
                          }`}
                        />
                        <span
                          className={`text-xs ${
                            passwordRequirements[key as keyof typeof passwordRequirements]
                              ? 'text-accent'
                              : 'text-text-secondary'
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="비밀번호 확인"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-[38px] text-text-secondary hover:text-text-primary"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                loading={signupMutation.isPending}
                disabled={!Object.values(passwordRequirements).every(Boolean)}
              >
                회원가입
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-text-secondary">
                이미 계정이 있으신가요?{' '}
                <Link 
                  href="/login" 
                  className="text-primary hover:underline font-medium"
                >
                  로그인
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

