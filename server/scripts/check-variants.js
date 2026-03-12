import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== Checking VariantGroup table ===');

    const groups = await prisma.variantGroup.findMany({
        include: {
            _count: { select: { items: true } }
        }
    });

    console.log(`\nFound ${groups.length} variant groups:\n`);

    groups.forEach((group, index) => {
        console.log(`${index + 1}. ID: ${group.id}`);
        console.log(`   Name: ${group.name}`);
        console.log(`   Type: ${group.type}`);
        console.log(`   Items: ${group._count.items}`);
        console.log('');
    });

    await prisma.$disconnect();
}

main().catch(console.error);
