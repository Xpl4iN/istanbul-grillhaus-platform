import Menu from "@/components/Menu";
import TestModeToggle from "@/components/TestModeToggle";
import OrderTracker from "@/components/OrderTracker";
import prisma from "@/lib/db";
import { unstable_cache } from "next/cache";

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

        // Flatten products for the Menu component, re-attaching the category
        const products = categories.flatMap(c =>
            c.products.map(p => ({ ...p, category: c }))
        );

        const settings = await prisma.shopSettings.findUnique({
            where: { id: ISTANBUL_SETTINGS_ID }
        });

        let isOpen = false;
        let openingHours = null;

        if (settings?.opening_hours_json) {
            openingHours = JSON.parse(settings.opening_hours_json);
            const now = new Date();
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = days[now.getDay()];

            const formatterTime = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
            const currentTimeStr = formatterTime.format(now);

            const todaySchedule = openingHours[dayName];

            if (settings.is_open_right_now && todaySchedule && todaySchedule.open && todaySchedule.close) {
                if (currentTimeStr >= todaySchedule.open && currentTimeStr <= todaySchedule.close) {
                    isOpen = true;
                }
            }
        }

        return {
            products: products.sort((a, b) => (a.category?.sort_order || 0) - (b.category?.sort_order || 0)),
            isOpen,
            openingHours
        };
    },
    ['menu-data-ssr'],
    { revalidate: 60, tags: ['menu'] }
);

export default async function Home() {
  const { products, isOpen, openingHours } = await getMenuData();
  
  return (
    <main className="min-h-screen bg-gray-50/50">
      <TestModeToggle />
      <OrderTracker />
      <Menu 
        initialProducts={products as any} 
        initialIsOpen={isOpen} 
        openingHours={openingHours}
      />
    </main>
  );
}
