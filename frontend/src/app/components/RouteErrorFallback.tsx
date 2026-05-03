import { isRouteErrorResponse, useRouteError } from 'react-router';
import { AlertCircle } from 'lucide-react';
import { Button } from './atoms/Button';

export function RouteErrorFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : '알 수 없는 오류가 발생했습니다.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--muted)] px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-red-100 rounded-full">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>
        <h2 className="mb-2">문제가 발생했습니다</h2>
        <p className="text-[var(--muted-foreground)] mb-6">
          화면을 불러오는 중 오류가 발생했습니다.
        </p>
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-6 font-mono text-left overflow-auto">
          {message}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.location.reload()} className="flex-1">
            새로고침
          </Button>
          <Button onClick={() => window.location.assign('/')} className="flex-1">
            홈으로 이동
          </Button>
        </div>
      </div>
    </div>
  );
}
