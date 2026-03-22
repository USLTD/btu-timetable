import type { ScheduleItem, DayNumber } from "./types";
import { parseTime } from "./time";
import { toPng, toJpeg, toSvg } from "html-to-image";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import { getPreferredLocale } from "@/lib/i18n";
import { localizedDayName } from "./constants";
import * as m from "@/paraglide/messages";

interface GridSlot {
  day: number;
  startMin: number;
  timeStr: string;
  room: string;
  course: string;
  groupName: string;
  lecturer: string;
}

/**
 * Generate a compact grid HTML table (Time × Days) for image export.
 */
function generatePlainGridHTML(schedule: ScheduleItem[], optionNum: number): string {
  const slots: GridSlot[] = [];
  const dayToStartMap: Record<number, Record<number, GridSlot>> = {};
  const locale = getPreferredLocale();

  for (const item of schedule) {
    for (const t of item.group.times) {
      const parsed = parseTime(t.time);
      if (!parsed) continue;
      const slot: GridSlot = {
        day: t.day,
        startMin: parsed.start,
        timeStr: t.time,
        room: t.room || '',
        course: item.course.subjectCode ? `${item.course.subjectCode} ${item.course.courseName}` : item.course.courseName,
        groupName: item.group.name,
        lecturer: item.group.lecturer,
      };
      slots.push(slot);
      if (!dayToStartMap[t.day]) dayToStartMap[t.day] = {};
      dayToStartMap[t.day][parsed.start] = slot;
    }
  }

  const usedDays = [...new Set(slots.map((s) => s.day))].sort((a, b) => a - b);
  const uniqueTimes = [...new Set(slots.map((s) => s.startMin))].sort(
    (a, b) => a - b,
  );

  const headerCells = usedDays.map((d) =>
    h(
      "th",
      {
        style:
          "text-align:center;padding:8px 10px;border:1px solid #d1d5db;color:#374151;font-weight:700;",
      },
      localizedDayName(d as DayNumber, locale, "long"),
    ),
  );

  const bodyRows = uniqueTimes.map((startMin, i) => {
    const sampleSlot = slots.find((s) => s.startMin === startMin);
    const timeStr = sampleSlot ? sampleSlot.timeStr : "";
    const bgColor = i % 2 === 0 ? "#ffffff" : "#f9fafb";

    const dayCells = usedDays.map((day) => {
      const slot = dayToStartMap[day]?.[startMin];
      if (!slot) {
        return h("td", {
          style: "padding:6px 8px;border:1px solid #e5e7eb;",
        });
      }
      return h(
        "td",
        {
          style:
            "vertical-align:top;padding:6px 8px;border:1px solid #e5e7eb;",
        },
        h(
          "div",
          {
            style:
              "font-weight:600;color:#1e40af;font-size:13px;margin-bottom:2px;",
          },
          slot.course,
        ),
        h(
          "div",
          { style: "color:#6b7280;font-size:11px;" },
          `${slot.groupName} \u2022 ${slot.room}`,
        ),
        h(
          "div",
          { style: "color:#9ca3af;font-size:11px;" },
          slot.lecturer,
        ),
      );
    });

    return h(
      "tr",
      { style: `background:${bgColor};` },
      h(
        "td",
        {
          style:
            "white-space:nowrap;font-weight:600;padding:8px 10px;border:1px solid #e5e7eb;color:#374151;",
        },
        timeStr,
      ),
      ...dayCells,
    );
  });

  const tree = h(
    "div",
    {
      style:
        "padding:20px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;width:800px;",
    },
    h(
      "h2",
      {
        style:
          "text-align:center;margin:0 0 16px;color:#1f2937;font-size:20px;",
      },
      m.schedule_option_title({ 0: optionNum }),
    ),
    h(
      "table",
      {
        style:
          "border-collapse:collapse;width:100%;font-size:13px;border:1px solid #d1d5db;",
      },
      h(
        "thead",
        null,
        h(
          "tr",
          { style: "background:#f3f4f6;" },
          h(
            "th",
            {
              style:
                "text-align:left;padding:8px 10px;border:1px solid #d1d5db;color:#374151;font-weight:700;",
            },
            m.schedule_table_time(),
          ),
          ...headerCells,
        ),
      ),
      h("tbody", null, ...bodyRows),
    ),
    h(
      "p",
      {
        style:
          "text-align:center;margin-top:12px;font-size:11px;color:#9ca3af;",
      },
      m.exported_from_site(),
    ),
  );

  return renderToString(tree);
}

export type ImageFormat = 'png' | 'jpeg' | 'svg';

/**
 * Render the grid HTML into a temporary visible DOM element and capture it.
 * The element must be visible for html-to-image to work correctly.
 */
export async function exportAsImage(
  schedule: ScheduleItem[],
  optionNum: number,
  format: ImageFormat = 'png',
): Promise<void> {
  const html = generatePlainGridHTML(schedule, optionNum);

  // Create a container that is on-screen but visually hidden from view
  // html-to-image requires the element to be in the visible DOM with layout
  const container = document.createElement('div');
  container.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'z-index: 99999',
    'pointer-events: none',
    'opacity: 0',  // invisible but still laid out
    'width: 840px', // explicit width for consistent rendering
  ].join(';');

  // Use DOMParser to safely parse HTML string instead of innerHTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const parsedContent = doc.body.firstChild;
  if (parsedContent) {
    container.appendChild(parsedContent);
  }

  document.body.appendChild(container);

  // Force layout computation
  void container.offsetHeight;

  // Brief delay to ensure fonts and styles are resolved
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    // Make visible briefly for capture (html-to-image reads computed styles)
    container.style.opacity = '1';
    // Force another layout
    void container.offsetHeight;

    let dataUrl: string;
    const captureNode = container.firstElementChild as HTMLElement;
    const options = { quality: 0.95, pixelRatio: 2, cacheBust: true, skipAutoScale: true };

    switch (format) {
      case 'jpeg':
        dataUrl = await toJpeg(captureNode, { ...options, backgroundColor: '#ffffff' });
        break;
      case 'svg':
        dataUrl = await toSvg(captureNode, options);
        break;
      default:
        dataUrl = await toPng(captureNode, options);
        break;
    }

    const ext = format === 'svg' ? 'svg' : format;
    const link = document.createElement('a');
    link.download = `schedule-option-${optionNum}.${ext}`;
    link.href = dataUrl;
    link.click();
  } finally {
    document.body.removeChild(container);
  }
}
