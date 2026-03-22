import Menu from "@/components/Menu";
import TestModeToggle from "@/components/TestModeToggle";
import OrderTracker from "@/components/OrderTracker";
import prisma from "@/lib/db";
import { unstable_cache } from "next/cache";

// DATABASE_URL is only available at request time, not during the static
// prerender that Next.js performs at build time. Force dynamic rendering so
// this page is always server-rendered on request; the unstable_cache wrapper
// below still caches the Prisma queries for performance.
export const dynamic = 'force-dynamic';

const getMenuData = unstable_cache(
    async () => {
        const ISTANBUL_ORG_ID = 'cmmb6n8xu0001o7fwaw73p1lr';
        const ISTANBUL_SETTINGS_ID = 'cmmb6r26m000ro77865hy6nvu';

        const categories = await prisma.category.findMany({
            where: { organizationId: ISTANBUL_ORG_ID, is_active: true },
            include: {
                products: {
                    where: { is_available: true },
                    include: {
                        modifier_groups: {
                            include: {
                                modifiers: true
                            }
                        }
                    }
                }
            },
            orderBy: { sort_order: 'asc' }
        });

        const globalGroups = await prisma.modifierGroup.findMany({
            where: { is_global: true, organizationId: ISTANBUL_ORG_ID } as any,
            include: { modifiers: true }
        });

        const products = categories.flatMap(c =>
            c.products.map(p => ({ 
                ...p, 
                category: c,
                global_modifier_groups: globalGroups 
            }))
        );

        const settings = await prisma.shopSettings.findUnique({
            where: { id: ISTANBUL_SETTINGS_ID }
        });

        const org = await prisma.organization.findUnique({
            where: { id: ISTANBUL_ORG_ID },
            select: { features: true }
        });
        const features = (typeof org?.features === 'object' && org?.features !== null) ? org.features : {};

        let isOpen = false;
        let openingHours = null;

        if (settings?.opening_hours_json) {
            openingHours = JSON.parse(settings.opening_hours_json);
            const now = new Date();
            
            // Get current time in Berlin
            const formatterTime = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
            const currentTimeStr = formatterTime.format(now);
            
            // Get day name in English (to match common DB formats)
            const formatterDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', weekday: 'long' });
            const dayName = formatterDay.format(now).toLowerCase();

            const todaySchedule = openingHours[dayName] || openingHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)];

            if (settings.is_open_right_now && todaySchedule?.open && todaySchedule?.close) {
                if (currentTimeStr >= todaySchedule.open && currentTimeStr <= todaySchedule.close) {
                    isOpen = true;
                }
            }
        }

        return {
            products: (products as any).sort((a: any, b: any) => (a.category?.sort_order || 0) - (b.category?.sort_order || 0)),
            isOpen,
            openingHours,
            features
        };
    },
    ['menu-data-ssr'],
    { revalidate: 60, tags: ['menu'] }
);

export default async function Home() {
  const { products, isOpen, openingHours, features } = await getMenuData();
  
  return (
    <main className="min-h-screen">
      <TestModeToggle />
      <OrderTracker features={features} />
      <Menu 
        initialProducts={products as any} 
        initialIsOpen={isOpen} 
        openingHours={openingHours}
        features={features}
      />
    </main>
  );
}
