const fs = require('fs');
const path = require('path');

const translations = {
    hi: {
        title: "शिपिंग शुल्क",
        description: "मानक शिपिंग दरें और मुफ्त शिपिंग सीमा निर्धारित करें",
        charge_label: "मानक शिपिंग शुल्क",
        threshold_label: "मुफ्त शिपिंग सीमा",
        threshold_hint: "इस राशि से ऊपर के ऑर्डर मुफ्त शिपिंग के लिए पात्र होंगे"
    },
    es: {
        title: "Gastos de envío",
        description: "Configure las tarifas de envío estándar y el umbral de envío gratuito",
        charge_label: "Cargo de envío estándar",
        threshold_label: "Umbral de envío gratuito",
        threshold_hint: "Los pedidos superiores a esta cantidad serán elegibles para envío gratuito"
    },
    fr: {
        title: "Frais de port",
        description: "Configurer les tarifs d'expédition standard et le seuil de livraison gratuite",
        charge_label: "Frais de port standard",
        threshold_label: "Seuil de livraison gratuite",
        threshold_hint: "Les commandes supérieures à ce montant seront éligibles à la livraison gratuite"
    },
    de: {
        title: "Versandkosten",
        description: "Konfigurieren Sie Standardversandtarife und Schwellenwerte für kostenlosen Versand",
        charge_label: "Standardversandkosten",
        threshold_label: "Schwellenwert für kostenlosen Versand",
        threshold_hint: "Bestellungen über diesem Betrag sind versandkostenfrei"
    },
    zh: {
        title: "运费",
        description: "配置标准运费和免邮门槛",
        charge_label: "标准运费",
        threshold_label: "免邮门槛",
        threshold_hint: "订单金额超过此数额将享受免邮"
    },
    ja: {
        title: "配送料",
        description: "標準配送料と送料無料のしきい値を設定します",
        charge_label: "標準配送料",
        threshold_label: "送料無料のしきい値",
        threshold_hint: "この金額を超える注文は送料無料になります"
    },
    ar: {
        title: "رسوم الشحن",
        description: "تكوين أسعار الشحن القياسية والحد الأدنى للشحن المجاني",
        charge_label: "رسوم الشحن القياسية",
        threshold_label: "حد الشحن المجاني",
        threshold_hint: "الطلبات التي تزيد عن هذا المبلغ ستكون مؤهلة للشحن المجاني"
    }
};

const translationDir = 'd:/Ritesh/all-ecom/front/src/translations';

Object.keys(translations).forEach(lang => {
    const filePath = path.join(translationDir, `${lang}.json`);
    if (!fs.existsSync(filePath)) return;

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const json = JSON.parse(content);

        if (json.shiprocket_settings) {
            json.shiprocket_settings.shipping_charges = translations[lang];
            fs.writeFileSync(filePath, JSON.stringify(json, null, 4));
            console.log(`Updated ${lang}.json`);
        } else {
            console.log(`shiprocket_settings not found in ${lang}.json`);
        }
    } catch (e) {
        console.error(`Error updating ${lang}.json:`, e);
    }
});
