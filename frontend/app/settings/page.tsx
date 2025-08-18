'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/store';

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleSave = () => {
    // TODO: Implement settings update API
    alert('설정이 저장되었습니다.');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-text-primary mb-6">계정 설정</h1>

      <div className="bg-white rounded-card shadow-card p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">
              이름
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-component focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
              이메일
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-component focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white rounded-component hover:bg-blue-600 transition-colors"
            >
              설정 저장
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-card shadow-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">알림 설정</h2>
        <div className="space-y-3">
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" defaultChecked />
            <span className="text-text-primary">면접 일정 알림</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" defaultChecked />
            <span className="text-text-primary">새로운 채용공고 알림</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-3" />
            <span className="text-text-primary">마케팅 이메일 수신</span>
          </label>
        </div>
      </div>
    </div>
  );
}





