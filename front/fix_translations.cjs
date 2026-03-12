const fs = require('fs');
const path = require('path');

const languages = ['hi', 'es', 'fr', 'de', 'zh', 'ja', 'ar', 'en'];
const translationDir = 'd:/Ritesh/all-ecom/front/src/translations';

languages.forEach(lang => {
    const filePath = path.join(translationDir, `${lang}.json`);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const json = JSON.parse(content);

        let modifications = 0;

        // Helper to ensure path exists
        if (!json.products) json.products = {};
        if (!json.products.form) json.products.form = {};

        // 1. Move product_form content to products.form
        if (json.product_form) {
            console.log(`Migrating product_form for ${lang}...`);

            // Merge moq
            if (json.product_form.moq) {
                json.products.form.moq = { ...json.product_form.moq, ...json.products.form.moq };
                // Ensure keys match what ProductsPage expects
                if (json.product_form.moq.enable) json.products.form.moq.enable_moq_label = json.product_form.moq.enable;
                if (json.product_form.moq.desc) json.products.form.moq.enable_moq_hint = json.product_form.moq.desc;
                if (json.product_form.moq.min_quantity) json.products.form.moq.minimum_quantity_label = json.product_form.moq.min_quantity;
                // Add defaults if missing
                if (!json.products.form.moq.minimum_quantity_placeholder) json.products.form.moq.minimum_quantity_placeholder = "e.g., 5";
                if (!json.products.form.moq.minimum_quantity_hint) json.products.form.moq.minimum_quantity_hint = "Minimum units required";
                if (!json.products.form.moq.moq_priority_title) json.products.form.moq.moq_priority_title = "MOQ Priority";
                if (!json.products.form.moq.moq_priority_hint) json.products.form.moq.moq_priority_hint = "Variant > Product > Global";
            }

            // Merge shipping
            if (json.product_form.shipping) {
                json.products.form.shipping = { ...json.product_form.shipping, ...json.products.form.shipping };
                // Map keys if needed
                if (!json.products.form.shipping.length_label) json.products.form.shipping.length_label = "Length (cm)";
                if (!json.products.form.shipping.breadth_label) json.products.form.shipping.breadth_label = "Breadth (cm)";
                if (!json.products.form.shipping.height_label) json.products.form.shipping.height_label = "Height (cm)";
                if (!json.products.form.shipping.weight_label) json.products.form.shipping.weight_label = "Weight (kg)";
            }

            // Merge pricing_slabs
            if (json.product_form.pricing_slabs) {
                json.products.form.pricing_slabs = { ...json.product_form.pricing_slabs, ...json.products.form.pricing_slabs };
            }

            // Delete product_form
            delete json.product_form;
            modifications++;
        }

        // 2. Fix products.form.variants
        if (json.products.form.variants) {
            // Ensure critical keys exist
            const v = json.products.form.variants;
            if (!v.variants_label) v.variants_label = v.label || "Variants";
            if (!v.variants_count) v.variants_count = "Variants";
            if (!v.generate_variants_button) v.generate_variants_button = "Generate Variants";
            if (!v.no_variants_yet) v.no_variants_yet = "No variants yet.";

            modifications++;
        }

        if (modifications > 0) {
            fs.writeFileSync(filePath, JSON.stringify(json, null, 4));
            console.log(`Updated ${lang}.json`);
        } else {
            console.log(`No changes needed for ${lang}.json`);
        }

    } catch (e) {
        console.error(`Error processing ${lang}.json:`, e);
    }
});
