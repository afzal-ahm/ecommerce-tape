/**
 * Seed script for Packing Tape / BOPP Tape Attributes
 * Creates all necessary attributes and values for packing tape products
 * 
 * Run: npm run seed-tape-attributes
 * Or: node -r dotenv/config scripts/seedTapeAttributes.js
 */

import 'dotenv/config';
import { prisma } from '../config/db.js';

const tapeAttributes = [
    {
        name: 'Pack Size',
        inputType: 'select',
        values: ['1', '3', '6', '12', '24', '36', '48']
    },
    {
        name: 'Width',
        inputType: 'select',
        values: ['24mm (1 Inch)', '36mm (1.5 Inch)', '48mm (2 Inch)', '72mm (3 Inch)']
    },
    {
        name: 'Length',
        inputType: 'select',
        values: ['40m', '50m', '65m', '100m', '200m', '500m']
    },
    {
        name: 'Color',
        inputType: 'select',
        values: [
            { value: 'Transparent', hexCode: null },
            { value: 'White', hexCode: '#FFFFFF' },
            { value: 'Brown', hexCode: '#8B4513' },
            { value: 'Black', hexCode: '#000000' },
            { value: 'Red', hexCode: '#FF0000' },
            { value: 'Yellow', hexCode: '#FFFF00' },
            { value: 'Blue', hexCode: '#0000FF' },
            { value: 'Green', hexCode: '#008000' }
        ]
    },
    {
        name: 'Print Type',
        inputType: 'select',
        values: ['Plain', 'Amazon', 'Flipkart', 'Meesho', 'Myntra', 'Custom Print', 'Fragile', 'Handle with Care']
    },
    {
        name: 'Tape Type',
        inputType: 'select',
        values: ['BOPP Tape', 'Cello Tape', 'Masking Tape', 'Double Sided Tape', 'Duct Tape', 'Strapping Tape']
    },
    {
        name: 'Adhesive Type',
        inputType: 'select',
        values: ['Acrylic', 'Hotmelt', 'Natural Rubber', 'Synthetic Rubber']
    }
];

async function seedTapeAttributes() {
    console.log('🚀 Starting Packing Tape Attributes Seed...\n');

    try {
        for (const attr of tapeAttributes) {
            console.log(`📦 Processing attribute: ${attr.name}`);

            // Check if attribute already exists
            let attribute = await prisma.attribute.findFirst({
                where: { name: attr.name }
            });

            if (attribute) {
                console.log(`  ⚠️  Attribute "${attr.name}" already exists, skipping creation`);
            } else {
                // Create attribute
                attribute = await prisma.attribute.create({
                    data: {
                        name: attr.name,
                        inputType: attr.inputType
                    }
                });
                console.log(`  ✅ Created attribute: ${attr.name}`);
            }

            // Create values
            for (const val of attr.values) {
                const isObjectValue = typeof val === 'object';
                const valueName = isObjectValue ? val.value : val;
                const hexCode = isObjectValue ? val.hexCode : null;

                // Check if value already exists
                const existingValue = await prisma.attributeValue.findFirst({
                    where: {
                        attributeId: attribute.id,
                        value: valueName
                    }
                });

                if (existingValue) {
                    console.log(`     ⚠️  Value "${valueName}" already exists`);
                } else {
                    await prisma.attributeValue.create({
                        data: {
                            attributeId: attribute.id,
                            value: valueName,
                            hexCode: hexCode
                        }
                    });
                    console.log(`     ✅ Created value: ${valueName}`);
                }
            }

            console.log('');
        }

        console.log('🎉 Packing Tape Attributes Seed completed successfully!\n');
        console.log('Summary:');
        console.log(`  - ${tapeAttributes.length} attributes processed`);
        console.log(`  - ${tapeAttributes.reduce((acc, attr) => acc + attr.values.length, 0)} values processed`);
        console.log('\nYou can now create products with these attributes in the admin panel.');

    } catch (error) {
        console.error('❌ Error seeding attributes:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seed
seedTapeAttributes()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
