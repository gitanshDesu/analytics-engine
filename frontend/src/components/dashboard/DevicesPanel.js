import { Tabs } from "@/components/ui/Tabs";
import { RankedBarList } from "@/components/dashboard/RankedBarList";

/** Tabbed Browser / OS / Device-type breakdowns — one DevicesResponse, three views. */
export function DevicesPanel({ devices }) {
  return (
    <Tabs
      items={[
        {
          value: "browsers",
          label: "Browser",
          content: <RankedBarList items={devices.browsers} />,
        },
        {
          value: "os",
          label: "OS",
          content: <RankedBarList items={devices.operatingSystems} />,
        },
        {
          value: "device",
          label: "Device",
          content: <RankedBarList items={devices.deviceTypes} />,
        },
      ]}
    />
  );
}
