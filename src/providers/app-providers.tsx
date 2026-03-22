import { HydrationProvider } from "@/contexts/hydration-context";
import { ScheduleProvider } from "@/contexts/schedule-context";
import { CourseProvider } from "@/contexts/course-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { UIProvider } from "@/contexts/ui-context";
import { DataServiceProvider } from "@/contexts/data-service";

export function AppProviders({ children }: { children: preact.ComponentChildren }) {
  return (
    <HydrationProvider>
      <UIProvider>
        <SettingsProvider>
          <CourseProvider>
            <ScheduleProvider>
              <DataServiceProvider>
                {children}
              </DataServiceProvider>
            </ScheduleProvider>
          </CourseProvider>
        </SettingsProvider>
      </UIProvider>
    </HydrationProvider>
  );
}
