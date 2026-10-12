import { PrismaClient, StaffRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // 1. Create Padang Restaurant Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'padang-sederhana' },
    update: {},
    create: {
      name: 'Rumah Makan Padang Minang Asli',
      slug: 'padang-sederhana',
      tagline: '#YoSabanaLamak',
      aboutText: 'Kuliner Minang otentik dengan resep turun-temurun sejak 1982.',
      policyText: 'Reservasi dibuka maksimal 30 hari ke depan. Pembatalan minimal 2 jam sebelum waktu kunjungan.',
      aiPersona: 'Ramah, sopan, menguasai menu Minang, selalu memastikan cabang dan konfirmasi pesanan.',
      settings: {
        theme: 'emerald',
      },
    },
  });

  console.log(`Tenant created/verified: ${tenant.name} (${tenant.id})`);

  // 2. Create 2 Outlets (Kemang & Tebet)
  const outletKemang = await prisma.outlet.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: 'kemang',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Cabang Kemang',
      slug: 'kemang',
      address: 'Jl. Kemang Raya No. 45, Jakarta Selatan',
      city: 'Jakarta Selatan',
      phone: '021-7198888',
      whatsapp: '081288889999',
      defaultDurationMinutes: 90,
      minNoticeMinutes: 60,
      maxAdvanceDays: 30,
      changeCutoffMinutes: 120,
      maxPartySize: 12,
      autoConfirm: false,
    },
  });

  const outletTebet = await prisma.outlet.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: 'tebet',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Cabang Tebet',
      slug: 'tebet',
      address: 'Jl. Tebet Barat Dalam Raya No. 12, Jakarta Selatan',
      city: 'Jakarta Selatan',
      phone: '021-8291122',
      whatsapp: '081299991122',
      defaultDurationMinutes: 90,
      minNoticeMinutes: 60,
      maxAdvanceDays: 30,
      changeCutoffMinutes: 120,
      maxPartySize: 12,
      autoConfirm: false,
    },
  });

  console.log(`Outlets created: ${outletKemang.name}, ${outletTebet.name}`);

  // 3. Opening Hours for both outlets (10:00 - 22:00 every day)
  for (const outlet of [outletKemang, outletTebet]) {
    for (let day = 0; day <= 6; day++) {
      await prisma.openingHour.upsert({
        where: {
          outletId_weekday: {
            outletId: outlet.id,
            weekday: day,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          outletId: outlet.id,
          weekday: day,
          openTime: '10:00',
          closeTime: '22:00',
          isClosed: false,
        },
      });
    }
  }

  // 4. Dining Areas & Tables
  const areas = ['Indoor (AC)', 'Lesehan VIP', 'Outdoor'];
  for (const outlet of [outletKemang, outletTebet]) {
    for (const areaName of areas) {
      const area = await prisma.diningArea.upsert({
        where: {
          outletId_name: {
            outletId: outlet.id,
            name: areaName,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          outletId: outlet.id,
          name: areaName,
        },
      });

      // 4 tables per area
      for (let t = 1; t <= 4; t++) {
        const tableNumber = `${areaName.substring(0, 1)}${t}`;
        await prisma.restaurantTable.upsert({
          where: {
            outletId_tableNumber: {
              outletId: outlet.id,
              tableNumber,
            },
          },
          update: {},
          create: {
            tenantId: tenant.id,
            outletId: outlet.id,
            areaId: area.id,
            tableNumber,
            capacity: t % 2 === 0 ? 4 : 2,
            status: 'active',
          },
        });
      }
    }
  }

  // 5. Menu Categories & Items
  const categoriesData = [
    { name: 'Lauk Utama', sortOrder: 1 },
    { name: 'Sayur & Pelengkap', sortOrder: 2 },
    { name: 'Minuman', sortOrder: 3 },
  ];

  for (const cat of categoriesData) {
    const category = await prisma.menuCategory.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: cat.name,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
      },
    });

    if (cat.name === 'Lauk Utama') {
      const items = [
        { name: 'Rendang Daging Sapi Batiah', price: 28000, tags: ['pedas', 'halal', 'favorit'] },
        { name: 'Ayam Pop Spesial', price: 24000, tags: ['gurih', 'halal'] },
        { name: 'Gulai Tunjang Kikil', price: 30000, tags: ['pedas', 'halal'] },
        { name: 'Dendeng Batokok Cabe Ijo', price: 28000, tags: ['pedas', 'halal'] },
      ];
      for (const item of items) {
        await prisma.menuItem.create({
          data: {
            tenantId: tenant.id,
            categoryId: category.id,
            name: item.name,
            priceIdr: item.price,
            tags: item.tags,
            isAvailable: true,
            isActive: true,
          },
        });
      }
    }
  }

  // 6. Admin & Staff User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin123!', salt);

  const adminUser = await prisma.staffUser.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@minangasli.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Bung Vanny (Admin)',
      email: 'admin@minangasli.com',
      passwordHash,
      role: StaffRole.owner,
      isActive: true,
    },
  });

  console.log(`Staff owner created: ${adminUser.email} / Admin123!`);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
