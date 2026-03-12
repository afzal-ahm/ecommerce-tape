import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApprovedPartnersTab from "../components/ApprovedPartnersTab";
import NonApprovedPartnersTab from "../components/NonApprovedPartnersTab";
import { useLanguage } from "@/context/LanguageContext";

export default function PartnerPage() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState("approved");

    return (
        <div className="space-y-8">
            {/* Premium Page Header */}
            <div className="space-y-4">
                <div>
                    <h1 className="text-3xl font-semibold text-[#1F2937] tracking-tight">
                        {t('partner_management.title')}
                    </h1>
                    <p className="text-[#9CA3AF] text-sm mt-1.5">
                        {t('partner_management.description')}
                    </p>
                </div>
                <div className="h-px bg-[#E5E7EB]" />
            </div>

            <Card className="bg-[#FFFFFF] border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.04)] rounded-xl">
                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-[#F3F7F6] p-1 rounded-lg">
                            <TabsTrigger
                                value="approved"
                                className={
                                    activeTab === "approved"
                                        ? "bg-[#E8F5E9] text-[#2E7D32] data-[state=active]:bg-[#E8F5E9] data-[state=active]:text-[#2E7D32]"
                                        : "data-[state=active]:bg-[#E8F5E9] data-[state=active]:text-[#2E7D32]"
                                }
                            >
                                {t('partner_management.tabs.approved')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="non-approved"
                                className={
                                    activeTab === "non-approved"
                                        ? "bg-[#E8F5E9] text-[#2E7D32] data-[state=active]:bg-[#E8F5E9] data-[state=active]:text-[#2E7D32]"
                                        : "data-[state=active]:bg-[#E8F5E9] data-[state=active]:text-[#2E7D32]"
                                }
                            >
                                {t('partner_management.tabs.non_approved')}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="approved" className="mt-6">
                            <ApprovedPartnersTab />
                        </TabsContent>

                        <TabsContent value="non-approved" className="mt-6">
                            <NonApprovedPartnersTab />
                        </TabsContent>
                    </Tabs>
                </div>
            </Card>
        </div>
    );
}
