import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createFaq } from "@/api/faqService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";


export default function FAQCreatePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const initialData = location.state?.formData || {
    question: "",
    answer: "",
    category: "",
    order: 0,
    isPublished: true,
  };

  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData({
      ...formData,
      isPublished: checked,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.question.trim() || !formData.answer.trim()) {
        toast.error(t("faq_management.messages.required"));
        setIsSubmitting(false);
        return;
      }

      await createFaq(formData);
      toast.success(t("faq_management.messages.created"));
      navigate("/faq-management");
    } catch (error) {
      console.error("Failed to create FAQ:", error);
      toast.error(t("faq_management.messages.save_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/faq-management")}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("faq_management.form.back")}
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("faq_management.create_title")}</h1>
          <p className="text-muted-foreground">
            {t("faq_management.create_subtitle")}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>{t("faq_management.create_title")}</CardTitle>
            <CardDescription>
              {t("faq_management.dialog_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">
                {t("faq_management.form.question")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="question"
                name="question"
                value={formData.question}
                onChange={handleFormChange}
                placeholder={t("faq_management.form.question_placeholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">
                {t("faq_management.form.answer")} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="answer"
                name="answer"
                value={formData.answer}
                onChange={handleFormChange}
                placeholder={t("faq_management.form.answer_placeholder")}
                rows={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("faq_management.form.answer_help")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t("faq_management.form.category")}</Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                placeholder={t("faq_management.form.category_placeholder")}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="isPublished">
                {t("faq_management.form.publish_immediate")} ({formData.isPublished ? t("faq_management.form.yes") : t("faq_management.form.no")})
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/faq-management")}
            >
              {t("faq_management.form.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("faq_management.form.creating") : t("faq_management.form.create")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
