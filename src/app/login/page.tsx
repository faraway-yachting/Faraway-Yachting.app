import { LoginForm } from '@/components/auth';
import { Anchor } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5A7A8F]">
            <Anchor className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Faraway Yachting
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Accounting Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <h3 className="mb-6 text-center text-xl font-semibold text-gray-900">
            Sign in to your account
          </h3>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
