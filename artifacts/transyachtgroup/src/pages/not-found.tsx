import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { SeoHead } from "@/components/SeoHead";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFound() {
  const { lang, t } = useLanguage();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <SeoHead
        title="404"
        description={t("listing_not_found")}
        lang={lang}
        robots="noindex,follow"
      />
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              404 · {t("not_found")}
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">{t("listing_not_found")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
