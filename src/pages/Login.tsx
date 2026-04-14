import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { signInWithGoogle } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      navigate('/mypage');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      navigate('/mypage');
    } catch (error) {
      console.error('Login Error:', error);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#FDFCFB] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="rounded-none border-[#E5E1DA] shadow-sm">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-3xl font-bold tracking-tighter">
              LJ<span className="text-[#8B7E74]">INTERIOR</span>
            </CardTitle>
            <CardDescription className="text-base">
              로그인하여 예약 내역 및 시공 진행 상황을 확인하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Button 
              onClick={handleGoogleLogin}
              className="w-full bg-white text-[#1A1A1A] border border-[#E5E1DA] hover:bg-[#FDFCFB] py-7 text-lg font-medium flex items-center justify-center gap-3 rounded-none"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google로 시작하기
            </Button>
          </CardContent>
          <CardFooter className="justify-center pb-10">
            <p className="text-xs text-[#666666] text-center max-w-[250px]">
              로그인 시 LJInterior의 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
