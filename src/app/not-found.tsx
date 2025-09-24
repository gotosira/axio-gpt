"use client";

import Link from "next/link";
import { useI18n } from "@/components/providers/I18nProvider";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-white flex items-center justify-center px-6">
      <div className="text-center max-w-xl">
        <img
          src="/404error_AIs.png"
          alt="404 Not Found"
          className="mx-auto mb-6 w-72 h-auto md:w-96 object-contain"
        />
        <h1 className="text-3xl font-bold mb-2">404 – {t ? t('pageNotFound') : 'Page not found'}</h1>
        <p className="text-[#cbd5e1] mb-6">
          {t ? t('pageNotFoundLead') : 'The page you’re looking for doesn’t exist or has been moved.'}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 px-4 rounded-md bg-[#0b5cd6] hover:bg-[#0a56c8] text-white font-semibold"
        >
          {t ? t('goHome') : 'Go back home'}
        </Link>
      </div>
    </div>
  );
}


