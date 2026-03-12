import VariantManager from "../components/variant/VariantManager";
import { Card } from "../components/ui/card";

export default function VariantManagerPage() {
    return (
        <div className="p-6">
            <Card>
                <VariantManager />
            </Card>
        </div>
    );
}
